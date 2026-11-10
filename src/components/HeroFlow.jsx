/*
 * Lapisan gradasi mengalir di belakang teks hero (R-19: delight, marketing/rare).
 * 3 blob radial lembut, blur dibake, bergerak hanya lewat transform, loop pelan
 * berbalik arah. Reduced motion: blob berhenti total (lihat .blob di index.css).
 * Warna keluarga palet: kabut navy yang tipis di atas latar terang.
 */
const BLOBS = [
  {
    className: 'blob is-slow',
    style: {
      left: '-10%',
      top: '-60%',
      width: '60%',
      height: '220%',
       background: 'radial-gradient(closest-side, rgba(29,40,70,0.18), rgba(29,40,70,0))',
    },
  },
  {
    className: 'blob is-fast',
    style: {
      right: '-12%',
      top: '-50%',
      width: '65%',
      height: '210%',
       background: 'radial-gradient(closest-side, rgba(148,148,146,0.18), rgba(148,148,146,0))',
    },
  },
  {
    className: 'blob is-slow',
    style: {
      left: '36%',
      top: '-10%',
      width: '50%',
      height: '180%',
       background: 'radial-gradient(closest-side, rgba(29,40,70,0.10), rgba(29,40,70,0))',
    },
  },
]

export default function HeroFlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {BLOBS.map((b, i) => (
        <div key={i} className={b.className} style={b.style} />
      ))}
    </div>
  )
}
