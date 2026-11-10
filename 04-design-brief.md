# Design Brief Documentation (design.md) — Prolog.co

**Status:** Draft Baseline v1.0  
**Tanggal:** 6 November 2026  
**Project:** Brand Visual Identity & UI Design System  

---

## 1. Brand Positioning & Creative Direction

### 1.1 Core Ethos: The Anti-Doomscroll Sanctuary
Prolog.co bukan sekadar merek alat tulis. Prolog.co adalah interupsi fisik terhadap kebiasaan *mindless scrolling*. Desain visual website harus memancarkan ketenangan (*calmness*), kehangatan taktil (*tactile warmth*), dan kejujuran tanpa ornamen buatan (*unadorned minimalism*).

### 1.2 Target Impression
- **Mood:** Mindful, earthy, cozy, slightly editorial, self-aware.
- **Vibe:** Seperti melangkah masuk ke toko buku independen sore hari dengan aroma kertas berkualitas tinggi dan cahaya alami.

---

## 2. Color System (Derived from `ui-ux-pro-max`)

Palet warna mengombinasikan nuansa *warm earthy paper* dengan aksen *mindful sage green* dan *calm lavender/indigo*, menghindari warna neon agresif khas SaaS/fintech.

```css
:root {
  /* Surface & Paper Tones */
  --color-background: #FAF5FF;       /* Soft warm lavender/cream tint */
  --color-card: #FFFFFF;             /* Pure paper white */
  --color-card-foreground: #0F172A;   /* Deep slate ink */

  /* Primary Brand Tokens */
  --color-primary: #7C3AED;          /* Mindful Purple / Deep Lavender */
  --color-on-primary: #FFFFFF;
  --color-secondary: #8B5CF6;        /* Soft Wisteria */
  --color-on-secondary: #000000;

  /* Accent & Action (CTA) */
  --color-accent: #059669;           /* Sage Emerald / Forest Mindful Green */
  --color-on-accent: #FFFFFF;

  /* Typography & Borders */
  --color-foreground: #0F172A;       /* Off-black ink */
  --color-muted: #F7F3FD;            /* Subtle paper shadow tint */
  --color-muted-foreground: #475569;  /* Muted slate text */
  --color-border: #EFE7FC;           /* Delicate outline */
  --color-ring: #7C3AED;             /* Accessible focus ring */

  /* Status */
  --color-destructive: #DC2626;      /* Calm muted red */
}
```

---

## 3. Typography System (Derived from `ui-ux-pro-max`)

Sistem tipografi menggunakan **Triple Stack (Editorial Serif + Clean UI Sans + Tactile Mono)** untuk menciptakan kontras antara nuansa literatur klasik dan navigasi digital yang responsif.

### 3.1 Font Families
- **Display & Headings (Editorial):** `Fraunces` (Serif variable, optical sizing) — Memberikan impresi majalah cetak & kover buku dengan karakter lembut/playful yang muda (revisi dari Playfair Display yang terasa kaku/penuh).
- **Body & UI Text (Legibility):** `Plus Jakarta Sans` (Sans-Serif) — Bersih, sangat mudah dibaca pada layar HP kecil.
- **Data, SKU, & Price (Tactile Label):** `JetBrains Mono` (Monospace) — Kesan cetakan stempel harga/kode katalog fisik.

### 3.2 Font Imports & Tailwind Setup
```html
<!-- Font Import di index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Playfair+Display:ital,wght@0,500;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```

```javascript
// tailwind.config.js extension
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
}
```

---

## 4. 3D Rendering & Material Aesthetic

### 4.1 Aesthetic Style Model 3D Buku
- **Material Texture:** Matte Uncoated Paper (bukan glossy/plastik berlebihan). Gunakan `MeshPhysicalMaterial` dengan `roughness: 0.85` dan `clearcoat: 0.05` untuk merepresentasikan tekstur kertas cetak fisik.
- **Lighting Setup:** Natural Soft Studio Lighting via HDRI Environment Map hangat (bukan pencahayaan sci-fi kontras tinggi).
- **Shadows:** Soft Contact Shadows di bawah buku (`ContactShadows` dari `@react-three/drei`) untuk merekatkan model ke bidang alas secara realistis.

---

