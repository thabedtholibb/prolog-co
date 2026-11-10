/* Doit hosted checkout: browser receives payment URL only, never API secrets. */
export const DOIT = {
  SHIPPING_FLAT: 15000,
  paymentReady() {
    return import.meta.env.VITE_DOIT_ENABLED !== 'false'
  },
}

const SCRIPT_URL = 'https://doit.id/embed.js'
let scriptPromise

function loadDoitScript() {
  if (window.doit?.open) return Promise.resolve(window.doit)
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.onload = () => {
      if (window.doit?.open) resolve(window.doit)
      else reject(new Error('Doit checkout tidak termuat'))
    }
    script.onerror = () => reject(new Error('Gagal memuat checkout Doit'))
    document.head.appendChild(script)
  }).catch((error) => {
    document.querySelector(`script[src="${SCRIPT_URL}"]`)?.remove()
    scriptPromise = null
    throw error
  })

  return scriptPromise
}

export async function createDoitPayment(orderId, email) {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-doit-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ order_id: orderId, customer_email: email }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(result.error ?? 'Gagal membuat halaman pembayaran')
    error.code = result.code
    throw error
  }
  if (result.status === 'paid') return { status: 'paid' }
  if (typeof result.hosted_url !== 'string') throw new Error('Halaman pembayaran Doit tidak tersedia')

  const url = new URL(result.hosted_url)
  if (url.protocol !== 'https:' || url.hostname !== 'pay.doit.id') {
    throw new Error('Alamat pembayaran Doit tidak valid')
  }
  return { status: 'pending', hosted_url: url.toString() }
}

export async function payWithDoit(hostedUrl) {
  const doit = await loadDoitScript()
  return new Promise((resolve) => {
    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      resolve(result)
    }

    doit.open(hostedUrl, {
      onPaid: () => finish({ ok: true, status: 'paid' }),
      onExpired: () => finish({ ok: false, status: 'expired' }),
      onClose: (event) => finish({ ok: event?.status === 'paid', status: event?.status ?? 'closed' }),
      closeDelay: 2500,
    })
  })
}
