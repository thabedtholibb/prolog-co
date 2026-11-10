import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return respond(405, { error: 'Method not allowed' })

  try {
    const { order_id, customer_email } = await req.json()
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order_id ?? '')) {
      return respond(400, { error: 'Order tidak valid.' })
    }
    if (typeof customer_email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer_email)) {
      return respond(400, { error: 'Email tidak valid.' })
    }

    const apiKey = Deno.env.get('DOIT_API_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    if (!apiKey || !serviceRoleKey || !supabaseUrl) {
      console.error('Doit payment secrets are not configured')
      return respond(503, { error: 'Pembayaran belum siap. Coba lagi nanti.' })
    }

    const sb = createClient(supabaseUrl, serviceRoleKey)
    const { error: expiryError } = await sb.rpc('cancel_expired_orders')
    if (expiryError) throw new Error('Pembersihan order kedaluwarsa gagal')

    const { data: order, error: orderError } = await sb
      .from('orders')
      .select('id, order_number, customer_email, shipping_address, total_amount, shipping_cost, status, payment_gateway, payment_transaction_id, expires_at')
      .eq('id', order_id)
      .maybeSingle()

    if (orderError) throw new Error('Gagal membaca order')
    if (!order || order.customer_email.toLowerCase() !== customer_email.trim().toLowerCase()) {
      return respond(404, { error: 'Order tidak ditemukan.' })
    }
    if (order.payment_gateway !== 'doit') return respond(409, { error: 'Gateway order tidak cocok.' })
    if (order.status !== 'pending_payment') {
      return respond(409, {
        error: order.status === 'cancelled' ? 'Tagihan kedaluwarsa. Coba checkout ulang.' : 'Order tidak menunggu pembayaran.',
        code: order.status === 'cancelled' ? 'payment_expired' : 'order_not_pending',
      })
    }

    const amount = Number(order.total_amount)
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Nominal order tidak valid')

    let payment: Record<string, unknown>
    if (order.payment_transaction_id) {
      const existingResponse = await fetch(
        `https://pay.doit.id/v1/payments/${encodeURIComponent(order.payment_transaction_id)}`,
        { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } },
      )
      if (!existingResponse.ok) throw new Error('Gagal memeriksa tagihan Doit')
      payment = await existingResponse.json()
    } else {
      const itemsResult = await sb
        .from('order_items')
        .select('price_at_purchase, quantity')
        .eq('order_id', order.id)
      if (itemsResult.error || !itemsResult.data?.length) throw new Error('Order item tidak ditemukan')
      const expected = itemsResult.data.reduce(
        (sum, item) => sum + Number(item.price_at_purchase) * item.quantity,
        0,
      ) + Number(order.shipping_cost)
      if (expected !== amount) throw new Error('Total order tidak cocok dengan item dan ongkir')

      const customer: Record<string, string> = {
        name: order.shipping_address.full_name,
      }
      if (order.shipping_address.phone) customer.phone = order.shipping_address.phone

      const createResponse = await fetch('https://pay.doit.id/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Idempotency-Key': `prolog-${order.id}`,
        },
        body: JSON.stringify({
          amount,
          rail: 'any',
          reference: order.order_number,
          expires_in: 86400,
          customer,
          metadata: { order_id: order.id },
        }),
      })
      if (!createResponse.ok) {
        console.error('Doit payment creation failed', createResponse.status)
        return respond(502, { error: 'Doit gagal membuat tagihan. Coba lagi.' })
      }
      payment = await createResponse.json()
    }

    if (payment.reference !== order.order_number || Number(payment.amount) !== amount) {
      throw new Error('Tagihan Doit tidak cocok dengan order')
    }

    if (payment.status === 'expired' || payment.status === 'failed') {
      const { error: cancelError } = await sb
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id)
        .eq('status', 'pending_payment')
      if (cancelError) throw new Error('Gagal melepas reservasi stok')
      return respond(409, {
        error: payment.status === 'expired' ? 'Tagihan kedaluwarsa. Coba checkout ulang.' : 'Pembayaran gagal. Coba checkout ulang.',
        code: 'payment_expired',
      })
    }
    if (payment.status === 'paid') {
      const { error: reconcileError } = await sb.rpc('process_doit_payment_event', {
        p_event_id: `reconcile:${payment.id}:paid`,
        p_event_type: 'payment.paid',
        p_payment_id: String(payment.id),
        p_reference: order.order_number,
        p_amount: amount,
      })
      if (reconcileError) throw new Error('Gagal merekonsiliasi pembayaran')
      return respond(200, { status: 'paid', payment_id: payment.id })
    }
    if (payment.status !== 'pending') {
      return respond(409, { error: 'Tagihan tidak lagi menunggu pembayaran.', code: 'payment_not_pending' })
    }

    const hostedUrl = new URL(String(payment.hosted_url ?? ''))
    if (hostedUrl.protocol !== 'https:' || hostedUrl.hostname !== 'pay.doit.id') {
      throw new Error('Alamat hosted checkout tidak valid')
    }

    const { data: savedOrder, error: saveError } = await sb
      .from('orders')
      .update({ payment_transaction_id: String(payment.id) })
      .eq('id', order.id)
      .eq('status', 'pending_payment')
      .select('id')
      .maybeSingle()
    if (saveError) throw new Error('Gagal menyimpan ID tagihan')
    if (!savedOrder) return respond(409, { error: 'Order tidak lagi menunggu pembayaran.', code: 'payment_expired' })

    return respond(200, { status: 'pending', hosted_url: hostedUrl.toString() })
  } catch (error) {
    console.error('Doit payment request failed', error instanceof Error ? error.message : 'unknown error')
    return respond(500, { error: 'Gagal menyiapkan pembayaran. Coba lagi.' })
  }
})
