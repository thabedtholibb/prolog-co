import { test, expect } from '@playwright/test'

for (const path of ['/checkout', '/admin']) {
  test(`${path} loads without fetching storefront catalog`, async ({ page }) => {
    const catalogRequests = []
    page.on('request', (request) => {
      if (/\/rest\/v1\/(products|product_variants)(\?|$)/.test(request.url())) {
        catalogRequests.push(request.url())
      }
    })

    await page.goto(path)
    if (path === '/checkout') {
      await expect(page.getByText('Tidak ada yang perlu dibayar')).toBeVisible()
    } else {
      await expect(page.getByText('Masuk admin')).toBeVisible()
    }
    expect(catalogRequests).toEqual([])
  })
}

for (const [path, heading] of [['/kontak', 'Hubungi kami'], ['/privasi', 'Kebijakan privasi'], ['/syarat', 'Syarat penggunaan']]) {
  test(`${path} loads as an informational page`, async ({ page }) => {
    const catalogRequests = []
    page.on('request', (request) => {
      if (/\/rest\/v1\/(products|product_variants)(\?|$)/.test(request.url())) catalogRequests.push(request.url())
    })
    await page.goto(path)
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    expect(catalogRequests).toEqual([])
  })
}

test('defers 3D viewer code until product section is near viewport', async ({ page }) => {
  const viewerRequests = []
  page.on('request', (request) => {
    if (/BookViewer|ComingSoonViewer|OrbitRig/.test(request.url())) viewerRequests.push(request.url())
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  expect(viewerRequests).toEqual([])
})

test('storefront has no horizontal page overflow at key widths', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll('body *')]
        .map((element) => ({
          tag: element.tagName,
          className: typeof element.className === 'string' ? element.className : '',
          left: Math.round(element.getBoundingClientRect().left),
          right: Math.round(element.getBoundingClientRect().right),
          width: Math.round(element.getBoundingClientRect().width),
        }))
        .filter((element) => element.right > window.innerWidth || element.left < 0)
        .slice(0, 8),
    }))
    expect(dimensions.content, `overflow at ${width}px: ${JSON.stringify(dimensions.offenders)}`).toBeLessThanOrEqual(dimensions.viewport)
  }
})
