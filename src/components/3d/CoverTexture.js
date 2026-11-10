import { CanvasTexture, SRGBColorSpace, TextureLoader } from 'three'
import { coverColor, coverUrl, backUrl, pageUrl, spreadPages } from '../../lib/bookArt.js'

/*
 * Tekstur buku memakai aset asli dari folder contoh (cover per bulan/level,
 * halaman 4x4, 9x9, dan journaling). Cache per kunci; gambar dimuat sekali
 * lalu dipakai ulang. Selama gambar belum tiba, tekstur placeholder warna
 * kover/halaman langsung tampil supaya buku tidak pernah hitam.
 */
const cache = new Map()
const MAX_CACHE = 12
const loader = new TextureLoader()

function placeholder(color) {
  // Ukuran harus sama dengan aset asli (625x885). Kalau placeholder 8x8,
  // tekstur sudah teralokasi 8x8 saat gambar tiba, dan update GPU gagal.
  const c = document.createElement('canvas')
  c.width = 625
  c.height = 885
  const g = c.getContext('2d')
  g.fillStyle = color
  g.fillRect(0, 0, c.width, c.height)
  return c
}

function remember(key, tex) {
  cache.set(key, tex)
  if (cache.size > MAX_CACHE) {
    const oldest = cache.keys().next().value
    const old = cache.get(oldest)
    cache.delete(oldest)
    old?.dispose?.()
  }
  return tex
}

function imageTexture(key, url, color = '#f6f3ea') {
  if (cache.has(key)) return cache.get(key)
  const tex = new CanvasTexture(placeholder(color))
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 8
  if (url) {
    loader.load(
      url,
      (loaded) => {
        tex.image = loaded.image
        tex.needsUpdate = true
      },
      undefined,
      () => {},
    )
  }
  return remember(key, tex)
}

export function coverTextureFor(variant, level, month) {
  const url = coverUrl(variant, level, month)
  const color = coverColor(variant, month)
  return imageTexture(`cover:${url}`, url, color)
}

export function backTextureFor(variant, month) {
  const url = backUrl(variant, month)
  return imageTexture(`back:${url}`, url, coverColor(variant, month))
}

/*
 * Halaman kiri (muka dalam kover) dan kanan (muka atas tumpukan halaman).
 * UV BoxGeometry sudah benar untuk tiap muka saat dilihat dari luar, jadi
 * kedua halaman memakai tekstur apa adanya — jangan dicermin, nanti terbalik.
 */
export function spreadTextureFor(variant, level, month) {
  const { left, right } = spreadPages(variant, level, month)
  return {
    left: imageTexture(`page:${left}`, pageUrl(left), '#f6f3ea'),
    right: imageTexture(`page:${right}`, pageUrl(right), '#f6f3ea'),
    leftKey: left,
    rightKey: right,
  }
}
