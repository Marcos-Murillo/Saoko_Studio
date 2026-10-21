'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth/AuthContext'
import { LandingNav } from '@/components/landing/LandingNav'
import { getProduct } from '@/components/landing/productCatalog'
import '@/components/landing/landing.css'

export function ProductView({ slug }: { slug: string }) {
  const product = getProduct(slug)
  const { user } = useAuth()
  const enterHref = user ? '/dashboard' : '/login'
  if (!product) return null
  const Icon = product.icon

  return (
    <div className="nx-landing">
      <LandingNav enterHref={enterHref} />
      <main className="nx-product-page">
        <div className="nx-wrap">
          <Link href="/#modulos" className="nx-kicker">Producto</Link>
          <div className="nx-product-head">
            <span className="nx-orbit-mark"><Icon size={22} /></span>
            <div>
              <h1>{product.name}</h1>
              <p>{product.lead}</p>
            </div>
          </div>
          <div className="nx-product-points">
            {product.points.map((point) => (
              <article key={point.title}>
                <h2>{point.title}</h2>
                <p>{point.text}</p>
              </article>
            ))}
          </div>
          <Link href={enterHref} className="nx-btn nx-btn-gold">Login</Link>
        </div>
      </main>
    </div>
  )
}
