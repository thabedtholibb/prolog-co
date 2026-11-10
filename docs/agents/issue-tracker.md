# Issue tracker: Local Markdown

Issue dan spec untuk prologproject disimpan sebagai file markdown di `.scratch/`.

## Konvensi

- Satu fitur per direktori: `.scratch/<feature-slug>/`
- Spec: `.scratch/<feature-slug>/spec.md`
- Tiket implementasi satu file per tiket: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, nomor dari `01`, jangan satu file gabungan
- Status triage: baris `Status:` di dekat atas tiap file tiket
- Komentar dan riwayat diskusi: tambahkan di bawah heading `## Comments`

## Saat skill meminta "publish to the issue tracker"

Buat file baru di `.scratch/<feature-slug>/` (buat direktorinya bila perlu).

## Saat skill meminta "fetch the relevant ticket"

Baca file di path yang dirujuk. Pengguna biasanya memberi path atau nomor tiket.

## Wayfinding operations

Dipakai oleh `/wayfinder`. **Map** adalah file dengan satu **child** file per tiket.

- **Map**: `.scratch/<effort>/map.md` (isi Notes / Decisions-so-far / Fog)
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, nomor dari `01`, pertanyaan di body. Baris `Type:` mencatat jenis tiket (`research`/`prototype`/`grilling`/`task`); `Status:` mencatat `claimed`/`resolved`
- **Blocking**: baris `Blocked by: NN, NN` di dekat atas. Tiket terbuka saat semua file yang disebut sudah `resolved`
- **Frontier**: pindai `.scratch/<effort>/issues/` untuk tiket terbuka, tidak terblokir, belum diklaim; nomor terkecil menang
- **Claim**: set `Status: claimed` dan simpan sebelum mulai kerja
- **Resolve**: tulis jawaban di bawah `## Answer`, set `Status: resolved`, lalu tambahkan pointer ke Decisions-so-far di `map.md`
