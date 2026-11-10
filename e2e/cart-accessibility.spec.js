import { test, expect } from '@playwright/test'

test('cart drawer traps focus and restores its opener', async ({ page }) => {
  await page.goto('/')

  const opener = page.getByRole('button', { name: /Keranjang 0/ })
  const dialog = page.locator('[role="dialog"][aria-label="Keranjang belanja"]')
  await opener.click()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')

  const close = page.locator('.drawer-panel').getByRole('button', { name: 'Tutup keranjang' })
  await expect(close).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(close).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveAttribute('aria-hidden', 'true')
  await expect(opener).toBeFocused()
})
