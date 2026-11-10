import { test, expect } from '@playwright/test'

test('storefront emits structured product offers from active catalog data', async ({ page }) => {
  await page.goto('/')
  const script = page.locator('script[type="application/ld+json"]')
  await expect(script).toHaveCount(1)

  const schema = JSON.parse(await script.textContent())
  expect(schema[0]).toMatchObject({
    '@type': 'Product',
    name: 'Prolog Sudoku',
    brand: { name: 'Prolog.co' },
  })
  expect(schema[0].offers.length).toBeGreaterThan(0)
  expect(schema[0].offers[0]).toHaveProperty('priceCurrency', 'IDR')
  expect(JSON.stringify(schema)).not.toContain('SDK-')
})
