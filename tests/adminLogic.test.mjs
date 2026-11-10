import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { sumRevenue, countByStatus, topSkus, filterOrders } from '../src/admin/adminLogic.js'

const order = (status, total) => ({ status, total_amount: total })

describe('adminLogic', () => {
  it('pendapatan hanya dari order setelah dibayar', () => {
    const orders = [
      order('pending_payment', 100),
      order('paid', 64),
      order('shipped', 10),
      order('cancelled', 999),
      order('completed', 5),
    ]
    assert.equal(sumRevenue(orders), 64 + 10 + 5)
  })

  it('countByStatus menghimpun order per status', () => {
    const counts = countByStatus([order('paid', 1), order('paid', 1), order('shipped', 1)])
    assert.deepEqual(counts, { paid: 2, shipped: 1 })
  })

  it('topSkus mengurutkan SKU terlaris', () => {
    const items = [
      { sku: 'SDK-JRN-MTH', quantity: 2 },
      { sku: 'SDK-PUR-REG', quantity: 5 },
      { sku: 'SDK-JRN-MTH', quantity: 4 },
    ]
    assert.deepEqual(topSkus(items), [
      { sku: 'SDK-JRN-MTH', qty: 6 },
      { sku: 'SDK-PUR-REG', qty: 5 },
    ])
  })

  it('filterOrders menyaring status, "semua" lewat', () => {
    const orders = [order('paid', 1), order('shipped', 1)]
    assert.equal(filterOrders(orders, 'paid').length, 1)
    assert.equal(filterOrders(orders, 'semua').length, 2)
  })
})
