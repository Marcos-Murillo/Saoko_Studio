'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import { StudioPreview } from '@/components/landing/StudioPreview'
import { LandingNav } from '@/components/landing/LandingNav'
import { HeroOrbs } from '@/components/landing/HeroOrbs'
import { TextPathBand } from '@/components/landing/TextPathBand'
import { ModuleOrbit } from '@/components/landing/ModuleOrbit'
import { FaqSection } from '@/components/landing/FaqSection'
import { AcademyCta } from '@/components/landing/AcademyCta'
import { PRODUCT_MODULES } from '@/components/landing/productCatalog'
import './landing.css'

const MARK = '/LOGOS/N%20SIN%20FONDO.png'

export function LandingPage() {
  const { user } = useAuth()
  const enterHref = user ? '/dashboard' : '/login'
  const [cursor, setCursor] = useState({ x: -400, y: -400 })

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) return
    const onMove = (event: PointerEvent) => setCursor({ x: event.clientX, y: event.clientY })
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) return
    const root = document.querySelector('.nx-landing')
    if (!root) return
    let frame = 0
    const update = () => {
      frame = 0
      const vh = window.innerHeight || 1
      root.querySelectorAll<HTMLElement>('[data-drift]').forEach((node) => {
        const speed = Number(node.dataset.drift) || 24
        const applied = Number.parseFloat(node.style.getPropertyValue('--nx-y')) || 0
        const rect = node.getBoundingClientRect()
        const layoutCenter = rect.top - applied + rect.height / 2
        const y = ((layoutCenter - vh / 2) / vh) * speed
        node.style.setProperty('--nx-y', `${y.toFixed(1)}px`)
      })
    }
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div className="nx-landing">
      <div className="nx-cursor" style={{ left: cursor.x, top: cursor.y }} />
      <LandingNav enterHref={enterHref} />

      <main>
        <section className="nx-hero" id="inicio">
          <HeroOrbs />
          <div className="nx-hero-glow" />
          <div className="nx-wrap nx-hero-copy">
            <div className="nx-pill-row">
              <span className="nx-announce"></span>
              <span>Ocho áreas de gestión, un solo lugar</span>
            </div>
            <h1>Tu academia tiene grandes sueños. Su administración también debe estar a la altura.</h1>
            <p className="nx-lead">
              Nexora gestiona alumnos, grupos, 
              pagos e inventario desde una sola plataforma. 
              Menos desorden administrativo. Más claridad para crecer.
            </p>
            <div className="nx-hero-cta">
              <a href="#modulos" className="nx-btn nx-btn-ghost">
                Ver módulos <ArrowRight className="nx-arrow" size={15} />
              </a>
              <Link href={enterHref} className="nx-btn nx-btn-gold">
                Login <ArrowRight className="nx-arrow" size={15} />
              </Link>
            </div>
            <div data-drift="22">
              <StudioPreview />
            </div>
          </div>
        </section>

        <TextPathBand />

        <section className="nx-section" id="modulos">
          <div className="nx-wrap">
            <div className="nx-split nx-modulos">
              <div className="nx-copy">
                <h2>¿Tu academia depende de mil herramientas?</h2>
                <p>No abriste una academia para pasar el día organizando archivos.</p>
                <p>Encuentra información sin buscar en varios archivos.</p>
                <ul className="nx-checks">
                  <li><span className="nx-check" aria-hidden />Consulta los movimientos de caja con mayor claridad.</li>
                  <li><span className="nx-check" aria-hidden />Mantén organizados los alumnos y sus grupos.</li>
                  <li><span className="nx-check" aria-hidden />Lleva un registro más ordenado del inventario.</li>
                  <li><span className="nx-check" aria-hidden />Dedica más tiempo a tus estudiantes y al crecimiento del negocio.</li>
                </ul>
              </div>
              <div data-drift="16">
                <ModuleOrbit />
              </div>
            </div>
          </div>
        </section>

        <section className="nx-section" id="preguntas">
          <div className="nx-wrap">
            <div className="nx-center">
              <h2>Preguntas de una academia</h2>
              <p>Lo que el equipo puede registrar hoy, dicho como se usa en el panel.</p>
            </div>
            <div data-drift="12">
              <FaqSection />
            </div>
          </div>
        </section>

        <section className="nx-section" id="contacto">
          <div className="nx-wrap" data-drift="18">
            <AcademyCta href={enterHref} />
          </div>
        </section>
      </main>

      <footer className="nx-foot">
        <div className="nx-wrap">
          <div className="nx-foot-grid">
            <div>
              <div className="nx-brand">
                <img src={MARK} alt="" />
                <span>NEXORA</span>
              </div>
              <h2>La gestión de tu academia.</h2>
              <p>Personas, clases, dinero del mes y lo que sale a festival. Tu academia en un solo lugar.</p>
            </div>
            <div>
              <h4>SECCIONES</h4>
              <ul>
                <li><a href="#inicio">Inicio</a></li>
                <li><a href="#modulos">Módulos</a></li>
                <li><a href="#preguntas">Preguntas</a></li>
                <li><a href="#contacto">Para academias</a></li>
              </ul>
            </div>
            <div>
              <h4>PRODUCTO</h4>
              <ul>
                {PRODUCT_MODULES.slice(0, 5).map((item) => (
                  <li key={item.slug}><Link href={`/producto/${item.slug}`}>{item.name}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4>ACCESO</h4>
              <ul>
                <li><Link href={enterHref}>Login</Link></li>
                {PRODUCT_MODULES.slice(5).map((item) => (
                  <li key={item.slug}><Link href={`/producto/${item.slug}`}>{item.name}</Link></li>
                ))}
              </ul>
            </div>
          </div>
          <p className="nx-legal">Nexora hecha para academias</p>
        </div>
      </footer>
    </div>
  )
}
