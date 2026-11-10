import { test, expect } from '@playwright/test'

test('FAQ page opens answers and links back to store', async ({ page }) => {
  await page.goto('/faq')
  await expect(page.getByRole('heading', { name: 'Sebelum kamu memilih' })).toBeVisible()
  const answer = page.getByText('Monthly berisi 31 Sudoku', { exact: false })
  await expect(answer).not.toBeVisible()
  await page.getByText('Apa perbedaan Monthly dan Reguler?').click()
  await expect(answer).toBeVisible()
  await expect(page.getByRole('link', { name: 'Kembali ke toko' })).toHaveAttribute('href', '/')
})
