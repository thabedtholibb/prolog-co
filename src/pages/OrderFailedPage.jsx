import { useNavigate, useSearchParams } from 'react-router-dom'
import Brand from '../components/Brand.jsx'

/*
 * Catatan RLS: draft order pembeli anon tak terbaca lintas user, jadi halaman ini
 * memang tidak menampilkan data sensitif, cukup nomor + tombol coba lagi.
 */
export default function OrderFailedPage() {
  const orderNumber = useSearchParams()[0].get('id')
  const navigate = useNavigate()

  return (
    <main className="mx-auto max-w-2xl px-6 py-24 text-center">
      <div className="mb-6 flex justify-center">
        <Brand logoClass="h-10" />
      </div>
      <h1 className="font-serif text-3xl font-bold">Pembayaran belum selesai</h1>
      <p className="mx-auto mt-4 max-w-md text-muted-foreground">
        {orderNumber
          ? `Pesanan ${orderNumber} belum masuk karena pembayaran ditolak atau jendelanya ditutup. Kamu bisa mencoba lagi dari checkout.`
          : 'Nomor pesanan tidak terbaca. Kamu bisa mencoba lagi dari keranjang.'}
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => navigate('/checkout')}
          className="cursor-pointer rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-indigo-600/20 transition-transform active:scale-95"
        >
          Coba bayar lagi
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="cursor-pointer rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold transition-transform hover:border-indigo-200 active:scale-95"
        >
          Kembali ke katalog
        </button>
      </div>
    </main>
  )
}
