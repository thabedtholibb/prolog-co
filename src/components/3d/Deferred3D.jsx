import { useEffect, useRef, useState } from 'react'

/* Load heavy 3D modules shortly before their stage enters the viewport. */
export default function Deferred3D({ children, fallback, rootMargin = '240px' }) {
  const ref = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (!('IntersectionObserver' in window)) {
      setReady(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setReady(true)
        observer.disconnect()
      },
      { rootMargin },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [rootMargin])

  return <div ref={ref}>{ready ? children : fallback}</div>
}
