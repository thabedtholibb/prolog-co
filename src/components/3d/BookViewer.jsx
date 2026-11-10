import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { bookMaterials, BOOK_SIZE } from './materials.js'
import { coverTextureFor, backTextureFor, spreadTextureFor } from './CoverTexture.js'
import { coverColor } from '../../lib/bookArt.js'
import { useOrbit, AzElRig } from './OrbitRig.jsx'

const { w, h, t } = BOOK_SIZE
const PAGE_DEPTH = 0.2 // punggung ramping sesuai buku puzzle nyata
const OPEN_ANGLE = Math.PI * 0.78 // ~140°: muka dalam kover menghadap kiri-depan

/*
 * BookViewer: buku sudoku prosedural (tanpa aset GLTF — bobot nol).
 * Seret untuk memutar model; ketuk kover untuk membuka-tutup (tombol nyata,
 * keyboard aman). Geseran vertikal tetap menggulir halaman (touch-action pan-y).
 */
export default function BookViewer({ variant, level = 'medium', month = 'Desember' }) {
  const [open, setOpen] = useState(false)
  const { state, handlers } = useOrbit({
    theta: -0.38,
    phi: 1.3,
    radius: 4.6,
    lookX: 0.15, // lidah ke pusat buku (kover tertutup)
    lookY: -0.02,
  })
  return (
    <div
      className={`relative aspect-square w-full ${state.dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      {...handlers}
    >
      <Canvas dpr={[1, 1.5]} camera={{ fov: 34 }} style={{ touchAction: 'pan-y' }}>
        <ambientLight intensity={0.75} />
        <hemisphereLight args={['#ffffff', '#cfc7e8', 0.35]} />
        <directionalLight position={[2.5, 3, 2.5]} intensity={1.15} />
        <AzElRig state={state} />
        <Book variant={variant} level={level} month={month} open={open} orbit={state} />
        <ContactShadows position={[0, -h / 2 - 0.001, 0]} opacity={0.28} scale={5} blur={2.4} far={1.2} />
      </Canvas>
      <button
        type="button"
        aria-pressed={open}
        onClick={(e) => {
          // klik keyboard (detail 0) selalu dituruti; tap setelah seret diabaikan
          if (e.detail !== 0 && state.moved > 8) return
          setOpen((o) => !o)
        }}
        style={{ touchAction: 'pan-y' }}
        className="absolute inset-0 w-full cursor-pointer bg-transparent"
      >
        <span className="sr-only">{open ? 'Tutup kover pratinjau 3D' : 'Buka kover pratinjau 3D'}</span>
      </button>
      <p className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[12px] text-muted-foreground/80" aria-hidden="true">
        {open ? 'Seret untuk memutar. Ketuk untuk menutup.' : 'Seret untuk memutar. Ketuk kover untuk melihat isi.'}
      </p>
    </div>
  )
}

function Book({ variant, level, month, open, orbit }) {
  const pivot = useRef()

  // saat kover terbuka: konten bergeser ke kiri & lebih lebar — mundur + lidah ikut
  orbit.rT = open ? 6.2 : 4.6
  orbit.lX = open ? -0.5 : 0.15

  const texture = coverTextureFor(variant, level, month)
  const backTex = backTextureFor(variant, month)
  const spread = spreadTextureFor(variant, level, month)

  // singleton material: ganti map sekubah varian — instan, tanpa rekonstruksi geometri
  bookMaterials.cover.map = texture
  bookMaterials.cover.needsUpdate = true
  bookMaterials.backCover.map = backTex
  bookMaterials.backCover.needsUpdate = true
  bookMaterials.inner.map = spread.left
  bookMaterials.inner.needsUpdate = true
  bookMaterials.pageFace.map = spread.right
  bookMaterials.pageFace.needsUpdate = true
  bookMaterials.spine.color.set(coverColor(variant, month))

  useFrame((_, dt) => {
    if (!pivot.current) return
    const goal = open ? -OPEN_ANGLE : 0
    const current = pivot.current.rotation.y
    pivot.current.rotation.y = current + (goal - current) * Math.min(1, dt * 6)
  })

  const edge = bookMaterials.page
  return (
    <group position={[0.15, 0, 0]}>
      {/* tumpukan halaman: muka depan = halaman kanan (journaling / puzzle kedua) */}
      <mesh material={[edge, edge, edge, edge, bookMaterials.pageFace, edge]}>
        <boxGeometry args={[w - 0.06, h - 0.06, PAGE_DEPTH]} />
      </mesh>
      {/* kover belakang: muka luar memakai cover belakang asli */}
      <mesh
        material={[edge, edge, edge, edge, edge, bookMaterials.backCover]}
        position={[0, 0, -(PAGE_DEPTH / 2 + t / 2)]}
      >
        <boxGeometry args={[w, h, t]} />
      </mesh>
      {/* punggung buku */}
      <mesh material={bookMaterials.spine} position={[-w / 2, 0, 0]}>
        <boxGeometry args={[0.09, h, PAGE_DEPTH + t * 1.05]} />
      </mesh>
      {/* kover depan berpanggal di tepi punggung; muka dalam = halaman kiri */}
      <group ref={pivot} position={[-w / 2, 0, 0]}>
        <group position={[w / 2, 0, 0]}>
          <mesh
            material={[edge, edge, edge, edge, bookMaterials.cover, bookMaterials.inner]}
            position={[0, 0, PAGE_DEPTH / 2 + t / 2]}
          >
            <boxGeometry args={[w, h, t]} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
