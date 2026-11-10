import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, RoundedBox, useTexture } from '@react-three/drei'
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import { teaserMaterials, TEASER, bookMaterials } from './materials.js'
import { useOrbit, AzElRig } from './OrbitRig.jsx'
import { CHARMS, DEFAULT_CHARMS } from '../../lib/keychain.js'
import coverFrontUrl from '../../assets/coverbook/depan.jpg'
import coverBackUrl from '../../assets/coverbook/belakang.jpg'

/*
 * Teaser Coming Soon — bentuk realistis, penuh (bukan blok redam):
 * - Keychain: ring baja + tiga ornamen gantung (stabilo, pembatas buku, pulpen)
 *   lewat tali pendek; ada konfigurator kecil untuk menambah/mengurangi isi kit.
 * - Booksleeve: sarung kain linen sederhana dengan buku terselip di mulut.
 * Keduanya bisa diseret untuk memutar. Tanpa harga, tanpa CTA.
 * Environment Lightformer = refleksi baja tanpa unduhan HDR.
 */
export default function ComingSoonViewer({ category, label, charms = DEFAULT_CHARMS, onToggleCharm }) {
  const keychain = category === 'keychain'
  const active = charms
  const toggle = (key) => onToggleCharm?.(key)
  const { state, handlers } = useOrbit({
    theta: -0.3,
    phi: keychain ? 1.36 : 1.34,
    radius: keychain ? 3.4 : 4.5,
    lookY: keychain ? 0.5 : -0.05,
  })
  if (!keychain && category !== 'booksleeve') return null
  return (
    <div className="w-full">
      <div
        className={`relative aspect-[4/3] w-full ${state.dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        {...handlers}
      >
        <Canvas dpr={[1, 1.5]} camera={{ fov: 31 }} style={{ touchAction: 'pan-y' }}>
          <ambientLight intensity={0.85} />
          <directionalLight position={[2, 3, 2]} intensity={0.85} />
          <Environment resolution={128} frames={1}>
            <Lightformer intensity={2.2} position={[0, 3, 2]} scale={[6, 3, 1]} />
            <Lightformer intensity={1.1} position={[-3, 1, 3]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
            <Lightformer intensity={0.9} position={[3, 2, 1]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} />
          </Environment>
          <AzElRig state={state} />
          {keychain ? <Keychain active={active} /> : <Booksleeve />}
          <ContactShadows position={[0, keychain ? -0.45 : -1.24, 0]} opacity={keychain ? 0.14 : 0.2} scale={4} blur={2.6} far={1} />
        </Canvas>
        {keychain && (
          <div
            className="absolute inset-x-2 bottom-1 z-10 flex flex-wrap items-center justify-center gap-1.5"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {CHARMS.map((c) => {
              const on = active[c.key]
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(c.key)}
                  style={{ touchAction: 'manipulation' }}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm transition-colors ${
                    on
                      ? 'border-primary bg-indigo-50/90 text-primary'
                      : 'border-slate-200/80 bg-card/80 text-muted-foreground hover:border-indigo-200 hover:text-foreground'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-primary' : 'bg-slate-400'}`} />
                  {c.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
      <p className="pb-1 pt-2 text-center text-[12px] text-muted-foreground/80">{label}. Seret untuk memutar.</p>
    </div>
  )
}

const pageMat = bookMaterials.page
const steel = teaserMaterials.steel
const leather = teaserMaterials.leather

/* Cincin jepit kecil: penghubung nyata antara kawat dan charm. */
function JumpRing({ position = [0, 0, 0], size = 0.036 }) {
  return (
    <mesh material={steel} position={position}>
      <torusGeometry args={[size, 0.01, 6, 16]} />
    </mesh>
  )
}

/* Tali: kabel tipis dari ring ke ornamen, menggantung lurus. */
function String({ len = 0.24 }) {
  return (
    <mesh material={teaserMaterials.cord} position={[0, -len / 2, 0]}>
      <cylinderGeometry args={[0.006, 0.006, len, 6]} />
    </mesh>
  )
}

/*
 * Ayunan: bandul teredam + putaran torsi pelan di sumbu tali.
 * Integrasi memakai `delta` (frame-rate independent). Gaya dorong kecil
 * meniru angin/sentuhan supaya tetap hidup, redaman mencegah berlebihan.
 */
function Swing({ children, phase = 0, ...props }) {
  const ref = useRef()
  const p = useRef({ a: 0, v: 0, t: 0, tv: 0 })
  useFrame((state, delta) => {
    if (!ref.current) return
    const s = p.current
    const dt = Math.min(delta, 0.05) // batasi langkah saat tab kembali fokus
    const time = state.clock.elapsedTime

    // Bandul (ayunan samping): a'' = -w²·sin(a) - c·a' + drive·sin(f·t + phase)
    const w = 2.3
    const c = 0.4
    const drive = 0.6
    const f = 0.65
    s.v += (-w * w * Math.sin(s.a) - c * s.v + drive * Math.sin(f * time + phase)) * dt
    s.a += s.v * dt

    // Torsi (putaran pelan mengelilingi tali), redaman ringan.
    const tw = 1.7
    const tc = 0.5
    const tdrive = 0.22
    const tf = 0.42
    s.tv += (-tw * tw * Math.sin(s.t) - tc * s.tv + tdrive * Math.sin(tf * time + phase * 2.1)) * dt
    s.t += s.tv * dt

    ref.current.rotation.z = s.a
    ref.current.rotation.y = s.t
  })
  return (
    <group ref={ref} {...props}>
      {children}
    </group>
  )
}

/* Pulpen mini: tutup berklip + pita baja, badan silinder menyambung, ujung baja flush. */
function Pen() {
  return (
    <group>
      <JumpRing size={0.029} />
      {/* tutup (lebih lebar, menutup atas badan) */}
      <mesh material={teaserMaterials.pen} position={[0, -0.09, 0]}>
        <cylinderGeometry args={[0.038, 0.038, 0.14, 16]} />
      </mesh>
      {/* klip logam */}
      <mesh material={steel} position={[0.043, -0.085, 0]}>
        <boxGeometry args={[0.012, 0.13, 0.022]} />
      </mesh>
      {/* pita baja pada tutup */}
      <mesh material={steel} position={[0, -0.155, 0]}>
        <cylinderGeometry args={[0.0395, 0.0395, 0.012, 16]} />
      </mesh>
      {/* badan: satu silinder menyambung ke tutup */}
      <mesh material={teaserMaterials.pen} position={[0, -0.31, 0]}>
        <cylinderGeometry args={[0.033, 0.033, 0.3, 16]} />
      </mesh>
      {/* pita brand */}
      <mesh material={teaserMaterials.brand} position={[0, -0.42, 0]}>
        <cylinderGeometry args={[0.034, 0.034, 0.036, 16]} />
      </mesh>
      {/* ujung baja menyambung flush ke badan */}
      <mesh material={steel} position={[0, -0.51, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.033, 0.1, 16]} />
      </mesh>
    </group>
  )
}

/* Stabilo: tutup gelap berklip, badan gemuk, pita brand, ujung kapur menyambung. */
function Highlighter() {
  return (
    <group>
      <JumpRing size={0.03} />
      {/* tutup gelap */}
      <mesh material={teaserMaterials.cap} position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.12, 18]} />
      </mesh>
      {/* klip logam */}
      <mesh material={steel} position={[0.077, -0.1, 0]}>
        <boxGeometry args={[0.016, 0.09, 0.026]} />
      </mesh>
      {/* badan */}
      <mesh material={teaserMaterials.highlighter} position={[0, -0.29, 0]}>
        <cylinderGeometry args={[0.066, 0.066, 0.26, 18]} />
      </mesh>
      {/* pita brand */}
      <mesh material={teaserMaterials.brand} position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.067, 0.067, 0.04, 18]} />
      </mesh>
      {/* ujung kapur: frustum menyambung flush ke badan */}
      <mesh material={teaserMaterials.highlighterTip} position={[0, -0.455, 0]}>
        <cylinderGeometry args={[0.066, 0.045, 0.07, 18]} />
      </mesh>
    </group>
  )
}

