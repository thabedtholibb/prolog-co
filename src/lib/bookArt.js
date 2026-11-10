/*
 * Seni buku: cover asli (12 bulan x 3 level + Reguler) dan halaman isi
 * (4x4, 9x9, journaling) diekstrak dari PDF di folder "contoh".
 * Vite memberi URL ber-hash; berkas gambar baru diunduh saat benar-benar dipakai.
 */
import coverColors from '../assets/cover-colors.json'

const coverFiles = import.meta.glob('../assets/covers/*.jpg', { eager: true, query: '?url', import: 'default' })
const pageFiles = import.meta.glob('../assets/pages/*.jpg', { eager: true, query: '?url', import: 'default' })

function byName(files) {
  const out = {}
  for (const [path, url] of Object.entries(files)) {
    const name = path.split('/').pop().replace(/\.jpg$/, '')
    out[name] = url
  }
  return out
}

const COVERS = byName(coverFiles)
const PAGES = byName(pageFiles)

const MONTH_SLUG = {
  Januari: 'jan',
  Februari: 'feb',
  Maret: 'mar',
  April: 'apr',
  Mei: 'may',
  Juni: 'jun',
  Juli: 'jul',
  Agustus: 'aug',
  September: 'sep',
  Oktober: 'oct',
  November: 'nov',
  Desember: 'dec',
}
const MONTH_ORDER = Object.keys(MONTH_SLUG)

export function monthSlug(month) {
  return MONTH_SLUG[month] ?? 'jan'
}

export function monthNumber(month) {
  const i = MONTH_ORDER.indexOf(month)
  return i >= 0 ? i + 1 : 1
}

export function levelKey(level) {
  if (level === 'easy') return 'easy'
  if (level === 'hard') return 'hard'
  return 'med'
}

export function coverKey(variant, level, month) {
  const lv = levelKey(level)
  return variant?.edition_axis === 'monthly' ? `${monthSlug(month)}-${lv}` : `reguler-${lv}`
}

export function backKey(variant, month) {
  return variant?.edition_axis === 'monthly' ? `back-${monthSlug(month)}` : 'back-reguler'
}

export function coverUrl(variant, level, month) {
  return COVERS[coverKey(variant, level, month)] ?? COVERS['jan-med']
}

export function backUrl(variant, month) {
  return COVERS[backKey(variant, month)] ?? COVERS['back-jan']
}

export function coverColor(variant, month) {
  const key = variant?.edition_axis === 'monthly' ? monthSlug(month) : 'mar'
  return coverColors[key] ?? '#4b1a13'
}

const PAGE_SETS = {
  easy: { warmup: 'easy-1', full: 'easy-1', second: 'easy-2' },
  medium: { warmup: 'med-1', full: 'med-2', second: 'med-2' },
  hard: { warmup: 'hard-1', full: 'hard-2', second: 'hard-2' },
}

/*
 * Spread: halaman kiri & kanan untuk buku yang dibuka.
 * - Murni: halaman pemanasan 4x4 di kiri, 9x9 penuh di kanan (easy: 4x4 keduanya).
 * - Journaling: puzzle sesuai level di kiri, pertanyaan journaling di kanan.
 *   Pertanyaan mengikuti bulan yang dipilih (Januari -> 01, ... Desember -> 12).
 */
export function spreadPages(variant, level, month) {
  const set = PAGE_SETS[level] ?? PAGE_SETS.medium
  if (variant?.content_axis === 'journaling') {
    const q = variant?.edition_axis === 'monthly' ? monthNumber(month) : 1
    return { left: set.full, right: `journal-${String(q).padStart(2, '0')}` }
  }
  return { left: set.warmup, right: set.second }
}

export function pageUrl(name) {
  return PAGES[name] ?? PAGES['easy-1']
}
