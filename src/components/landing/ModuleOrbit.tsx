import Link from 'next/link'
import { PRODUCT_MODULES } from '@/components/landing/productCatalog'

const MARK = '/LOGOS/N%20SIN%20FONDO.png'

export function ModuleOrbit() {
  const modules = PRODUCT_MODULES.filter((item) => item.slug !== 'inicio')
  return (
    <div className="nx-orbit">
      <div className="nx-orbit-stage">
        <div className="nx-orbit-spin">
          {modules.map((item, index) => {
            const angle = (360 / modules.length) * index
            const Icon = item.icon
            return (
              <div
                key={item.slug}
                className="nx-orbit-slot"
                style={{ transform: `rotate(${angle}deg) translateY(-188px) rotate(${-angle}deg)` }}
              >
                <Link href={`/producto/${item.slug}`} className="nx-orbit-node">
                  <span className="nx-orbit-mark"><Icon size={18} /></span>
                  <b>{item.name}</b>
                </Link>
              </div>
            )
          })}
        </div>
        <div className="nx-orbit-core">
          <img src={MARK} alt="Nexora" />
        </div>
      </div>
    </div>
  )
}
