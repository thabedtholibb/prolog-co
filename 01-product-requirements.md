# Product Requirement Document (PRD) — Prolog.co

**Status:** Draft Baseline v1.0  
**Tanggal:** 6 November 2026  
**Project:** Prolog.co Phase 1 Launch  

---

## 1. Vision & Brand Positioning

### 1.1 Visi Perusahaan
Prolog.co adalah sebuah *stationery center* sekaligus *center of doom-scrolling antidote*. Kami percaya bahwa ruang fisik dan aktivitas analog adalah penawar terbaik dari kelelahan digital (digital fatigue) masyarakat urban modern.

### 1.2 Portofolio Produk Jangka Panjang
Prolog.co dirancang untuk menaungi 3 lini produk utama yang seluruhnya mengusung konsep visualisasi 3D kustom:
1. **Sudoku Book Line** (Fokus Utama Launch Phase 1) — Buku puzzle reflektif & mindful break.
2. **Booksleeve Line** (Phase 2) — Pelindung buku kustom material & warna.
3. **Keychain Reading Kit Line** (Phase 3) — Aksesori membaca kustom modular.

---

## 2. Target Persona & User Profile

### 2.1 Persona 1: The Commuter Journaler (Maya, 24th, Junior Designer)
- **Problem:** Menghabiskan 2–3 jam sehari di transportasi publik/istirahat kerja dengan scrolling media sosial tanpa sadar, merasa lelah mental & cemas.
- **Goal:** Ingin aktivitas jeda singkat yang tidak membutuhkan layar, estetis untuk dibawa di dalam tas, dan memberi kepuasan kecil menyelesaikan tantangan.
- **Perilaku:** Menyukai produk stationery estetik, warna pastel/earthy, rutin membagikan sudut ruang baca di media sosial.

### 2.2 Persona 2: The Mindful Gifter (Dimas, 28th, Software Engineer)
- **Problem:** Bingung mencari hadiah ulang tahun/hadiah apresiasi yang bermakna, tidak pasif, dan tidak menambah screen time untuk temannya.
- **Goal:** Membelikan buku/puzzle berkualitas dengan kesan personal dan kemasan rapi.

---

## 3. Scope Phase 1: Sudoku Product Line

Pada tahap awal launching, Prolog.co hanya menjual lini produk **Sudoku**. 

### 3.1 Matrix 4 SKU Utama Phase 1
Produk Sudoku Phase 1 dibagi berdasarkan 2 sumbu biner independen, menghasilkan **tepat 4 SKU**:

| Sumbu 1: Konten | Sumbu 2: Edisi | Kode SKU | Nama Produk Resmi | Deskripsi Ringkas |
|---|---|---|---|---|
| Dengan Journaling | Monthly | `SDK-JRN-MTH` | Prolog Sudoku Journaling — Monthly Edition | Buku puzzle porsi 1 bulan (±30 puzzle) dilengkapi pertanyaan refleksi harian/mingguan. |
| Dengan Journaling | Reguler | `SDK-JRN-REG` | Prolog Sudoku Journaling — Regular Edition | Buku tebal sekali beli (±100–200 puzzle) dilengkapi lembar refleksi mendalam. |
| Tanpa Journaling (Pure) | Monthly | `SDK-PUR-MTH` | Prolog Sudoku Classic — Monthly Edition | Porsi ringan 1 bulan (±30 puzzle), murni tantangan puzzle tanpa lembar refleksi. |
| Tanpa Journaling (Pure) | Reguler | `SDK-PUR-REG` | Prolog Sudoku Classic — Regular Edition | Buku tebal sekali beli (±100–200 puzzle), murni koleksi puzzle bertahap. |

### 3.2 Penjelasan Model Bisnis "Monthly Edition" (Non-Subscription)
- **Penting:** Versi *Monthly* **BUKAN** subscription dengan penagihan berulang otomatis (*recurring billing*).
- System transaksi berjalan seperti e-commerce konvensional (checkout bebas kapan saja oleh customer).
- Kata *Monthly* mengacu pada **porsi konten puzzle yang didesain pas untuk rentang 1 bulan** (±30 halaman) dengan rilis edisi/tema cover berkala, dibeli secara bebas satuan per transaksi.

### 3.3 Scope Tambahan Phase 1: Admin Dashboard (Operasional Internal)
Phase 1 menyertakan **Admin Dashboard ringan** di path `/admin` untuk operasional harian, sehingga tim tidak bergantung pada akses database langsung (Supabase Studio). Modul yang dibangun:
1. **Katalog & Varian** — edit harga, stok, dan status aktif produk/varian.
2. **Pesanan & Fulfillment** — filter pesanan berstatus `paid`, input nomor resi, ubah status menjadi `shipped` (memicu email resi otomatis).
3. **Statistik Sederhana** — ringkasan penjualan, jumlah order per status, dan SKU terlaris.
4. **Kelola Admin** — superadmin menambah/menghapus akun admin dan mengubah role via tabel `user_roles`.

