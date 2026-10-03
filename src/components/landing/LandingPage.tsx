'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, ArrowUpRight, BarChart3, Bell, CalendarDays, Check,
  CreditCard, LayoutDashboard, Mail, Menu, Shirt, Ticket, Users, X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import { StudioPreview } from '@/components/landing/StudioPreview'
import './landing.css'

const MARK = '/LOGOS/N%20SIN%20FONDO.png'

const NAV = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'modulos', label: 'Módulos' },
  { id: 'panorama', label: 'Academia' },
  { id: 'roles', label: 'Accesos' },
  { id: 'diario', label: 'Día a día' },
]

const MODULES = [
  'Bailarines', 'Grupos', 'Horarios', 'Mensualidades', 'Pagos', 'Deudas',
  'Saldos', 'Gastos', 'Reportes', 'Eventos', 'Vestuario', 'Correos', 'Roles',
]

const INSIGHTS = [
  {
    title: 'Mensualidades',
    text: 'Cada cuota guarda el valor del momento de la inscripción. Un cambio de tarifa no reescribe el pasado.',
    art: 'a',
  },
  {
    title: 'Festivales',
    text: 'Pase completo, categorías e inscripciones viven en el evento. Esa caja no se mezcla con la del estudio.',
    art: 'b',
  },
  {
    title: 'Vestuario',
    text: 'Préstamo, devolución y atraso. Se ve quién tiene cada pieza y desde cuándo.',
    art: 'c',
  },
  {
    title: 'Horarios',
    text: 'Día, hora, salón e instructor por grupo. El cambio de clase queda escrito en un solo lugar.',
    art: 'a',
  },
  {
    title: 'Deudas y saldos',
    text: 'Abono parcial, cuota al día o saldo a favor. El pago se reparte y se puede anular con motivo.',
    art: 'b',
  },
  {
    title: 'Reportes',
    text: 'Ingresos, gastos y balance del periodo, listos para salir en PDF o Excel.',
    art: 'c',
  },
]

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function GoldCheck() {
  return (
    <span className="nx-check" aria-hidden>
      <Check size={12} strokeWidth={3} />
    </span>
  )
}

