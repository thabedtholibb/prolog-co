import { useEffect } from 'react'
import Brand from '../components/Brand.jsx'

export default function InfoPage({ kind }) {
  const page = PAGES[kind]
  useEffect(() => {
    document.title = `${page.title} | Prolog.co`
    return () => { document.title = 'Prolog.co | Teman Cerita dan Perjalananmu' }
  }, [page.title])

  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="/" aria-label="Prolog.co, kembali ke beranda"><Brand logoClass="h-8 sm:h-9" /></a>
          <a href="/" className="text-sm font-semibold text-primary hover:underline">Kembali ke toko</a>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-semibold text-primary">Prolog.co</p>
        <h1 className="mt-3 max-w-[18ch] font-serif text-4xl font-bold leading-tight tracking-[-0.03em] sm:text-5xl">{page.title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">{page.intro}</p>
        <div className="mt-12 space-y-10">{page.content()}</div>
      </div>
    </main>
  )
}

function Section({ title, children }) {
  return <section aria-labelledby={title.replaceAll(' ', '-')}><h2 id={title.replaceAll(' ', '-')} className="font-serif text-2xl font-semibold">{title}</h2><div className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">{children}</div></section>
}

function ContactContent() {
  return <>
    <Section title="Email dukungan"><p><a className="font-semibold text-primary underline" href="mailto:prologcompanion@gmail.com">prologcompanion@gmail.com</a></p><p className="mt-2">Untuk pertanyaan tentang pesanan, sertakan nomor pesanan dan email yang digunakan saat checkout.</p></Section>
    <Section title="WhatsApp"><div className="flex flex-col gap-2"><a className="font-semibold text-primary underline" href="https://wa.me/6285732137950">WhatsApp 1: 085732137950</a><a className="font-semibold text-primary underline" href="https://wa.me/6282141317431">WhatsApp 2: 082141317431</a></div></Section>
    <Section title="Jam respons"><p>Respons dimulai pukul 16.00 WIB. Waktu balasan dapat berbeda sesuai jumlah pesan yang masuk.</p></Section>
    <Section title="Saat menghubungi kami"><p>Sertakan nama, nomor pesanan jika sudah ada, email checkout, dan penjelasan singkat. Untuk barang rusak atau kurang, sertakan foto bagian yang bermasalah.</p></Section>
  </>
}

function PrivacyContent() {
  return <>
    <Section title="Data yang dikumpulkan"><p>Saat checkout, Prolog.co menerima nama lengkap, email, nomor HP jika diisi, alamat pengiriman, isi pesanan, dan informasi status pesanan. Data tersebut diperlukan untuk memproses dan mengirim pesanan.</p></Section>
    <Section title="Penggunaan data"><p>Email digunakan untuk menghubungi pembeli terkait pesanan. Nama dan alamat digunakan untuk pengiriman. Data tidak digunakan untuk mengirim promosi tanpa kebutuhan komunikasi yang relevan dengan pesanan.</p></Section>
    <Section title="Pembayaran"><p>Pembayaran dilakukan melalui halaman hosted doit.id. Prolog.co tidak menerima atau menyimpan kredensial QRIS, Virtual Account, atau data pembayaran sensitif. Prolog.co menerima status pembayaran dan identitas transaksi untuk mencocokkan pesanan.</p></Section>
    <Section title="Penyimpanan order"><p>Data order disimpan di Supabase untuk kebutuhan pemrosesan, pelacakan, dukungan pelanggan, dan pencatatan transaksi. Akses administratif dibatasi untuk kebutuhan operasional toko.</p></Section>
    <Section title="Permintaan data"><p>Untuk pertanyaan atau permintaan terkait data pesanan, hubungi <a className="font-semibold text-primary underline" href="mailto:prologcompanion@gmail.com">prologcompanion@gmail.com</a> dengan menyertakan nomor pesanan atau email checkout.</p></Section>
  </>
}

function TermsContent() {
  return <>
    <Section title="Penggunaan toko"><p>Dengan menggunakan Prolog.co, pembeli bertanggung jawab memberikan nama, email, dan alamat pengiriman yang benar. Pesanan diproses berdasarkan data yang dikirim saat checkout.</p></Section>
    <Section title="Harga dan pembayaran"><p>Harga produk, ongkir, dan potongan voucher ditampilkan sebelum pesanan dibuat. Pembayaran diselesaikan melalui doit.id. Biaya layanan Virtual Account ditambahkan kepada pembeli pada halaman pembayaran. MDR QRIS mengikuti aturan yang berlaku.</p></Section>
    <Section title="Voucher"><p>Voucher hanya berlaku jika kode, periode, minimal pembelian, dan batas penggunaan terpenuhi. Prolog.co menghitung ulang potongan di server sebelum order dibuat.</p></Section>
    <Section title="Pembatalan dan retur"><p>Kebijakan pembatalan dan retur belum ditetapkan. Untuk masalah pada pesanan, hubungi Prolog.co melalui <a className="font-semibold text-primary underline" href="mailto:prologcompanion@gmail.com">prologcompanion@gmail.com</a> atau WhatsApp dengan menyertakan nomor pesanan.</p></Section>
    <Section title="Perubahan kebijakan"><p>Isi halaman ini dapat diperbarui ketika kebijakan operasional Prolog.co sudah ditetapkan. Versi terbaru akan tersedia di halaman ini.</p></Section>
  </>
}

const PAGES = {
  contact: { title: 'Hubungi kami', intro: 'Ada pertanyaan tentang produk atau pesanan? Kirimkan detailnya, kami akan membantu dari sana.', content: ContactContent },
  privacy: { title: 'Kebijakan privasi', intro: 'Penjelasan singkat tentang data yang dipakai Prolog.co untuk memproses pesanan.', content: PrivacyContent },
  terms: { title: 'Syarat penggunaan', intro: 'Hal yang perlu diketahui saat berbelanja dan menggunakan layanan Prolog.co.', content: TermsContent },
}
