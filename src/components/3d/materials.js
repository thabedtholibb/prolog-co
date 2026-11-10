/*
 * Singleton material (pola digitaltwin): satu instance MeshStandardMaterial
 * dipakai bersama semua mesh — tak ada re-instantiasi di GPU. Pergantian
 * varian hanya menukar `map`/`color` pada instance yang sama.
 */
import { MeshStandardMaterial } from 'three'

/*
 * Proporsi presisi dari buku nyata: A5 15x21 cm (rasio 1:1,4),
 * tebal punggung ramping ~1cm utk buku puzzle (0,065 x lebar).
 */
export const BOOK_SIZE = { w: 1.6, h: 2.24, t: 0.055 }

export const bookMaterials = {
  // kover: map tekstur diganti per varian melalui CoverTexture
  cover: new MeshStandardMaterial({ roughness: 0.94, metalness: 0 }),
  // muka dalam kover (halaman kiri): contoh halaman sudoku / journaling
  inner: new MeshStandardMaterial({ roughness: 1, metalness: 0 }),
  // muka atas tumpukan halaman (halaman kanan)
  pageFace: new MeshStandardMaterial({ roughness: 1, metalness: 0 }),
  page: new MeshStandardMaterial({ color: '#f6f3ea', roughness: 1, metalness: 0 }),
  spine: new MeshStandardMaterial({ roughness: 0.9, metalness: 0 }),
  // muka luar kover belakang
  backCover: new MeshStandardMaterial({ roughness: 0.94, metalness: 0 }),
}

/*
 * Palet kover per sumbu varian — murni agar bisa dites.
 * Monthly = ungu dalam (edisi berjalan), Reguler = sage; konten menentukan label.
 */
export function coverPalette(content_axis, edition_axis) {
  const base = edition_axis === 'monthly' ? { ink: '#f4f1ff', bg: '#4b3f8f' } : { ink: '#eef4f0', bg: '#3f6b5c' }
  const label = content_axis === 'journaling' ? 'Journaling' : 'Murni'
  return { ...base, label, accent: content_axis === 'journaling' ? '#e8c46b' : undefined }
}

/*
 * Bahan teaser Coming Soon — kini realistis & penuh (bukan bahan redam):
 * kain linen utk booksleeve, steel utk ring keychain, kulit utk charm buku.
 */
/* Warna sarung diselaraskan dengan kover buku (biru) supaya menyatu. */
export const TEASER = {
  fabric: '#a9c0d8',
  steel: '#bcc0c4',
  leather: '#7d6c58',
  page: '#f1ede2',
  pen: '#565c64',
  highlighter: '#e3b25a',
  cover: '#5b87b3',
  cord: '#6f8f7a',
}

export const teaserMaterials = {
  fabric: new MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0 }),
  // tutup stabilo: plastik gelap licin
  cap: new MeshStandardMaterial({ color: '#4b4438', roughness: 0.42, metalness: 0 }),
  // baja ring/klip: metalness tinggi, kasar rendah, pantulan tajam
  steel: new MeshStandardMaterial({ color: TEASER.steel, metalness: 0.9, roughness: 0.24, envMapIntensity: 1.25 }),
  leather: new MeshStandardMaterial({ color: TEASER.leather, roughness: 0.62, metalness: 0 }),
  cord: new MeshStandardMaterial({ color: TEASER.cord, roughness: 0.95, metalness: 0 }),
  // pulpen: sedikit metal, agak licin
  pen: new MeshStandardMaterial({ color: TEASER.pen, roughness: 0.3, metalness: 0.3, envMapIntensity: 1.1 }),
  // plastik stabilo: licin
  highlighter: new MeshStandardMaterial({ color: TEASER.highlighter, roughness: 0.46, metalness: 0 }),
  highlighterTip: new MeshStandardMaterial({ color: '#f2c94c', roughness: 0.5, metalness: 0 }),
  brand: new MeshStandardMaterial({ color: '#4b3f8f', roughness: 0.4, metalness: 0 }),
  cover: new MeshStandardMaterial({ color: TEASER.cover, roughness: 0.85, metalness: 0 }),
}
