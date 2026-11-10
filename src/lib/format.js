/* Rupiah: "Rp" rapat ke angka, titik ribuan, tanpa desimal ("Rp50.000", bukan "Rp 50.000,00"). */
export const rp = (n) => 'Rp' + new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0))
