import Link from 'next/link'

export function AcademyCta({ href }: { href: string }) {
  return (
    <div className="nx-blueprint">
      <div className="nx-blueprint-copy">
        <p className="nx-kicker">Para academias</p>
        <h2>Lleva la clase, la cuota y el escenario sin cuadernos aparte.</h2>
        <p>
          Nexora es el panel de tu academia: quién ensaya, quién pagó, qué prenda salió
          y qué festival se está inscribiendo. Si ya tienes usuario, el acceso abre el estudio.
        </p>
        <Link href={href} className="nx-btn nx-btn-gold">Login</Link>
      </div>
    </div>
  )
}
