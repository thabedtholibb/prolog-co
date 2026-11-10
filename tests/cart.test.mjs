import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  addItem,
  setQty,
  computeSubtotal,
  checkoutOptions,
  describeItem,
  formatOptions,
  syncItems,
} from '../src/store/cartLogic.js'

const variantSku = (id, price) => ({ id, sku: `SKU-${id}`, name: `Varian ${id}`, price, qty: 0 })

describe('cartLogic', () => {
  it('menambah varian baru', () => {
    const items = addItem([], variantSku('a'))
    assert.equal(items.length, 1)
    assert.equal(items[0].qty, 1)
  })

  it('menggabungkan varian yang sama, tidak dobel baris', () => {
    let items = addItem([], variantSku('a'))
    items = addItem(items, variantSku('a'), 2)
    assert.equal(items.length, 1)
    assert.equal(items[0].qty, 3)
  })

  it('varian sama dengan bulan berbeda = dua baris terpisah', () => {
    const base = variantSku('a')
    const jan = { ...base, month: 'Januari 2027' }
    const feb = { ...base, month: 'Februari 2027' }
    let items = addItem([], jan)
    items = addItem(items, feb)
    assert.equal(items.length, 2)
    assert.equal(items[0].id, 'a:Januari 2027')
    assert.equal(items[0].month, 'Januari 2027')
    assert.equal(items[1].variantId, 'a') // UUID asli tetap tersimpan
    items = addItem(items, jan)
    assert.equal(items.length, 2)
    assert.equal(items[0].qty, 2) // bulan sama tetap digabung
  })

  it('level sudoku = bagian identitas, disimpan di item', () => {
    const base = { ...variantSku('a'), difficulty: 'medium' }
    let items = addItem([], base)
    items = addItem(items, { ...base, difficulty: 'hard' })
    assert.equal(items.length, 2)
    assert.equal(items[0].id, 'a:medium')
    assert.equal(items[1].id, 'a:hard')
    assert.equal(items[1].difficulty, 'hard')
    items = addItem(items, base)
    assert.equal(items.length, 2)
    assert.equal(items[0].qty, 2) // level sama tetap digabung
  })

  it('opsi bebas (charms) jadi bagian identitas baris', () => {
    const base = { ...variantSku('k'), options: { charms: 'Mini pulpen, Stabilo' } }
    let items = addItem([], base)
    items = addItem(items, base)
    assert.equal(items.length, 1)
    assert.equal(items[0].qty, 2)
    assert.deepEqual(items[0].options, { charms: 'Mini pulpen, Stabilo' })

    items = addItem(items, { ...base, options: { charms: 'Pembatas buku' } })
    assert.equal(items.length, 2)
    assert.notEqual(items[0].id, items[1].id)
  })

  it('jumlah dibatasi stok varian', () => {
    const limited = { ...variantSku('a'), stock: 2 }
    let items = addItem([], limited, 5)
    assert.equal(items[0].qty, 2)
    items = addItem(items, limited, 1)
    assert.equal(items[0].qty, 2)
    items = setQty(items, items[0].id, 9)
    assert.equal(items[0].qty, 2)
  })

  it('varian stok habis tidak masuk keranjang', () => {
    const soldOut = { ...variantSku('a'), stock: 0 }
    assert.equal(addItem([], soldOut).length, 0)
  })

  it('ukuran murni puzzle jadi bagian identitas baris', () => {
    let items = addItem([], { ...variantSku('a'), size: '50' })
    items = addItem(items, { ...variantSku('a'), size: '100' })
    assert.equal(items.length, 2)
    assert.equal(items[0].id, 'a:50')
    assert.equal(items[1].id, 'a:100')
    items = addItem(items, { ...variantSku('a'), size: '50' })
    assert.equal(items.length, 2)
    assert.equal(items[0].qty, 2) // ukuran sama tetap digabung
  })

  it('setQty 0 atau negatif menghapus item', () => {
    let items = addItem([], variantSku('a'))
    items = setQty(items, items[0].id, 0)
    assert.equal(items.length, 0)
  })

  it('subtotal = harga x qty, tanpa desimal', () => {
    const items = [variantSku('a', 2), variantSku('b', 2)]
    items[0].qty = 2
    items[1].qty = 3
    assert.equal(computeSubtotal(items), 2 * 2 + 3 * 2)
  })
})

describe('opsi pesanan', () => {
  it('sudoku memakai bulan + level', () => {
    assert.deepEqual(checkoutOptions({ month: 'Januari 2027', difficulty: 'medium' }), {
      month: 'Januari 2027',
      difficulty: 'medium',
    })
  })

  it('opsi bebas menang atas bulan/level', () => {
    assert.deepEqual(checkoutOptions({ month: 'Januari 2027', options: { charms: 'Stabilo' } }), {
      charms: 'Stabilo',
    })
  })

  it('label opsi enak dibaca dan level dipetakan', () => {
    assert.equal(formatOptions({ month: 'Januari 2027', difficulty: 'hard' }), 'Januari 2027 · Hard')
    assert.equal(describeItem({ options: { charms: 'Mini pulpen, Stabilo' } }), 'Mini pulpen, Stabilo')
    assert.equal(describeItem({}), '')
  })

  it('ukuran murni puzzle terbawa ke opsi dan label', () => {
    assert.deepEqual(checkoutOptions({ size: '75' }), { size: '75' })
    assert.equal(describeItem({ size: '75' }), '75 sudoku')
  })
})

describe('syncItems', () => {
  const item = { id: 'a', variantId: 'a', price: 100, qty: 1, stock: 1, name: 'Lama', sku: 'A' }
  const variant = { id: 'a', price: 120, stock: 4, name: 'Baru', sku: 'A' }

  it('harga, stok, nama mengikuti katalog terbaru', () => {
    const [updated] = syncItems([item], [variant])
    assert.equal(updated.price, 120)
    assert.equal(updated.stock, 4)
    assert.equal(updated.name, 'Baru')
  })

  it('varian yang hilang dibiarkan agar bisa dihapus pengguna', () => {
    const [unchanged] = syncItems([item], [])
    assert.deepEqual(unchanged, item)
  })
})