function Spark({ up = true }: { up?: boolean }) {
  const color = up ? '#4caf7d' : '#e05252'
  return (
    <svg width="72" height="28" viewBox="0 0 72 28" fill="none" aria-hidden>
      <path
        d={up ? 'M1 22 C 12 20, 16 8, 26 12 S 42 24, 52 10 S 66 6, 71 4' : 'M1 6 C 14 8, 18 18, 28 14 S 44 6, 54 16 S 66 22, 71 24'}
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function Bars() {
  const values = [62, 28, 18, 44, 22, 58, 30, 48]
  return (
    <svg viewBox="0 0 220 110" width="100%" height="110" aria-hidden>
      {values.map((v, i) => (
        <rect
          key={i}
          x={8 + i * 26}
          y={100 - v}
          width="14"
          height={v}
          rx="4"
          fill={i % 3 === 1 ? '#a07830' : '#c9a84c'}
        />
      ))}
    </svg>
  )
}

function DashboardMock() {
  return (
    <div className="nx-dash-wrap">
      <div className="nx-in">
        <div className="nx-dash nx-float">
        <div className="nx-dash-top">
          <img src={MARK} alt="" style={{ height: 26 }} />
          <div className="nx-dash-tabs">
            <span data-on="true"><LayoutDashboard size={13} /> Inicio</span>
            <span><Users size={13} /> Bailarines</span>
            <span><CreditCard size={13} /> Caja</span>
            <span><Ticket size={13} /> Eventos</span>
            <span><CalendarDays size={13} /> Horarios</span>
          </div>
          <Bell size={15} color="#a09070" />
        </div>
        <div className="nx-dash-body">
          <div className="nx-dash-head">
            <h3>Inicio</h3>
            <span className="nx-chip" style={{ width: 'auto' }}>Ejemplo de pantalla</span>
          </div>
          <div className="nx-kpis">
            {[
              ['Bailarines activos', '128', 'en grupo', true],
              ['Al día', '96', 'cuota cubierta', true],
              ['Con deuda', '21', 'por cobrar', false],
              ['Con saldo', '11', 'a favor', true],
            ].map(([label, value, delta, up]) => (
              <div className="nx-kpi" key={String(label)}>
                <small>{label}</small>
                <div className="nx-kpi-row">
                  <strong>{value}</strong>
                  <Spark up={Boolean(up)} />
                </div>
                <div className={`nx-delta ${up ? 'up' : 'down'}`} style={{ marginTop: 4 }}>{delta}</div>
              </div>
            ))}
          </div>
          <div className="nx-dash-grid">
            <div className="nx-panel">
              <h4>Por cobrar este mes</h4>
              <p>Quién sigue pendiente y en qué grupo está.</p>
              {[
                ['Infantil A', '2 meses', 'Deuda'],
                ['Juvenil competencia', 'cuota de octubre', 'Parcial'],
                ['Adultos salsa', 'saldo a favor', 'Crédito'],
              ].map(([name, detail, status]) => (
                <div className="nx-row" key={name}>
                  <div className="nx-row-main">
                    <span className="nx-dot"><Users size={14} /></span>
                    <div>
                      <b>{name}</b>
                      <span>{detail}</span>
                    </div>
                  </div>
                  <span className="nx-status">{status}</span>
                </div>
              ))}
            </div>
            <div className="nx-panel">
              <h4>Ingresos y gastos</h4>
              <p>Seis meses de caja del estudio.</p>
              <div style={{ marginTop: 12 }}><Bars /></div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

function StackVisual() {
  const cards = [
    { title: 'Mensualidades', text: 'Pendiente, parcial, pagada o condonada. El valor queda fijo al generarse.', icon: CreditCard, top: 28 },
    { title: 'Inscripciones', text: 'Pase completo o categoría. El pago del festival no entra a la caja del estudio.', icon: Ticket, top: 132 },
    { title: 'Vestuario', text: 'Prestado, devuelto o atrasado, con fecha y bailarín.', icon: Shirt, top: 236 },
  ]
  return (
    <div className="nx-visual" aria-hidden>
      <div className="nx-rings" data-drift="-40"><i /><i /><i /><i /></div>
      <svg className="nx-shield" data-drift="22" viewBox="0 0 92 108">
        <path d="M46 6 L84 22 V52 C84 76 66 94 46 102 C26 94 8 76 8 52 V22 Z" fill="#e8c97a" />
        <path d="M46 22 L68 32 V52 C68 66 58 78 46 84 C34 78 24 66 24 52 V32 Z" fill="#0c0c0c" />
      </svg>
      {cards.map((card, index) => (
        <div
          key={card.title}
          className="nx-float-card nx-in"
          data-drift={index === 0 ? '16' : index === 1 ? '34' : '52'}
          style={{ top: card.top, animationDelay: `${card.top / 400}s` }}
        >
          <span className="nx-icon-orb"><card.icon size={16} /></span>
          <div>
            <strong>{card.title}</strong>
            <span>{card.text}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ChartVisual() {
  return (
    <div className="nx-visual" aria-hidden>
      <div style={{ position: 'absolute', inset: 36, borderRadius: 20, border: '1px solid rgba(201,168,76,.18)', background: '#0c0c0c', opacity: 0.85, padding: 16 }}>
        <div className="nx-kpis" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div className="nx-kpi"><small>Recaudado</small><strong style={{ fontSize: 16 }}>Caja</strong></div>
          <div className="nx-kpi"><small>Pendiente</small><strong style={{ fontSize: 16 }}>Deuda</strong></div>
          <div className="nx-kpi"><small>Gastos</small><strong style={{ fontSize: 16 }}>Mes</strong></div>
        </div>
      </div>
      <div
        className="nx-float-card nx-in"
        data-drift="38"
        style={{ top: 'auto', bottom: 36, left: 24, right: 24, background: 'linear-gradient(180deg,#e8c97a,#c9a84c)', color: '#000', border: 0 }}
      >
        <span className="nx-icon-orb" style={{ background: '#0c0c0c', color: '#e8c97a' }}><BarChart3 size={16} /></span>
        <div style={{ flex: 1 }}>
          <strong style={{ color: '#000' }}>La caja, leída de una vez</strong>
          <span style={{ color: '#3a2e14' }}>Ingreso del mes, lo pendiente y el balance después de gastos.</span>
          <svg viewBox="0 0 240 48" width="100%" height="48" style={{ marginTop: 8 }}>
            <path d="M0 36 C 30 34, 40 10, 70 16 S 110 40, 140 18 S 190 8, 240 12" stroke="#0c0c0c" strokeWidth="2.4" fill="none" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export function LandingPage() {
  const { user } = useAuth()
  const enterHref = user ? '/dashboard' : '/login'
  const enterLabel = 'Login'
  const [active, setActive] = useState('inicio')
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState({ x: -400, y: -400 })

  useEffect(() => {
    const nodes = NAV.map((item) => document.getElementById(item.id)).filter(Boolean) as HTMLElement[]
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target.id) setActive(visible.target.id)
      },
      { rootMargin: '-40% 0px -45% 0px', threshold: [0.15, 0.4] },
    )
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
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

  const go = (id: string) => {
    setOpen(false)
    scrollToId(id)
  }

  return (
    <div className="nx-landing">
      <div className="nx-cursor" style={{ left: cursor.x, top: cursor.y }} />

      <header className="nx-nav">
        <div className="nx-nav-bar">
          <button className="nx-brand" onClick={() => go('inicio')} type="button" style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }}>
            <img src={MARK} alt="" />
            <span>NEXORA</span>
          </button>
          <nav className="nx-links" aria-label="Secciones">
            {NAV.map((item) => (
              <button key={item.id} type="button" data-active={active === item.id} onClick={() => go(item.id)}>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="nx-nav-actions">
            <Link href={enterHref} className="nx-btn nx-btn-gold">
              {enterLabel} <ArrowRight className="nx-arrow" size={15} />
            </Link>
            <button className="nx-menu-toggle" type="button" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setOpen((v) => !v)}>
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      <nav className="nx-menu" data-open={open} aria-label="Menú móvil">
        {NAV.map((item) => (
          <button key={item.id} type="button" onClick={() => go(item.id)}>{item.label}</button>
        ))}
        <Link href={enterHref} className="nx-btn nx-btn-gold" style={{ marginTop: 6 }}>{enterLabel}</Link>
      </nav>

      <main>
        <section className="nx-hero" id="inicio">
          <div className="nx-hero-glow" />
          <div className="nx-wrap">
            <div className="nx-in">
              <div className="nx-pill-row">
                <span className="nx-pill-hot">Novedades</span>
                <span className="nx-pill-rest">Caja del estudio y festivales, separados <ArrowRight size={13} /></span>
              </div>
              <h1>La gestión de tu academia, en un solo panel.</h1>
              <p className="nx-lead">
                Nexora ordena bailarines, grupos, horarios, caja, vestuario y eventos de Saoko.
                Se ve quién está al día, qué se debe y qué sigue en el calendario.
              </p>
              <div className="nx-hero-cta">
                <button className="nx-btn nx-btn-ghost" type="button" onClick={() => go('modulos')}>
                  Ver módulos <ArrowRight className="nx-arrow" size={15} />
                </button>
                <Link href={enterHref} className="nx-btn nx-btn-gold">
                  {enterLabel} <ArrowRight className="nx-arrow" size={15} />
                </Link>
              </div>
            </div>

            <div className="nx-arc" aria-hidden>
              <svg viewBox="0 0 1200 190" preserveAspectRatio="xMidYMin slice">
                <defs>
                  <linearGradient id="nxArc" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#5c5045" stopOpacity="0" />
                    <stop offset="0.18" stopColor="#a07830" />
                    <stop offset="0.5" stopColor="#e8c97a" />
                    <stop offset="0.82" stopColor="#c9a84c" />
                    <stop offset="1" stopColor="#5c5045" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 176 Q600 8 1200 176" stroke="#e8c97a" strokeWidth="22" fill="none" opacity="0.22" />
                <path d="M0 176 Q600 8 1200 176" stroke="url(#nxArc)" strokeWidth="7" fill="none" />
              </svg>
            </div>

            <div data-drift="28">
              <StudioPreview />
            </div>
          </div>
        </section>

        <div className="nx-marquee" aria-hidden>
          <div className="nx-marquee-track">
            {[...MODULES, ...MODULES].map((item, index) => (
              <span className="nx-marquee-item" key={`${item}-${index}`}>
                <i style={{ width: 7, height: 7, borderRadius: 99, background: '#c9a84c', display: 'inline-block' }} />
                {item}
              </span>
            ))}
          </div>
        </div>

        <section className="nx-section" id="modulos">
          <div className="nx-wrap">
            <div className="nx-center nx-in">
              <h2>Lo que ya hace el estudio</h2>
              <p>
                Cada bloque del panel corresponde a una tarea real: la ficha de la persona,
                la clase, el dinero del mes y lo que sale a escenario.
              </p>
            </div>

            <div className="nx-bento">
              <article className="nx-tile" data-drift="18">
                <h3>Caja</h3>
                <p>Mensualidades, pagos, deudas, saldos a favor, gastos y reportes.</p>
                <div className="nx-chip-list">
                  <div className="nx-chip"><span>Oct · Infantil</span><b>Pagada</b></div>
                  <div className="nx-chip"><span>Oct · Juvenil</span><b>Parcial</b></div>
                  <div className="nx-chip"><span>Saldo a favor</span><b>Aplicado</b></div>
                </div>
              </article>

              <article className="nx-tile" data-drift="-16">
                <h3>Bailarines</h3>
                <p>Ficha, acudiente, grupo actual, categoría y si sigue activo.</p>
                <div className="nx-faces">
                  {['SA', 'LU', 'CA', 'JO', '+'].map((face) => <i key={face}>{face}</i>)}
                </div>
                <div className="nx-chip-list">
                  <div className="nx-chip"><span>Documento, EPS y contacto</span><b>Ficha</b></div>
                  <div className="nx-chip"><span>Grupo e instructor</span><b>Activo</b></div>
                </div>
              </article>

              <article className="nx-tile nx-tile-tall" data-drift="26">
                <div className="nx-beam-mark"><img src={MARK} alt="" /></div>
                <h3>Un acceso</h3>
                <p>Instructor, administrativo y dirección, todo en un mismo lugar, con acceso únicamente a las secciones que cada uno necesita.</p>
              </article>

              <article className="nx-tile nx-tile-wide" data-drift="-20">
                <h3>Semana de clases</h3>
                <p>Horario por grupo: día, hora, lugar e instructor.</p>
                <div className="nx-week">
                  {[
                    ['Lun', 'Infantil\n16:00'],
                    ['Mar', 'Juvenil\n17:30'],
                    ['Mié', 'Salsa\n19:00'],
                    ['Jue', 'Ensayo\n18:00'],
                    ['Vie', 'Adultos\n20:00'],
                    ['Sáb', 'Show\n11:00'],
                  ].map(([day, detail]) => (
                    <div className="nx-day" key={day}>
                      <b>{day}</b>
                      {detail.split('\n').map((line) => <span key={line}>{line}</span>)}
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <div id="panorama">
              <div className="nx-split">
                <div className="nx-copy nx-in">
                  <h2>Dirección, para ver el estudio completo</h2>
                  <p>
                    El inicio resume bailarines activos, quién debe, quién tiene saldo a favor,
                    lo recaudado, los gastos y el balance del periodo.
                  </p>
                  <p>
                    Abajo, la lista de deudores y la gráfica de seis meses. El filtro de fechas
                    recorre el mismo criterio en todo el panel.
                  </p>
                  <button className="nx-btn nx-btn-ghost" type="button" style={{ marginTop: 22 }} onClick={() => go('roles')}>
                    Ver accesos <ArrowRight className="nx-arrow" size={15} />
                  </button>
                </div>
                <StackVisual />
              </div>

              <div className="nx-split">
                <ChartVisual />
                <div className="nx-copy nx-in">
                  <h2>La caja, sin reescribir el mes pasado</h2>
                  <p>
                    Al inscribir, la mensualidad queda congelada. Un pago puede cubrir varias cuotas,
                    dejar abono parcial o generar saldo a favor. Anular un pago pide motivo y deshace el reparto.
                  </p>
                  <ul className="nx-checks">
                    <li><GoldCheck /> Cuotas pendientes, parciales, pagadas o condonadas.</li>
                    <li><GoldCheck /> Deudas por bailarín y saldos a favor.</li>
                    <li><GoldCheck /> Gastos con categoría, método y comprobante.</li>
                    <li><GoldCheck /> Reportes del periodo en PDF y Excel.</li>
                  </ul>
                </div>
              </div>

              <div className="nx-split">
                <div className="nx-copy nx-in">
                  <h2>El escenario, aparte de la mensualidad</h2>
                  <p>
                    Un festival tiene fecha, pase completo y categorías con su propio precio.
                    La inscripción suma lo que corresponde, registra abonos y cierra en pendiente, parcial o pagada.
                  </p>
                  <ul className="nx-checks">
                    <li><GoldCheck /> Categorías, inscripciones, pagos y estadísticas del evento.</li>
                    <li><GoldCheck /> Ese dinero no entra a la contabilidad mensual del estudio.</li>
                    <li><GoldCheck /> Vestuario con préstamo, devolución y atraso.</li>
                    <li><GoldCheck /> Correo del bailarín guardado para avisos que la academia todavía define.</li>
                  </ul>
                </div>
                <div className="nx-visual">
                  <div className="nx-float-card" data-drift="16" style={{ top: 32 }}>
                    <span className="nx-icon-orb"><Ticket size={16} /></span>
                    <div><strong>Pase completo</strong><span>Un valor cubre el festival, aparte de cada categoría.</span></div>
                  </div>
                  <div className="nx-float-card" data-drift="34" style={{ top: 150 }}>
                    <span className="nx-icon-orb"><Shirt size={16} /></span>
                    <div><strong>Pieza en préstamo</strong><span>Fecha de salida, fecha límite y devolución.</span></div>
                  </div>
                  <div className="nx-float-card" data-drift="52" style={{ top: 268 }}>
                    <span className="nx-icon-orb"><Mail size={16} /></span>
                    <div><strong>Avisos por definir</strong><span>Mensualidad, cambio de clase, evento o cumpleaños. Aún no se envían solos.</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="nx-section" id="roles" style={{ paddingTop: 20 }}>
          <div className="nx-wrap">
            <div className="nx-center nx-in">
              <h2>Un acceso para cada persona</h2>
              <p>
                No hay registro público. El equipo entra con el usuario que crea dirección.
                Cada rol abre una parte distinta del mismo estudio.
              </p>
            </div>
            <div className="nx-plans">
              <article className="nx-plan" data-drift="14">
                <span className="nx-kicker">Clase</span>
                <h3>Instructor</h3>
                <p className="nx-role">Ve el día, no la caja.</p>
                <p className="nx-blurb">Para quien da la clase y necesita el grupo y el horario, sin cifras.</p>
                <Link href={enterHref} className="nx-btn nx-btn-ghost">{enterLabel}</Link>
                <ul className="nx-checks">
                  <li><GoldCheck /> Inicio del estudio.</li>
                  <li><GoldCheck /> Grupos en lectura.</li>
                  <li><GoldCheck /> Horarios de sus clases.</li>
                  <li><GoldCheck /> Sin mensualidades, pagos ni deudas.</li>
                  <li><GoldCheck /> Sin usuarios ni catálogos.</li>
                </ul>
              </article>
              <article className="nx-plan" data-hot="true" data-drift="28">
                <span className="nx-kicker">Operación</span>
                <h3>Administrativo</h3>
                <p className="nx-role">Lleva personas, dinero y escenario.</p>
                <p className="nx-blurb">El rol del día a día: ficha, cuota, festival y vestuario.</p>
                <Link href={enterHref} className="nx-btn nx-btn-gold">{enterLabel}</Link>
                <ul className="nx-checks">
                  <li><GoldCheck /> Bailarines, acudientes y grupos.</li>
                  <li><GoldCheck /> Caja completa y reportes.</li>
                  <li><GoldCheck /> Eventos, inscripciones y vestuario.</li>
                  <li><GoldCheck /> Horarios y borrador de correos.</li>
                  <li><GoldCheck /> Sin crear usuarios ni cambiar catálogos.</li>
                </ul>
              </article>
              <article className="nx-plan" data-drift="14">
                <span className="nx-kicker">Estudio</span>
                <h3>Dirección</h3>
                <p className="nx-role">Configura quién entra y cómo se cobra.</p>
                <p className="nx-blurb">Administrador y super administrador. El super administrador es el único que crea otro de su mismo nivel.</p>
                <Link href={enterHref} className="nx-btn nx-btn-ghost">{enterLabel}</Link>
                <ul className="nx-checks">
                  <li><GoldCheck /> Todo lo del equipo administrativo.</li>
                  <li><GoldCheck /> Usuarios, roles y bajas.</li>
                  <li><GoldCheck /> Modalidades, categorías y niveles.</li>
                  <li><GoldCheck /> Métodos de pago y tipos de gasto.</li>
                  <li><GoldCheck /> Historial de cambios.</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="nx-section" id="diario" style={{ paddingTop: 10 }}>
          <div className="nx-wrap nx-center">
            <div className="nx-in">
              <h2>El día a día, escrito en el panel</h2>
              <p>
                Seis movimientos que el equipo ya puede registrar. Los avisos por correo están previstos;
                el envío automático todavía no sale.
              </p>
            </div>
          </div>
          <div className="nx-insights">
            <div className="nx-insight-track">
              {[...INSIGHTS, ...INSIGHTS].map((item, index) => (
                <button className="nx-insight" type="button" key={`${item.title}-${index}`} onClick={() => go('modulos')}>
                  <span className="nx-insight-arrow"><ArrowUpRight size={16} /></span>
                  <span className="nx-insight-art">
                    <i className={`nx-blob ${item.art === 'a' ? 'a' : item.art === 'b' ? 'e' : 'c'}`} />
                    <i className={`nx-blob ${item.art === 'a' ? 'd' : item.art === 'b' ? 'f' : 'b'}`} />
                  </span>
                  <span className="nx-insight-copy">
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="nx-section" id="contacto" style={{ paddingTop: 10 }}>
          <div className="nx-wrap">
            <div className="nx-cta-card nx-cta">
              <div>
                <h2>Entra al panel de tu academia</h2>
                <p>
                  Nexora es el sistema del estudio. Si ya tienes usuario, el acceso abre bailarines,
                  caja, horarios y eventos.
                </p>
                <div className="nx-cta-form">
                  <span>Tu usuario de la academia</span>
                  <Link href={enterHref} className="nx-btn nx-btn-gold">{enterLabel}</Link>
                </div>
              </div>
              <div className="nx-cta-preview" aria-hidden>
                <DashboardMock />
              </div>
            </div>
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
              <p>Personas, clases, dinero del mes y lo que sale a festival. Hecho para Saoko Estudio & Dance Company.</p>
            </div>
            <div>
              <h4>MÓDULOS</h4>
              <ul>
                {['modulos', 'panorama', 'roles', 'diario'].map((id, i) => (
                  <li key={id}>
                    <button type="button" onClick={() => go(id)}>{['Qué incluye', 'Caja y escenario', 'Accesos', 'Día a día'][i]}</button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>OPERACIÓN</h4>
              <ul>
                {['Bailarines y acudientes', 'Grupos y horarios', 'Mensualidades y reportes', 'Eventos y vestuario'].map((label) => (
                  <li key={label}><button type="button" onClick={() => go('modulos')}>{label}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4>ACCESO</h4>
              <ul>
                <li><Link href={enterHref}>{enterLabel}</Link></li>
                <li><button type="button" onClick={() => go('roles')}>Instructor</button></li>
                <li><button type="button" onClick={() => go('roles')}>Administrativo</button></li>
                <li><button type="button" onClick={() => go('roles')}>Dirección</button></li>
              </ul>
            </div>
          </div>
          <p className="nx-legal">Nexora · Saoko Estudio & Dance Company</p>
        </div>
      </footer>
    </div>
  )
}