---

## 4. Tegangan Scope: Visualisasi 3D vs Realita Phase 1

### 4.1 Pernyataan Tegangan
Visi besar Prolog.co menyatakan *"Semua produk memiliki visualisasi 3D yang dapat dimodifikasi oleh pengguna websitenya, lalu nanti bisa menghasilkan output harga dari modifikasinya."*

Namun pada Phase 1 (Sudoku):
- Buku Sudoku adalah produk fisik cetak yang atributnya kaku pada 4 SKU di atas.
- Belum ada atribut material/warna yang dapat diubah yang mempengaruhi harga akhir produk.

### 4.2 Resolusi & Keputusan Scope 3D Phase 1
1. **Viewer 3D berlaku untuk SELURUH lini produk di storefront, dengan kedalaman interaksi yang berbeda:**
   - **Sudoku (interaktif penuh):** **Lightweight 3D Interactive Model Viewer** — orbit, zoom, dan **flip/buka-tutup halaman buku** untuk melihat contoh isi puzzle secara taktil (ketebalan buku, tekstur kover, dan jilidan). Tanpa engine pengubah harga kustom.
   - **Booksleeve & Keychain (state Coming Soon):** Halaman produk disajikan dalam bentuk **teaser** — viewer 3D menampilkan model placeholder yang diredam (desaturasi) dengan label "Coming Soon", tanpa CTA pembelian aktif. Tujuannya menepati janji brand visual 3D di seluruh katalog sejak hari pertama.
2. **Phase 2+ (Booksleeve & Keychain rilis penuh):** Kustomizer model 3D diganti menjadi **Full 3D Customizer Engine with Real-Time Dynamic Pricing Output** saat lini Booksleeve/Keychain diluncurkan (karena terdapat variasi bahan canvas/leather, pilihan warna, kancing, dan bordir nama yang memiliki delta harga).
3. **Phase 2+ (Sudoku):** Viewer buku yang sudah interaktif dipertahankan tanpa perubahan major.

---

## 5. Explicit Out of Scope (Phase 1)

Berikut adalah fitur dan lini yang **ditunda** dan tidak dikerjakan di Phase 1:
- ❌ Lini produk Booksleeve dan Keychain Reading Kit.
- ❌ Configurator 3D dengan kalkulator harga dinamis (price delta engine).
- ❌ Auto-recurring subscription billing / keanggotaan berulang otomatis.
- ❌ Pembayaran internasional via Stripe (USD) — Phase 1 hanya melayani pesanan IDR melalui doit.id (QRIS dan Virtual Account yang aktif pada akun merchant).
- ❌ Program loyalty points & referral engine kompleks.
- ❌ Multi-currency & multi-language engine — Phase 1 murni **Rupiah (IDR)** dan bahasa Indonesia; ekspansi internasional (USD via Stripe) ditunda (lihat §7 & Implementation Plan Deferred Items).

---

## 6. Success Metrics (KPI Phase 1)

1. **Conversion Rate Storefront:** ≥ 2.5% dari total sesi pengunjung.
2. **Cart Abandonment Rate:** < 65% pada flow checkout.
3. **Product 3D Engagement:** ≥ 40% pengunjung detail produk berinteraksi dengan viewer 3D (rotate/zoom) minimal 3 detik.
4. **Qualitative UX Score:** Bebas dari *rage-clicks* pada elemen checkout dan *bounce rate* halaman produk < 40%.

---

## 7. Assumptions & Constraints

- **Fulfillment:** Diasumsikan diproses dari 1 gudang utama di Indonesia.
- **Shipping:** Menggunakan API agregator kurir lokal untuk JNE/SiCepat/GoSend bagi seluruh pesanan berdomisili **Indonesia**; penyedia agregator belum dikunci. Pengiriman internasional (DHL/Pos Indonesia, flat rate USD) ditunda bersamaan dengan keputusan deferred Stripe.
- **Pembayaran:** Checkout memakai halaman hosted doit.id; Prolog tidak menerima atau menyimpan kredensial pembayaran. Metode yang tersedia ditentukan konfigurasi dan persetujuan akun merchant.
- **Biaya layanan:** Biaya layanan Virtual Account ditanggung pembeli dan ditambahkan ke total tagihan di halaman doit.id; aplikasi memvalidasi nominal invoice (`amount`), bukan `total_amount`. MDR QRIS wajib ditanggung merchant sesuai aturan Bank Indonesia (0% sampai Rp100.000), sehingga QRIS tidak menambah biaya pembeli.
