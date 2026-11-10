import { test, expect } from '@playwright/test'

/*
 * Halaman /lacak: lookup lewat RPC get_order (di-mock), dua arah.
 */

test('lacak pesanan menampilkan status dan resi', async ({ page }) => {
  await page.route('**/rest/v1/rpc/get_order', (route) =>
    route.fulfill({
      json: {
        order_number: 'PRL-MOCK-0001',
        status: 'shipped',
        total_amount: 64000,
        shipping_cost: 15000,
        created_at: new Date().toISOString(),
        tracking_number: 'JNE-123',
        items: [
          {
            sku: 'SDK-PUR-MTH',
            name: 'Prolog Sudoku Classic',
            options: { month: 'Desember', difficulty: 'medium', size: '50' },
            quantity: 1,
            price_at_purchase: 49000,
          },
        ],
      },
    }),
  )

  await page.goto('/lacak')
  await page.getByLabel('Email').fill('e2e@prolog.co')
  await page.getByLabel('Nomor pesanan').fill('PRL-MOCK-0001')
  await page.getByRole('button', { name: 'Cek pesanan' }).click()

  await expect(page.getByText('Dikirim')).toBeVisible()
  await expect(page.getByText('JNE-123')).toBeVisible()
  await expect(page.getByText('50 sudoku')).toBeVisible()
})

test('lacak pesanan menampilkan error saat tidak cocok', async ({ page }) => {
  await page.route('**/rest/v1/rpc/get_order', (route) =>
    route.fulfill({
      status: 400,
      json: { message: 'Pesanan tidak ditemukan. Periksa nomor pesanan dan email.' },
    }),
  )

  await page.goto('/lacak')
  await page.getByLabel('Email').fill('salah@email.com')
  await page.getByLabel('Nomor pesanan').fill('PRL-SALAH')
  await page.getByRole('button', { name: 'Cek pesanan' }).click()

  await expect(page.getByText('Pesanan tidak ditemukan')).toBeVisible()
})