## 4b. Story Landing & Motion Dials (Penambahan Revisi)
Tampilan utama tidak langsung mengekspos produk; brand dibuka sebagai **kisah tiga bab** (Kegelisahan, Keputusan, Prolog) sebelum produk dipecah ke `#katalog`:
1. **MOTION dial: 1-2 (calm).** Hanya scroll-reveal satu arah (fade + translateY 24px, 0.7-0.9s, ease-out kuat `cubic-bezier(0.23,1,0.32,1)`), tanpa loop, tanpa parallax. Tujuan: panduan perhatian pada beat cerita.
2. **Motif identitas `ink-line`:** garis tinta setebal 1px yang tumbuh dari kiri (`scaleX` 1.1s) saat bab masuk viewport - metafora "goresan pertama di kertas".
3. **RHYTHM dial: 2.** Bab satu/tiga rata kiri, bab dua bergeser kanan (`sm:ml-auto`) untuk ritme editorial yang tidak monoton.
4. **Reduced motion:** reveal jatuh ke cross-fade 0.3s, ink-line langsung penuh, smooth-scroll dimatikan.
5. **Implementasi:** IntersectionObserver natif + CSS transition (tanpa library motion); observer di-disconnect setelah satu kali muncul (tidak ada animasi berulang).

---

## 5. Component & Interaction Rules (Anti-Slop UI Pass)

Mengikuti panduan `antislop-ui` dan `antislop-human` untuk mencegah tampilan website generik berbau AI-slop:

### 5.1 Rules Mendasar
1. **No Emoji Icons:** Dilarang menggunakan emoji sebagai ikon UI (misal 🛒, 📚, ⭐). Wajib menggunakan SVG murni (`Lucide-React` atau `Heroicons`).
2. **Tactile Touch Feedback:** Seluruh elemen interaktif wajib memiliki `cursor-pointer`, feedback *active press* (scale down subtle `active:scale-95`), dan durasi transisi 150–300ms.
3. **No Infinite Scroll / Attention Hooks:** Halaman produk didesain berujung (*finite layout*) tanpa feed rekomendasi tanpa akhir yang memicu doom-scrolling.
4. **Visible Focus Rings:** Ring fokus keyboard wajib terlihat jelas (`outline: 2px solid var(--color-ring)`) tanpa menghilangkannya demi estetika semata.

---

## 6. Layout Breakpoints & Spacing

Sistem breakpoint mobile-first mengikuti standar responsif:
- **Mobile:** 375px (Single column, 3D viewer aspect ratio 1:1)
- **Tablet:** 768px (Two column, 3D viewer sejajar dengan picker varian)
- **Desktop:** 1024px & 1440px (Max width container 1280px, whitespace samping lega)

---

## 7. Accessibility & Anti-Dark-Pattern Commitment

- **Contrast Ratio:** Teks utama terhadap background memenuhi WCAG 2.2 AA (minimal 4.5:1, teks judul 3:1).
- **Respect Reduced Motion:** Jika pengguna mengaktifkan `prefers-reduced-motion`, rotasi otomatis model 3D dihentikan dan transisi CSS disederhanakan.
- **Honest Copywriting:** Penjelasan mengenai produk *Monthly* ditulis transparan sebagai *non-recurring purchase* tanpa klausul jebakan.

---

## 8. Admin Dashboard (Internal UI) Guidelines
Admin dashboard menggunakan token desain identik dengan storefront demi konsistensi brand, dengan penyesuaian berikut:
1. **Kepadatan informasi lebih tinggi:** Layout tabel dense (padding lebih kecil) — prioritas efisiensi kerja admin dibanding ekspresi visual editorial.
2. **Angka tetap JetBrains Mono:** Harga, stok, dan nomor order ditampilkan (dan di-input) dengan font mono, mengikuti konvensi katalog fisik.
3. **Zero dark pattern internal:** Aksi destruktif (hapus varian, nonaktifkan admin) wajib konfirmasi dua langkah yang jujur, bukan konfirmasi palsu.
4. **Noindex:** Route `/admin` beserta sub-halamannya tidak diindeks mesin pencari dan tidak tertaut di navigasi publik.
5. **Coming Soon Visual Treatment (3D):** Model Booksleeve/Keychain dirender dengan desaturation ringan + opacity ±0.6 di viewer, dan overlay label "Coming Soon" — kesan "produk sedang disiapkan di atas meja", bukan halaman kosong/error.
