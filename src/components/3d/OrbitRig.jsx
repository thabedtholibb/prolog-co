/*
 * OrbitRig: kamera spherical (azimuth/elevasi) digerakkan seret langsung.
 * Lebih ringan dari OrbitControls penuh: tanpa pan/zoom, tanpa bahaya
 * scroll-jack — elemen pembungkus memakai touch-action: pan-y sehingga
 * geseran vertikal di ponsel tetap menggulir halaman, geseran horizontal
 * memutar model.
 *
 * Catatan penting: jangan pakai setPointerCapture di pembungkus. Capture
 * membuat event `click` berhenti di pembungkus, sehingga tombol overlay
 * (buka kover, aksesibilitas keyboard) tidak pernah menerima tap. Gerakan
 * pointer dipantau lewat listener window, jadi seret tetap lancar walau
 * kursor keluar dari kanvas.
 */
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

export function useOrbit(initial = {}) {
  const state = useRef({
    theta: initial.theta ?? -0.32,
    phi: initial.phi ?? 1.28,
    radius: initial.radius ?? 4.7, // radius kini (teredam)
    rT: initial.radius ?? 4.7, // radius target (bisa diganti: maju/mundur)
    lookX: initial.lookX ?? 0, // kamera lidah x (ikut komposisi, mis. kover terbuka)
    lX: initial.lookX ?? 0,
    lookY: initial.lookY ?? -0.05,
    tTheta: initial.theta ?? -0.32,
    tPhi: initial.phi ?? 1.28,
    dragging: null, // {x, y} saat jari/kursor menahan
    moved: 0, // jarak total seret (piksel) — untuk membedakan tap vs putar
  }).current

  useEffect(() => {
    function move(e) {
      if (!state.dragging || !e.isPrimary) return
      const dx = e.clientX - state.dragging.x
      const dy = e.clientY - state.dragging.y
      state.dragging = { x: e.clientX, y: e.clientY }
      state.moved += Math.abs(dx) + Math.abs(dy)
      state.tTheta -= dx * 0.007
      state.tPhi = clamp(state.tPhi - dy * 0.005, 0.65, 1.95)
    }
    function stop() {
      state.dragging = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [state])

  const handlers = {
    onPointerDown(e) {
      if (!e.isPrimary) return
      state.dragging = { x: e.clientX, y: e.clientY }
      state.moved = 0
    },
  }

  return { state, handlers }
}

/* Terapkan state ke kamera tiap frame (dengan peredaman halus). */
export function AzElRig({ state }) {
  const { camera } = useThree()
  useFrame(() => {
    state.theta += (state.tTheta - state.theta) * 0.12
    state.phi += (state.tPhi - state.phi) * 0.12
    state.radius += (state.rT - state.radius) * 0.1
    state.lookX += (state.lX - state.lookX) * 0.12
    const { theta, phi, radius, lookX, lookY } = state
    camera.position.set(
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.cos(theta),
    )
    camera.lookAt(lookX, lookY, 0)
  })
  return null
}
