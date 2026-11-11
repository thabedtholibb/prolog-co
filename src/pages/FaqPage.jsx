import Brand from '../components/Brand.jsx'

const GROUPS = [
  {
    title: 'Produk',
    items: [
      ['Apa perbedaan Monthly dan Reguler?', 'Monthly adalah edisi journaling berisi 31 Sudoku untuk satu bulan tertentu. Reguler adalah edisi murni puzzle berisi 50, 75, atau 100 Sudoku dan tidak terikat bulan. Keduanya bukan langganan.'],
      ['Apakah saya bisa memilih tingkat kesulitan?', 'Bisa. Pilih Easy, Medium, atau Hard saat menambahkan produk ke keranjang.'],
      ['Apa itu journaling?', 'Journaling adalah konten Monthly yang menambahkan ruang untuk menulis di samping Sudoku. Reguler berfokus pada Sudoku murni.'],
    ],
  },
  {
    title: 'Pesanan dan pembayaran',
    items: [
      ['Metode pembayaran apa yang tersedia?', 'Pembayaran dilakukan melalui halaman aman doit.id. Metode yang muncul mengikuti kanal yang aktif pada akun merchant, termasuk QRIS dan Virtual Account.'],
      ['Siapa yang membayar biaya Virtual Account?', 'Biaya layanan Virtual Account ditambahkan ke tagihan dan dibayarkan oleh pembeli. Biaya tersebut ditampilkan sebelum pembayaran selesai.'],
      ['Bagaimana cara melacak pesanan?', 'Gunakan halaman Lacak pesanan dengan nomor pesanan dan email yang dipakai saat checkout.'],
    ],
  },
  {
    title: 'Pengiriman dan bantuan',
    items: [
      ['Berapa ongkos kirimnya?', 'Ongkos kirim flat yang digunakan saat ini adalah Rp15.000 untuk pesanan di Indonesia.'],
      ['Kapan pesanan dikirim?', 'Pesanan diproses setelah pembayaran terkonfirmasi. Nomor resi akan diperbarui oleh tim Prolog.co setelah pesanan diserahkan ke kurir.'],
      ['Bagaimana jika ada masalah dengan pesanan?', 'Simpan nomor pesanan, lalu hubungi tim Prolog.co dengan menjelaskan masalah dan melampirkan foto jika barang rusak atau kurang.'],
    ],
  },
]

export default function FaqPage() {
  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="/" aria-label="Prolog.co, kembali ke beranda"><Brand logoClass="h-8 sm:h-9" /></a>
          <a href="/" className="text-sm font-semibold text-primary hover:underline">Kembali ke toko</a>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-semibold text-primary">Pertanyaan yang sering muncul</p>
        <h1 className="mt-3 max-w-[18ch] font-serif text-4xl font-bold leading-tight tracking-[-0.03em] sm:text-5xl">Sebelum kamu memilih</h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">Jawaban singkat tentang produk, pembayaran, pengiriman, dan pelacakan pesanan.</p>
        <div className="mt-12 space-y-10">
          {GROUPS.map((group) => (
            <section key={group.title} aria-labelledby={`faq-${group.title}`}>
              <h2 id={`faq-${group.title}`} className="font-serif text-2xl font-semibold">{group.title}</h2>
              <div className="mt-4 divide-y divide-border border-y border-border">
                {group.items.map(([question, answer]) => (
                  <details key={question} className="group py-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-base font-semibold [&::-webkit-details-marker]:hidden">
                      {question}
                      <span aria-hidden="true" className="text-xl font-normal text-muted-foreground transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="max-w-3xl pr-8 pt-3 text-[15px] leading-relaxed text-muted-foreground">{answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
