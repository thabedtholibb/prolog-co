/*
 * Logika keranjang murni (tanpa React/zustand) supaya bisa diuji dengan node --test.
 * Item: { id, variantId, sku, name, price, qty, stock?, month?, difficulty?, options? }
 * Bulan monthly, level sudoku, dan opsi bebas (mis. charms keychain) jadi bagian
 * identitas baris sehingga kombinasi berbeda = baris terpisah.
 */
export const LEVEL_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

function finiteStock(stock) {
  return Number.isFinite(stock) ? stock : null
}

export function optionsKey(options) {
  if (!options || typeof options !== 'object') return ''
  return Object.keys(options)
    .sort()
    .filter((key) => options[key] !== undefined && options[key] !== null && options[key] !== '')
    .map((key) => `${key}=${options[key]}`)
    .join('&')
}

export function itemId(variant) {
  return [variant.id, variant.month, variant.difficulty, variant.size, optionsKey(variant.options)].filter(Boolean).join(':')
}

export function addItem(items, variant, qty = 1) {
  const id = itemId(variant)
  const existing = items.find((i) => i.id === id)
  const stock = finiteStock(variant.stock)
  if (stock !== null && stock <= 0) return items

  const wanted = Math.max(1, Math.floor(qty))
  if (existing) {
    const nextQty = stock === null ? existing.qty + wanted : Math.min(existing.qty + wanted, stock)
    if (nextQty === existing.qty) return items
    return items.map((i) =>
      i.id === id
        ? { ...i, qty: nextQty, price: variant.price, name: variant.name, sku: variant.sku, stock: variant.stock }
        : i,
    )
  }

  const item = {
    id,
    variantId: variant.id, // UUID asli untuk order_items.variant_id
    sku: variant.sku,
    name: variant.name,
    price: variant.price,
    qty: stock === null ? wanted : Math.min(wanted, stock),
  }
  if (variant.stock !== undefined) item.stock = variant.stock
  if (variant.month) item.month = variant.month
  if (variant.difficulty) item.difficulty = variant.difficulty
  if (variant.size) item.size = variant.size
  if (variant.options && Object.keys(variant.options).length) item.options = variant.options
  return [...items, item]
}

export function setQty(items, id, qty) {
  if (qty <= 0) return items.filter((i) => i.id !== id)
  return items.flatMap((i) => {
    if (i.id !== id) return [i]
    const stock = finiteStock(i.stock)
    const nextQty = stock === null ? qty : Math.min(qty, stock)
    return nextQty > 0 ? [{ ...i, qty: nextQty }] : []
  })
}

export function computeSubtotal(items) {
  // ponytail: Math.round karena harga tetap bilangan bulat IDR; desimal muncul saat ekspansi Stripe.
  return items.reduce((sum, i) => sum + Math.round(i.price * i.qty), 0)
}

/* Opsi yang dikirim ke order_items: opsi bebas, atau bulan/level sudoku. */
export function checkoutOptions(item) {
  if (item.options && Object.keys(item.options).length) return item.options
  return {
    ...(item.month && { month: item.month }),
    ...(item.difficulty && { difficulty: item.difficulty }),
    ...(item.size && { size: item.size }),
  }
}

export function formatOptions(options) {
  if (!options || typeof options !== 'object') return ''
  return Object.entries(options)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      if (key === 'difficulty') return LEVEL_LABEL[value] ?? value
      if (key === 'size') return `${value} sudoku`
      return value
    })
    .join(' · ')
}

export function describeItem(item) {
  return formatOptions(checkoutOptions(item))
}

/* Segarkan harga/stok dari katalog terbaru; item yang variannya hilang dibiarkan
 * agar pengguna bisa menghapusnya sendiri (checkout server akan menolak). */
export function syncItems(items, variants = []) {
  const byId = new Map(variants.map((v) => [v.id, v]))
  return items.map((item) => {
    const variant = byId.get(item.variantId)
    if (!variant) return item
    return {
      ...item,
      name: variant.name,
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock,
    }
  })
}
