'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import PillNav from '@/components/PillNav'
import { PRODUCT_MODULES } from '@/components/landing/productCatalog'

const MARK = '/LOGOS/N%20SIN%20FONDO.png'

const ITEMS = [
  { label: 'Inicio', href: '/#inicio' },
  { label: 'Módulos', href: '/#modulos' },
  { label: 'Preguntas', href: '/#preguntas' },
  { label: 'Producto', href: '#producto' },
]

export function LandingNav({ enterHref }: { enterHref: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('/#inicio')

  useEffect(() => {
    if (pathname !== '/') return
    const nodes = ['inicio', 'modulos', 'preguntas', 'contacto']
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[]
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target.id) setActive(`/#${visible.target.id}`)
      },
      { rootMargin: '-40% 0px -45% 0px', threshold: [0.15, 0.4] },
    )
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && document.getElementById('nx-product')?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <header className="nx-nav">
      <div id="nx-product" className="nx-nav-live">
        <PillNav
          logo={MARK}
          logoAlt="Nexora"
          logoHref="/"
          items={ITEMS}
          activeHref={pathname === '/' ? active : undefined}
          theme="dark"
          size="md"
          highlightColor="#c9a84c"
          highlightTextColor="#0c0c0c"
          linkComponent={Link}
          ariaLabel="Secciones"
          onItemClick={(item: { label: string; href?: string }, _index: number, event: { preventDefault: () => void }) => {
            if (item.label === 'Producto') {
              event.preventDefault()
              setOpen((value) => !value)
              return
            }
            setOpen(false)
            if (pathname === '/' && item.href?.startsWith('/#')) {
              event.preventDefault()
              document.getElementById(item.href.slice(2))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }}
        />
        <Link href={enterHref} className="nx-btn nx-btn-gold">Login</Link>
        {open && (
          <div className="nx-product-menu" role="menu">
            {PRODUCT_MODULES.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.slug} href={`/producto/${item.slug}`} role="menuitem" onClick={() => setOpen(false)}>
                  <Icon size={16} />
                  <span>
                    <b>{item.name}</b>
                    <small>{item.summary}</small>
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </header>
  )
}
