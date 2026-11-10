import { useMemo } from 'react'

/* Keputusan tunggal 3D vs fallback: WebGL ada DAN motion diizinkan. */
export function use3DReady() {
  return useMemo(() => {
    if (typeof window === 'undefined') return 'fallback'
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const probe = document.createElement('canvas')
    const gl = probe.getContext('webgl2') ?? probe.getContext('webgl')
    return gl && !reduced ? '3d' : 'fallback'
  }, [])
}
