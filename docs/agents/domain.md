# Domain Docs

Cara skill engineering membaca dokumentasi domain prologproject saat menjelajah kode.

## Sebelum menjelajah, baca

- **`GLOSSARY.md`** di root repo, atau
- **`GLOSSARY-MAP.md`** di root bila ada: file itu menunjuk satu `GLOSSARY.md` per konteks. Baca yang relevan dengan topik.
- **`docs/adr/`**: baca ADR yang menyentuh area yang akan dikerjakan.

Bila file belum ada, **lanjut diam-diam**. Jangan menandai ketiadaannya dan jangan menyarankan membuatnya di awal. Skill `/domain-modeling` (lewat `/grill-with-docs` dan `/improve-codebase-architecture`) membuatnya saat istilah atau keputusan benar-benar selesai dibahas.

## Struktur file

Repo single-context:

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-contoh-keputusan.md
│   └── 0002-contoh-lain.md
└── src/
```

Repo multi-context memakai `GLOSSARY-MAP.md` di root dan `GLOSSARY.md` per konteks di `src/<context>/`. prologproject saat ini single-context.

## Pakai kosakata glossary

Saat output menyebut konsep domain (judul tiket, usulan refactor, hipotesis, nama tes), pakai istilah seperti di `GLOSSARY.md`. Jangan beralih ke sinonim yang justru dihindari glossary.

Kalau konsepnya belum ada di glossary, itu sinyal: mungkin kamu mengarang istilah yang tidak dipakai proyek (pertimbangkan ulang), atau memang ada celah nyata (catat untuk `/domain-modeling`).

## Tandai konflik ADR

Kalau output bertentangan dengan ADR yang ada, sebutkan terang-terangan, jangan diam-diam menimpa:

> _Bertentangan dengan ADR-0007 (contoh), tetapi layak dibuka lagi karena…_
