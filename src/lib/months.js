/* Nama bulan edisi monthly, dalam bahasa Indonesia, 12 bulan ke depan. */
const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

/*
 * Label cukup nama bulan (tanpa tahun) — window 12 bulan menjamin tiap
 * nama unik, sehingga aman jadi value <select> sekaligus identitas keranjang.
 */
export function nextMonths(count = 12) {
  const out = []
  const d = new Date()
  d.setDate(1)
  for (let i = 0; i < count; i++) {
    const m = new Date(d)
    m.setMonth(m.getMonth() + i + 1) // edisi dimulai dari bulan depan
    out.push(BULAN[m.getMonth()])
  }
  return out
}
