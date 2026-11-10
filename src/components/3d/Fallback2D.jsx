import { coverUrl } from '../../lib/bookArt.js'

/*
 * Fallback 2D saat WebGL gagal / prefers-reduced-motion (brief 4.4):
 * memakai cover asli bulan & level yang sedang dipilih — tetap jujur,
 * tanpa memutus alur beli.
 */
export default function Fallback2D({ variant, level = 'medium', month = 'Desember' }) {
  const src = coverUrl(variant, level, month)
  return (
    <div className="flex aspect-square items-center justify-center rounded-2xl bg-muted p-10">
      <img
        src={src}
        alt="Cover buku Sudoku Prolog.co"
        loading="lazy"
        decoding="async"
        className="aspect-[1.7/2.3] w-full max-w-56 rounded-md object-cover shadow-md"
      />
    </div>
  )
}
