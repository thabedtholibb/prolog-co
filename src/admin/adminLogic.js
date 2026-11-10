/*
 * Logika admin murni (tanpa React/Supabase) agar bisa dites pakai node --test.
 * REVENUE_STATUS: order dihitung pendapatan setelah dibayar; cancelled/pending tidak.
 */
export const REVENUE_STATUS = new Set(['paid', 'processing', 'shipped', 'completed'])

export function sumRevenue(orders) {
  return orders
    .filter((o) => REVENUE_STATUS.has(o.status))
    .reduce((sum, o) => sum + Math.round(Number(o.total_amount)), 0)
}

export function countByStatus(orders) {
  return orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})
}

/* SKU terlaris: gabung quantity per sku dari order_items. */
export function topSkus(orderItems) {
  const map = orderItems.reduce((acc, i) => {
    acc[i.sku] = (acc[i.sku] ?? 0) + i.quantity
    return acc
  }, {})
  return Object.entries(map)
    .map(([sku, qty]) => ({ sku, qty }))
    .sort((a, b) => b.qty - a.qty)
}

export function filterOrders(orders, status) {
  return status === 'semua' ? orders : orders.filter((o) => o.status === status)
}
