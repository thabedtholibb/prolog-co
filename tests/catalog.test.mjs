import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { safeBlurb, slugify, splitCatalog, stageKey, teaserWindow, categoryLabel, isSudoku } from '../src/lib/catalog.js'

describe('stageKey', () => {
  it('kategori dikenal memakai model teaser sendiri', () => {
    assert.equal(stageKey('keychain'), 'keychain')
    assert.equal(stageKey('booksleeve'), 'booksleeve')
  })

  it('kategori lain jatuh ke netral, bukan booksleeve palsu', () => {
    assert.equal(stageKey('sudoku'), 'unknown')
    assert.equal(stageKey('notebook'), 'unknown')
    assert.equal(stageKey(undefined), 'unknown')
  })
})

describe('categoryLabel', () => {
  it('slug jadi label manusiawi', () => {
    assert.equal(categoryLabel('keychain'), 'Keychain')
    assert.equal(categoryLabel('tote-bag'), 'Tote Bag')
  })

  it('kosong tetap punya label aman', () => {
    assert.equal(categoryLabel(''), 'Produk baru')
    assert.equal(categoryLabel(null), 'Produk baru')
  })
})

describe('isSudoku', () => {
  it('hanya kategori sudoku yang butuh sumbu varian', () => {
    assert.equal(isSudoku('sudoku'), true)
    assert.equal(isSudoku('keychain'), false)
    assert.equal(isSudoku('notebook'), false)
  })
})

describe('safeBlurb', () => {
  it('deskripsi kosong/null tetap string aman', () => {
    assert.equal(safeBlurb(null), '')
    assert.equal(safeBlurb(undefined), '')
    assert.equal(safeBlurb(''), '')
  })

  it('penanda "Segera hadir" dibuang', () => {
    assert.equal(safeBlurb('Sarung linen. Segera hadir.'), 'Sarung linen.')
  })
})

describe('slugify', () => {
  it('spasi dan tanda baca jadi tanda hubung', () => {
    assert.equal(slugify('Sarung Buku Linen'), 'sarung-buku-linen')
    assert.equal(slugify('  Edisi Khusus: Mei!  '), 'edisi-khusus-mei')
  })

  it('nama kosong jadi string kosong', () => {
    assert.equal(slugify(''), '')
    assert.equal(slugify(null), '')
  })
})

describe('splitCatalog', () => {
  const products = [
    { id: 's1', category: 'sudoku' },
    { id: 's2', category: 'sudoku' },
    { id: 'k1', category: 'keychain' },
    { id: 'b1', category: 'booksleeve' },
  ]

  it('sudoku tanpa varian aktif disembunyikan', () => {
    const { sudoku, ready, soon } = splitCatalog(products, [{ product_id: 's1' }])
    assert.deepEqual(sudoku.map((p) => p.id), ['s1'])
    assert.deepEqual(ready.map((p) => p.id), [])
    assert.deepEqual(soon.map((p) => p.id), ['k1', 'b1'])
  })

  it('non-sudoku yang punya varian pindah ke siap dibeli', () => {
    const { ready, soon } = splitCatalog(products, [{ product_id: 'k1' }])
    assert.deepEqual(ready.map((p) => p.id), ['k1'])
    assert.deepEqual(soon.map((p) => p.id), ['b1'])
  })

  it('produk teaser tetap tampil walau tanpa varian', () => {
    const { ready, soon } = splitCatalog(products, [])
    assert.deepEqual(ready, [])
    assert.deepEqual(soon.map((p) => p.id), ['k1', 'b1'])
  })
})

describe('teaserWindow', () => {
  const list = Array.from({ length: 6 }, (_, i) => ({ id: `p${i}` }))

  it('maksimal 4 kartu saat belum diperluas', () => {
    assert.equal(teaserWindow(list).length, 4)
    assert.equal(teaserWindow(list, false).length, 4)
  })

  it('semua tampil setelah diperluas', () => {
    assert.equal(teaserWindow(list, true).length, 6)
  })

  it('daftar pendek tidak dipotong', () => {
    assert.equal(teaserWindow(list.slice(0, 3)).length, 3)
  })
})
