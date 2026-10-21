'use client'

import { useEffect, useRef } from 'react'

export function HeroOrbs() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) return
    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width - 0.5
      const y = (event.clientY - rect.top) / rect.height - 0.5
      node.style.setProperty('--mx', x.toFixed(3))
      node.style.setProperty('--my', y.toFixed(3))
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <div ref={ref} className="nx-orbs" aria-hidden>
      <i data-depth="1.1" />
      <i data-depth="-0.7" />
      <i data-depth="0.45" />
      <i data-depth="-1.3" />
    </div>
  )
}