/* Pembatas buku: pita krem pendek + pita brand + ujung kulit + cincin jepit. */
function Bookmark() {
  return (
    <group>
      <JumpRing size={0.03} />
      <mesh material={pageMat} position={[0, -0.26, 0]}>
        <boxGeometry args={[0.09, 0.5, 0.012]} />
      </mesh>
      <mesh material={teaserMaterials.brand} position={[0, -0.12, 0.008]}>
        <boxGeometry args={[0.094, 0.06, 0.008]} />
      </mesh>
      <RoundedBox args={[0.12, 0.09, 0.026]} radius={0.018} smoothness={3} material={leather} position={[0, -0.55, 0]} />
      <mesh material={steel} position={[0, -0.63, 0]}>
        <cylinderGeometry args={[0.009, 0.015, 0.08, 8]} />
      </mesh>
    </group>
  )
}

/*
 * Keychain Reading Kit: satu ring besar, tiga ornamen (stabilo, pembatas
 * buku, pulpen) menggantung dari ring lewat tali pendek. Tiap ornamen berayun
 * seperti bandul sambil berputar pelan, jadi terasa hidup dan tidak kaku.
 * `active` menentukan ornamen mana yang tampil (konfigurator di viewer).
 */
function Keychain({ active = {} }) {
  const items = [
    { key: 'highlighter', x: -0.13, phase: 0.4, el: <Highlighter /> },
    { key: 'bookmark', x: 0, phase: 1.1, el: <Bookmark /> },
    { key: 'pen', x: 0.13, phase: 2.0, el: <Pen /> },
  ].filter((it) => active[it.key])

  // Titik gantung mengikuti lengkung bawah ring (bukan lurus), supaya tali
  // benar-benar menyambung ke ring. Semua ornamen diratakan di charmTop.
  const ring = 1.0
  const R = 0.2
  const tube = 0.026
  const charmTop = 0.56
  const attachY = (x) => ring - Math.sqrt(Math.max(R * R - x * x, 0)) - tube

  return (
    <group rotation={[0.1, -0.28, 0.03]} position={[0, -0.02, 0]}>
      {/* ring gantungan baja + ring belah kecil yang bertaut di atasnya */}
      <mesh material={steel} position={[0, ring, 0]}>
        <torusGeometry args={[R, tube, 12, 48]} />
      </mesh>
      <mesh material={steel} position={[0, ring + 0.24, 0]} rotation={[Math.PI / 2.4, 0.2, 0]}>
        <torusGeometry args={[0.05, 0.011, 8, 22]} />
      </mesh>

      {/* tiap ornamen: tali dari ring + ornamen menggantung di ujungnya */}
      {items.map((it) => {
        const y = attachY(it.x)
        const len = y - charmTop
        return (
          <Swing key={it.key} position={[it.x, y, 0]} phase={it.phase}>
            <String len={len} />
            <group position={[0, -len, 0]}>{it.el}</group>
          </Swing>
        )
      })}
    </group>
  )
}

