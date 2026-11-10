# Prolog.co Launch Readiness

Dokumen ini adalah checklist sebelum domain publik dibuka. Item yang membutuhkan portal pihak ketiga atau keputusan pemilik tidak dianggap selesai hanya karena kode sudah siap.

## P0, wajib sebelum go public

- [ ] Domain produksi aktif dengan HTTPS.
- [ ] `VITE_SUPABASE_URL` menunjuk ke project produksi.
- [ ] `VITE_SUPABASE_ANON_KEY` adalah anon key produksi, bukan service role key.
- [ ] `DOIT_API_KEY` dan `DOIT_WEBHOOK_SECRET` tersimpan hanya sebagai Supabase Edge Function secrets.
- [ ] Doit webhook URL terdaftar:
      `https://uyhwsquhmwlwebzcglun.supabase.co/functions/v1/doit-webhook`
- [ ] Event `webhook.test` menerima HTTP 200.
- [ ] Transaksi sandbox `paid`, `expired`, dan duplicate webhook sudah diuji.
- [ ] Aplikasi Doit live sudah disetujui dan fee VA disetel ditanggung pembeli.
- [ ] Backup database produksi dibuat sebelum transaksi live pertama.
- [x] RLS aktif pada seluruh tabel publik dan grant tabel diperketat dengan prinsip least privilege.
- [ ] Identitas legal, alamat usaha, email dukungan, kebijakan privasi, syarat penggunaan, pengiriman, dan retur sudah diisi serta ditinjau pemilik.
- [x] Kontak publik, kebijakan privasi, dan syarat penggunaan tersedia; kebijakan order dan alamat usaha masih kosong sesuai keputusan pemilik.

## P1, cek saat release candidate

- [ ] `npm test` lulus.
- [ ] `npm run test:e2e` lulus.
- [ ] `npm run build` lulus.
- [ ] Lighthouse storefront tidak memiliki failure Accessibility, Best Practices, atau SEO.
- [ ] Tidak ada horizontal overflow pada 320, 390, dan 1280 px.
- [ ] Checkout diuji dengan stok tersedia, stok habis, form kosong, pembayaran ditutup, dan pembayaran kedaluwarsa.
- [ ] Admin diuji untuk login, edit stok, edit harga, dan update resi.
- [ ] Foto produk, harga, stok, dan copy katalog sudah final.
- [ ] Promo live diuji dengan kode valid, kode salah, subtotal minimum, tanggal berakhir, dan batas penggunaan.
- [ ] FAQ ditinjau ulang setelah kebijakan pengiriman dan retur final.

## Monitoring hari pertama

Pantau setiap 30 sampai 60 menit:

1. Supabase Edge Functions: error 4xx/5xx dan latency.
2. Doit portal: delivery webhook, retry, dan status payment.
3. Orders: order `pending_payment` yang menumpuk, `needs_manual_review`, dan order `paid`.
4. Stock: perubahan stok yang tidak sesuai jumlah order.
5. Customer support: pembayaran berhasil tetapi halaman tidak kembali ke Prolog.

## Prosedur insiden pembayaran

1. Jangan mengubah status order secara manual sebelum mencocokkan payment ID, reference, dan amount.
2. Gunakan status payment Doit sebagai sumber kebenaran, bukan callback browser.
3. Untuk webhook gagal, periksa payload dan replay dari portal Doit setelah penyebab diperbaiki.
4. Untuk pembayaran terlambat setelah order expired, periksa `needs_manual_review` sebelum fulfillment.
5. Catat order number, payment ID, event ID, waktu, dan tindakan yang diambil.

## Belum bisa diotomatisasi dari repo

- Pengaturan fee payer dan webhook di portal Doit.
- Backup dan point-in-time recovery di Supabase.
- DNS, domain, email sender, SPF, DKIM, dan DMARC.
- Identitas hukum dan isi final dokumen legal.
