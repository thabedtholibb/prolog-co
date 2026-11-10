import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, paybridge-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, value: Record<string, unknown>) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function parseSignature(header: string | null) {
  if (!header) return null
  const values = Object.fromEntries(
    header.split(',').map((part) => {
      const [key, ...value] = part.trim().split('=')
      return [key, value.join('=')]
    }),
  )
  return /^\d+$/.test(values.t ?? '') && /^[0-9a-f]{64}$/i.test(values.v1 ?? '')
    ? { timestamp: values.t, signature: values.v1.toLowerCase() }
    : null
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false
  let difference = 0
  for (let i = 0; i < left.length; i += 1) difference |= left.charCodeAt(i) ^ right.charCodeAt(i)
  return difference === 0
}

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const signingSecret = Deno.env.get('DOIT_WEBHOOK_SECRET')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  if (!signingSecret || !serviceRoleKey || !supabaseUrl) {
    console.error('Doit webhook secrets are not configured')
    return json(503, { error: 'Webhook not configured' })
  }

  const rawBody = await req.text()
  const signature = parseSignature(req.headers.get('PayBridge-Signature'))
  if (!signature) return json(401, { error: 'Invalid signature' })

  const expected = await hmacHex(signingSecret, `${signature.timestamp}.${rawBody}`)
  if (!constantTimeEqual(expected, signature.signature)) return json(401, { error: 'Invalid signature' })

  try {
    const event = JSON.parse(rawBody)
    if (event.type !== 'payment.paid' && event.type !== 'payment.expired') {
      return json(200, { ok: true, result: 'ignored' })
    }

    const payment = event.data
    if (
      typeof event.id !== 'string' ||
      typeof payment?.id !== 'string' ||
      typeof payment?.reference !== 'string' ||
      !Number.isSafeInteger(payment?.amount)
    ) {
      return json(400, { error: 'Invalid payment event' })
    }

    const sb = createClient(supabaseUrl, serviceRoleKey)
    const { data, error } = await sb.rpc('process_doit_payment_event', {
      p_event_id: event.id,
      p_event_type: event.type,
      p_payment_id: payment.id,
      p_reference: payment.reference,
      p_amount: payment.amount,
    })
    if (error) {
      console.error('Doit event processing failed', error.message)
      return json(500, { error: 'Payment event could not be processed' })
    }
    return json(200, { ok: true, result: data?.result ?? 'processed' })
  } catch (error) {
    console.error('Doit webhook payload failed', error instanceof Error ? error.message : 'unknown error')
    return json(400, { error: 'Invalid webhook payload' })
  }
})
