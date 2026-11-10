import { lazy } from 'react'

/*
 * Semua modul three.js masuk chunk terpisah (dynamic import). Halaman utama
 * tetap ringan; viewer hanya unduh saat benar-benar dirender.
 */
export const LazyBookViewer = lazy(() => import('./BookViewer.jsx'))
export const LazyComingSoonViewer = lazy(() => import('./ComingSoonViewer.jsx'))
