import { test, expect } from '@playwright/test'

/*
 * Happy path checkout, dengan hosted checkout doit.id di-mock:
 * - window.doit di-stub sebelum app dimuat.
 * - create_order RPC di-mock agar tidak menulis ke DB asli (baca produk tetap nyata).
 * - Edge Function create-doit-payment di-mock mengembalikan hosted URL dummy.
 * Hasil yang diuji: keranjang -> checkout -> bayar -> halaman sukses.
 */
test('checkout sampai halaman sukses', async ({ page }) => {
  await page.addInitScript(() => {
    window.doit = {
      open: (_url, callbacks) => callbacks.onPaid({ status: 'paid' }),
    }
  })

  await page.route('**/rest/v1/rpc/create_order', (route) => {
    expect(route.request().postDataJSON().p_payment_gateway).toBe('doit')
    return route.fulfill({
      json: {
        id: 'mock-order-id',
        order_number: 'PRL-MOCK-0001',
        status: 'pending_payment',
        subtotal: 49000,
        shipping_cost: 15000,
        total_amount: 64000,
      },
    })
  })
  await page.route('**/functions/v1/create-doit-payment', (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      order_id: 'mock-order-id',
      customer_email: 'e2e@prolog.co',
    })
    return route.fulfill({ json: { status: 'pending', hosted_url: 'https://pay.doit.id/p/mock-payment' } })
  })

  await page.goto('/')

  // Tambah varian sudoku default (FeaturedProduct) ke keranjang.
  await page.getByRole('button', { name: 'Tambah ke keranjang' }).first().click()
  await page.getByRole('button', { name: 'Lanjut ke pembayaran' }).click()
  await expect(page).toHaveURL(/\/checkout/)

  await page.getByLabel('Nama lengkap').fill('Penguji E2E')
  await page.getByLabel('Email').fill('e2e@prolog.co')
  await page.getByLabel('Alamat lengkap').fill('Jl. Uji 1')
  await page.getByLabel('Kota').fill('Bandung')
  await page.getByLabel('Provinsi').fill('Jawa Barat')
  await page.getByLabel('Kode pos').fill('40123')

  await page.getByRole('button', { name: 'Bayar sekarang' }).click()

  await expect(page).toHaveURL(/\/order-success/)
  await expect(page.getByText('Terima kasih')).toBeVisible()
})

test('checkout menampilkan error stok dari server', async ({ page }) => {
  await page.addInitScript(() => {
    window.doit = { open: () => {} }
  })
  await page.route('**/rest/v1/rpc/create_order', (route) =>
    route.fulfill({ status: 400, json: { message: 'Stok SDK-PUR-MTH tinggal 0.' } }),
  )

  await page.goto('/')
  await page.getByRole('button', { name: 'Tambah ke keranjang' }).first().click()
  await page.getByRole('button', { name: 'Lanjut ke pembayaran' }).click()
  await expect(page).toHaveURL(/\/checkout/)

  await page.getByLabel('Nama lengkap').fill('Penguji E2E')
  await page.getByLabel('Email').fill('e2e@prolog.co')
  await page.getByLabel('Alamat lengkap').fill('Jl. Uji 1')
  await page.getByLabel('Kota').fill('Bandung')
  await page.getByLabel('Provinsi').fill('Jawa Barat')
  await page.getByLabel('Kode pos').fill('40123')

  await page.getByRole('button', { name: 'Bayar sekarang' }).click()

  await expect(page.getByText('Stok SDK-PUR-MTH tinggal 0.')).toBeVisible()
})

test('checkout mengaitkan error validasi dengan input', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Tambah ke keranjang' }).first().click()
  await page.getByRole('button', { name: 'Lanjut ke pembayaran' }).click()
  await expect(page).toHaveURL(/\/checkout/)

  await page.locator('form').first().evaluate((form) => form.requestSubmit())

  const email = page.getByLabel('Email')
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  const errorId = await email.getAttribute('aria-describedby')
  expect(errorId).toBeTruthy()
  await expect(page.locator(`#${errorId}`)).toHaveText('Email tidak valid')
})

test('checkout mengirim kode voucher ke server', async ({ page }) => {
  await page.addInitScript(() => { window.doit = { open: (_url, callbacks) => callbacks.onPaid({ status: 'paid' }) } })
  await page.route('**/rest/v1/promotions*', (route) => route.fulfill({ json: [{ code: 'JEDA10', discount_amount: 10000, minimum_subtotal: 0 }] }))
  await page.route('**/rest/v1/rpc/create_order', async (route) => {
    const body = route.request().postDataJSON()
    expect(body.p_promo_code).toBe('JEDA10')
    return route.fulfill({ json: { id: 'promo-order', order_number: 'PRL-PROMO-0001', status: 'pending_payment', subtotal: 69000, discount_amount: 10000, shipping_cost: 15000, total_amount: 74000 } })
  })
  await page.route('**/functions/v1/create-doit-payment', (route) => route.fulfill({ json: { status: 'pending', hosted_url: 'https://pay.doit.id/p/promo' } }))
  await page.goto('/')
  await page.getByRole('button', { name: 'Tambah ke keranjang' }).first().click()
  await page.getByRole('button', { name: 'Lanjut ke pembayaran' }).click()
  await page.waitForResponse('**/rest/v1/promotions*')
  await page.getByLabel('Kode voucher').fill('jeda10')
  await page.getByRole('button', { name: 'Pakai' }).click()
  await expect(page.getByText('Voucher aktif')).toBeVisible()
  await page.getByLabel('Nama lengkap').fill('Penguji Promo')
  await page.getByLabel('Email').fill('promo@prolog.co')
  await page.getByLabel('Alamat lengkap').fill('Jl. Uji 1')
  await page.getByLabel('Kota').fill('Bandung')
  await page.getByLabel('Provinsi').fill('Jawa Barat')
  await page.getByLabel('Kode pos').fill('40123')
  await page.getByRole('button', { name: 'Bayar sekarang' }).click()
  await expect(page).toHaveURL(/\/order-success/)
})
