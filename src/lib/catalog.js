/*
 * Aturan tampilan katalog yang dipakai storefront dan admin.
 * Dipisah dari komponen supaya bisa diuji tanpa DOM.
 */
export const PRODUCT_CATEGORIES = ['sudoku', 'booksleeve', 'keychain']

export function isSudoku(category) {
  return category === 'sudoku'
}

/* Label manusiawi dari slug kategori: tote-bag -> Tote Bag. */
export function categoryLabel(category) {
  if (!category) return 'Produk baru'
  return category
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/* Batas kartu teaser yang tampil sebelum tombol "lihat lainnya". */
export const TEASER_LIMIT = 4

export function teaserWindow(products = [], expanded = false, limit = TEASER_LIMIT) {
  return expanded ? products : products.slice(0, limit)
}

/* Kategori yang punya model 3D teaser. Selain ini tampil netral, bukan model palsu. */
export function stageKey(category) {
  return category === 'keychain' || category === 'booksleeve' ? category : 'unknown'
}

/* Deskripsi boleh kosong (kolom nullable). Buang penanda "Segera hadir" di ujung. */
export function safeBlurb(description) {
  if (typeof description !== 'string') return ''
  return description.replace(/\s*Segera hadir\.?$/i, '').trim()
}

/* Slug dari nama produk: huruf kecil, angka, tanda hubung. */
export function slugify(name) {
  return (name ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/*
 * Pisahkan katalog:
 * - sudoku: hanya yang punya varian aktif (kalau belum ada varian, picker kosong).
 * - ready: produk non-sudoku yang sudah punya varian aktif, jadi bisa dibeli.
 * - soon: produk teaser, tidak butuh varian.
 */
export function splitCatalog(products = [], variants = []) {
  const withVariant = new Set(variants.map((v) => v.product_id))
  const sudoku = []
  const ready = []
  const soon = []
  for (const product of products) {
    if (product.category === 'sudoku') {
      if (withVariant.has(product.id)) sudoku.push(product)
    } else if (withVariant.has(product.id)) {
      ready.push(product)
    } else {
      soon.push(product)
    }
  }
  return { sudoku, ready, soon }
}