/* Kain linen: tenun sangat halus, tidak ramai, diulang agar tidak melar. */
function makeFabricTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const g = canvas.getContext('2d')
  g.fillStyle = TEASER.fabric
  g.fillRect(0, 0, size, size)
  for (let i = 0; i < size; i += 8) {
    g.fillStyle = 'rgba(64, 92, 124, 0.07)'
    g.fillRect(i, 0, 1, size)
    g.fillStyle = 'rgba(255, 255, 255, 0.07)'
    g.fillRect(0, i, size, 1)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  texture.wrapS = texture.wrapT = RepeatWrapping
  return texture
}

/* Booksleeve: badan linen bersudut lembut + bibir (hem) yang benar-benar
   mengelilingi buku. Buku masuk lewat mulut, bukan menembus dinding. */
function Booksleeve() {
  const fabric = useMemo(() => makeFabricTexture(), [])
  const [frontTex, backTex] = useTexture([coverFrontUrl, coverBackUrl])
  teaserMaterials.fabric.map = fabric
  teaserMaterials.fabric.needsUpdate = true

  return (
    <group rotation={[0.34, -0.5, 0.05]} position={[0, 0.02, 0]}>
      {/* badan sarung: radius kecil agar puncaknya lapang, bukan membulat tajam */}
      <RoundedBox
        args={[1.0, 1.5, 0.36]}
        radius={0.06}
        smoothness={5}
        material={teaserMaterials.fabric}
        position={[0, -0.45, 0]}
      />
      {/* bibir kain di mulut: bidang atasnya tampak sebagai cincin di sekeliling
          buku, jadi buku terlihat masuk ke dalam sarung */}
      <RoundedBox
        args={[0.97, 0.12, 0.35]}
        radius={0.045}
        smoothness={4}
        material={teaserMaterials.fabric}
        position={[0, 0.26, 0]}
      />
      {/* buku terselip: cover depan + belakang asli dari folder coverbook */}
      <group position={[0, 0.24, 0.04]} rotation={[0.01, -0.05, -0.03]}>
        <mesh material={teaserMaterials.cover} position={[0, -0.005, -0.055]}>
          <boxGeometry args={[0.68, 0.94, 0.03]} />
        </mesh>
        <mesh position={[0, -0.005, -0.071]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.66, 0.92]} />
          <meshStandardMaterial map={backTex} roughness={0.9} />
        </mesh>
        <mesh material={pageMat} position={[0.018, 0, 0]}>
          <boxGeometry args={[0.65, 0.9, 0.085]} />
        </mesh>
        <mesh material={teaserMaterials.cover} position={[0, -0.005, 0.055]}>
          <boxGeometry args={[0.68, 0.94, 0.03]} />
        </mesh>
        <mesh position={[0, -0.005, 0.071]}>
          <planeGeometry args={[0.66, 0.92]} />
          <meshStandardMaterial map={frontTex} roughness={0.9} />
        </mesh>
        {/* punggung buku di sisi kiri */}
        <mesh material={teaserMaterials.cover} position={[-0.335, -0.005, 0]}>
          <boxGeometry args={[0.045, 0.94, 0.14]} />
        </mesh>
      </group>
    </group>
  )
}
