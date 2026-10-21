import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductView } from '@/components/landing/ProductView'
import { getProduct, PRODUCT_MODULES } from '@/components/landing/productCatalog'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return PRODUCT_MODULES.map((item) => ({ slug: item.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = getProduct(slug)
  if (!product) return { title: 'Producto · Nexora' }
  return {
    title: `${product.name} · Nexora`,
    description: product.lead,
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = getProduct(slug)
  if (!product) notFound()
  return <ProductView slug={product.slug} />
}
