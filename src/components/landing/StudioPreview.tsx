'use client'

import { useMemo, useState } from 'react'
import {
  ArrowLeft, Bell, CalendarDays, CreditCard, LayoutDashboard, Search, Ticket, Users,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'

const MARK = '/LOGOS/N%20SIN%20FONDO.png'

type Tab = 'inicio' | 'bailarines' | 'caja' | 'eventos' | 'horarios'
type Pay = 'Pagada' | 'Parcial' | 'Deuda' | 'Saldo'

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
  { id: 'bailarines', label: 'Bailarines', icon: Users },
  { id: 'caja', label: 'Caja', icon: CreditCard },
  { id: 'eventos', label: 'Eventos', icon: Ticket },
  { id: 'horarios', label: 'Horarios', icon: CalendarDays },
]

const DANCERS = [
  { id: 'd1', name: 'Valentina Rojas', doc: '1023456789', age: 14, category: 'Juvenil', group: 'Juvenil competencia', phone: '300 111 2233', month: 'Pagada' as Pay, fee: 180000, paid: 180000, active: true },
  { id: 'd2', name: 'Samuel Ortiz', doc: '1034567890', age: 9, category: 'Infantil', group: 'Infantil A', phone: '301 222 3344', month: 'Deuda' as Pay, fee: 150000, paid: 0, active: true },
  { id: 'd3', name: 'Camila Herrera', doc: '1012345678', age: 17, category: 'Juvenil', group: 'Juvenil competencia', phone: '302 333 4455', month: 'Parcial' as Pay, fee: 180000, paid: 80000, active: true },
  { id: 'd4', name: 'Lucía Méndez', doc: '1009876543', age: 22, category: 'Adultos', group: 'Adultos salsa', phone: '310 444 5566', month: 'Saldo' as Pay, fee: 160000, paid: 200000, active: true },
  { id: 'd5', name: 'Joaquín Peña', doc: '1045678901', age: 11, category: 'Infantil', group: 'Infantil B', phone: '311 555 6677', month: 'Pagada' as Pay, fee: 150000, paid: 150000, active: true },
  { id: 'd6', name: 'Mariana Díaz', doc: '1056789012', age: 16, category: 'Juvenil', group: 'Ensayo show', phone: '312 666 7788', month: 'Deuda' as Pay, fee: 180000, paid: 0, active: true },
  { id: 'd7', name: 'Andrés Cárdenas', doc: '1067890123', age: 28, category: 'Adultos', group: 'Adultos salsa', phone: '313 777 8899', month: 'Pagada' as Pay, fee: 160000, paid: 160000, active: false },
  { id: 'd8', name: 'Sofía Lancheros', doc: '1078901234', age: 8, category: 'Infantil', group: 'Infantil A', phone: '314 888 9900', month: 'Pagada' as Pay, fee: 150000, paid: 150000, active: true },
]

const EVENTS = [
  {
    id: 'e1',
    name: 'Festival Saoko',
    date: '12 oct 2026',
    pass: 250000,
    status: 'Activo',
    note: 'Los pagos de este evento no entran a la caja mensual.',
    categories: [
      { name: 'Solo juvenil', price: 80000, dancers: ['Valentina Rojas', 'Camila Herrera'] },
      { name: 'Grupo infantil', price: 60000, dancers: ['Samuel Ortiz', 'Sofía Lancheros'] },
    ],
  },
  {
    id: 'e2',
    name: 'Competencia regional',
    date: '2 nov 2026',
    pass: 180000,
    status: 'Activo',
    note: 'Pase completo o pago por categoría.',
    categories: [
      { name: 'Pareja adultos', price: 90000, dancers: ['Lucía Méndez'] },
      { name: 'Solo infantil', price: 50000, dancers: ['Joaquín Peña'] },
    ],
  },
  {
    id: 'e3',
    name: 'Muestra de fin de año',
    date: '14 dic 2026',
    pass: 120000,
    status: 'Inactivo',
    note: 'Todavía no abre inscripciones.',
    categories: [
      { name: 'Elenco general', price: 0, dancers: ['Mariana Díaz'] },
    ],
  },
]

const CLASSES = [
  { id: 'c1', day: 'Lunes', start: '16:00', end: '17:30', group: 'Infantil A', room: 'Salón 1', instructor: 'Laura Gómez' },
  { id: 'c2', day: 'Martes', start: '17:30', end: '19:00', group: 'Juvenil competencia', room: 'Salón 2', instructor: 'Laura Gómez' },
  { id: 'c3', day: 'Miércoles', start: '19:00', end: '20:30', group: 'Adultos salsa', room: 'Salón 1', instructor: 'Diego Ruiz' },
  { id: 'c4', day: 'Jueves', start: '18:00', end: '19:30', group: 'Ensayo show', room: 'Salón 2', instructor: 'Laura Gómez' },
  { id: 'c5', day: 'Viernes', start: '20:00', end: '21:30', group: 'Adultos salsa', room: 'Salón 1', instructor: 'Diego Ruiz' },
  { id: 'c6', day: 'Sábado', start: '11:00', end: '13:00', group: 'Infantil B', room: 'Salón 1', instructor: 'Diego Ruiz' },
]

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const CASH_MONTHS = [
  { month: 'May', income: 4200000, expense: 1850000 },
  { month: 'Jun', income: 3900000, expense: 2100000 },
  { month: 'Jul', income: 4550000, expense: 1620000 },
  { month: 'Ago', income: 4180000, expense: 2340000 },
  { month: 'Sep', income: 4820000, expense: 1980000 },
  { month: 'Oct', income: 3640000, expense: 1410000 },
]

const CASH_FLOWS = [
  { id: 'f1', kind: 'Ingreso' as const, concept: 'Mensualidad · Valentina Rojas', amount: 180000, when: '2 oct' },
  { id: 'f2', kind: 'Ingreso' as const, concept: 'Mensualidad · Sofía Lancheros', amount: 150000, when: '3 oct' },
  { id: 'f3', kind: 'Gasto' as const, concept: 'Arriendo del salón', amount: 1200000, when: '1 oct' },
  { id: 'f4', kind: 'Gasto' as const, concept: 'Vestuario de ensayo', amount: 340000, when: '5 oct' },
  { id: 'f5', kind: 'Ingreso' as const, concept: 'Mensualidad · Joaquín Peña', amount: 150000, when: '6 oct' },
]

function pesos(value: number) {
  return `$${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

function cashPoints(key: 'income' | 'expense') {
  const max = Math.max(...CASH_MONTHS.flatMap((m) => [m.income, m.expense]))
  const width = 320
  const height = 112
  const padX = 16
  const padY = 10
  return CASH_MONTHS.map((month, index) => {
    const x = padX + (index * (width - padX * 2)) / (CASH_MONTHS.length - 1)
    const y = height - padY - (month[key] / max) * (height - padY * 2)
    return { x, y }
  })
}

function cashLine(points: { x: number; y: number }[]) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
}

function CashChart() {
  const income = cashPoints('income')
  const expense = cashPoints('expense')
  const base = 102
  const area = (points: { x: number; y: number }[]) =>
    `${cashLine(points)} L${points[points.length - 1].x.toFixed(1)},${base} L${points[0].x.toFixed(1)},${base} Z`

  return (
    <svg className="nx-chart" viewBox="0 0 320 128" role="img" aria-label="Ingresos de caja y gastos de los últimos seis meses">
      <defs>
        <linearGradient id="nxCashIn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="nxCashOut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e05252" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#e05252" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[28, 56, 84].map((y) => (
        <line key={y} x1="16" x2="304" y1={y} y2={y} stroke="rgba(240,234,214,0.08)" />
      ))}
      <path d={area(income)} fill="url(#nxCashIn)" />
      <path d={area(expense)} fill="url(#nxCashOut)" />
      <path d={cashLine(income)} fill="none" stroke="#c9a84c" strokeWidth="2" />
      <path d={cashLine(expense)} fill="none" stroke="#e05252" strokeWidth="2" />
      {CASH_MONTHS.map((month, index) => (
        <text key={month.month} x={income[index].x} y="124" textAnchor="middle" fill="#a09070" fontSize="10">
          {month.month}
        </text>
      ))}
    </svg>
  )
}

const PAY_COLOR: Record<Pay, string> = {
  Pagada: '#4caf7d',
  Parcial: '#e8a030',
  Deuda: '#e05252',
  Saldo: '#4a90d9',
}

function includes(q: string, ...parts: string[]) {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  return parts.join(' ').toLowerCase().includes(needle)
}

function Badge({ label }: { label: Pay | string }) {
  const color = PAY_COLOR[label as Pay] ?? (label === 'Activo' ? '#4caf7d' : '#a09070')
  return <span className="nx-badge" style={{ color, borderColor: color }}>{label}</span>
}

export function StudioPreview() {
  const [tab, setTab] = useState<Tab>('inicio')
  const [query, setQuery] = useState('')
  const [dancerId, setDancerId] = useState<string | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)
  const [classId, setClassId] = useState<string | null>(null)

  const openTab = (next: Tab) => {
    setTab(next)
    setQuery('')
    setDancerId(null)
    setEventId(null)
    setClassId(null)
  }

  const openDancer = (id: string) => {
    setTab('bailarines')
    setDancerId(id)
    setQuery('')
  }

  const active = DANCERS.filter((d) => d.active)
  const dancers = useMemo(
    () => DANCERS.filter((d) => includes(query, d.name, d.doc, d.group, d.category)),
    [query],
  )
  const fees = useMemo(
    () => active.filter((d) => includes(query, d.name, d.group, d.month)),
    [query, active],
  )
  const events = useMemo(
    () => EVENTS.filter((e) => includes(query, e.name, e.status, e.date)),
    [query],
  )
  const classes = useMemo(
    () => CLASSES.filter((c) => includes(query, c.group, c.day, c.instructor, c.room)),
    [query],
  )

  const dancer = DANCERS.find((d) => d.id === dancerId)
  const event = EVENTS.find((e) => e.id === eventId)
  const klass = CLASSES.find((c) => c.id === classId)

  const searchPlaceholder =
    tab === 'caja' ? 'Buscar por bailarín, grupo o estado…'
      : tab === 'eventos' ? 'Buscar evento…'
        : tab === 'horarios' ? 'Buscar grupo, día o instructor…'
          : 'Buscar por nombre, cédula o grupo…'

  return (
    <div className="nx-dash-wrap">
      <div className="nx-dash nx-live">
        <div className="nx-dash-top">
          <img src={MARK} alt="" style={{ height: 26 }} />
          <div className="nx-dash-tabs" role="tablist" aria-label="Módulos de ejemplo">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" data-on={tab === id ? 'true' : undefined} onClick={() => openTab(id)}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
          <Bell size={15} color="#a09070" />
        </div>

        <div className="nx-dash-body">
          <div className="nx-dash-head">
            <div className="nx-dash-title">
              {(dancer || event || klass) && (
                <button type="button" className="nx-back" onClick={() => { setDancerId(null); setEventId(null); setClassId(null) }}>
                  <ArrowLeft size={14} /> Volver
                </button>
              )}
              <h3>
                {dancer ? dancer.name : event ? event.name : klass ? klass.group : TABS.find((t) => t.id === tab)?.label}
              </h3>
            </div>
            {!dancer && !event && !klass && tab !== 'inicio' && (
              <label className="nx-search">
                <Search size={14} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                />
              </label>
            )}
          </div>

          {tab === 'inicio' && !dancer && (
            <>
              <div className="nx-kpis">
                {[
                  ['Bailarines activos', String(active.length), 'en grupo', true],
                  ['Al día', String(active.filter((d) => d.month === 'Pagada').length), 'cuota cubierta', true],
                  ['Con deuda', String(active.filter((d) => d.month === 'Deuda' || d.month === 'Parcial').length), 'por cobrar', false],
                  ['Con saldo', String(active.filter((d) => d.month === 'Saldo').length), 'a favor', true],
                ].map(([label, value, delta, up]) => (
                  <button key={String(label)} type="button" className="nx-kpi nx-kpi-btn" onClick={() => openTab(label === 'Bailarines activos' ? 'bailarines' : 'caja')}>
                    <small>{label}</small>
                    <span className="nx-kpi-row"><strong>{value}</strong></span>
                    <span className={`nx-delta ${up ? 'up' : 'down'}`}>{delta}</span>
                  </button>
                ))}
              </div>
              <div className="nx-dash-grid">
                <div className="nx-panel">
                  <h4>Ingresos de caja vs gastos</h4>
                  <p>Últimos seis meses. Datos de ejemplo.</p>
                  <CashChart />
                  <span className="nx-legend">
                    <span><i style={{ background: '#c9a84c' }} />Caja</span>
                    <span><i style={{ background: '#e05252' }} />Gastos</span>
                  </span>
                </div>
                <div className="nx-panel">
                  <h4>Flujos de caja</h4>
                  <p>Entradas y salidas de octubre. Datos de ejemplo.</p>
                  {CASH_FLOWS.map((flow) => (
                    <button key={flow.id} type="button" className="nx-row nx-row-btn" onClick={() => openTab('caja')}>
                      <span className="nx-row-main">
                        <span className="nx-dot"><CreditCard size={14} /></span>
                        <span><b>{flow.concept}</b><span>{flow.when}</span></span>
                      </span>
                      <span className="nx-flow" data-kind={flow.kind}>
                        {flow.kind === 'Ingreso' ? '+' : '−'}{pesos(flow.amount)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'bailarines' && !dancer && (
            <div className="nx-table-wrap">
              <table className="nx-table">
                <thead>
                  <tr>
                    <th>Bailarín</th>
                    <th>Documento</th>
                    <th>Edad</th>
                    <th>Categoría</th>
                    <th>Grupo</th>
                    <th>Mes</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {dancers.map((d) => (
                    <tr key={d.id} onClick={() => setDancerId(d.id)}>
                      <td>{d.name}</td>
                      <td>{d.doc}</td>
                      <td>{d.age}</td>
                      <td>{d.category}</td>
                      <td>{d.group}</td>
                      <td><Badge label={d.month} /></td>
                      <td>{d.active ? 'Activo' : 'Inactivo'}</td>
                    </tr>
                  ))}
                  {dancers.length === 0 && (
                    <tr><td colSpan={7} className="nx-empty">Nadie coincide con esa búsqueda.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {dancer && (
            <div className="nx-detail">
              <div className="nx-detail-grid">
                {[
                  ['Documento', dancer.doc],
                  ['Edad', `${dancer.age} años`],
                  ['Categoría', dancer.category],
                  ['Grupo', dancer.group],
                  ['Teléfono', dancer.phone],
                  ['Estado', dancer.active ? 'Activo' : 'Inactivo'],
                  ['Mensualidad', formatCurrency(dancer.fee)],
                  ['Pagado', formatCurrency(dancer.paid)],
                ].map(([label, value]) => (
                  <div key={label}><small>{label}</small><b>{value}</b></div>
                ))}
              </div>
              <p>El valor de la cuota queda fijo al inscribir. Esto es una ficha de ejemplo, no abre el panel real.</p>
            </div>
          )}

          {tab === 'caja' && (
            <>
              <div className="nx-kpis nx-kpis-compact">
                <div className="nx-kpi"><small>A cobrar</small><strong>{formatCurrency(fees.reduce((s, d) => s + d.fee, 0))}</strong></div>
                <div className="nx-kpi"><small>Recaudado</small><strong>{formatCurrency(fees.reduce((s, d) => s + Math.min(d.paid, d.fee), 0))}</strong></div>
                <div className="nx-kpi"><small>Pendiente</small><strong>{formatCurrency(fees.reduce((s, d) => s + Math.max(0, d.fee - d.paid), 0))}</strong></div>
              </div>
              <div className="nx-table-wrap">
                <table className="nx-table">
                  <thead>
                    <tr>
                      <th>Bailarín</th>
                      <th>Grupo</th>
                      <th>Monto</th>
                      <th>Pagado</th>
                      <th>Pendiente</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fees.map((d) => (
                      <tr key={d.id} onClick={() => openDancer(d.id)}>
                        <td>{d.name}</td>
                        <td>{d.group}</td>
                        <td>{formatCurrency(d.fee)}</td>
                        <td>{formatCurrency(d.paid)}</td>
                        <td>{formatCurrency(Math.max(0, d.fee - d.paid))}</td>
                        <td><Badge label={d.month} /></td>
                      </tr>
                    ))}
                    {fees.length === 0 && <tr><td colSpan={6} className="nx-empty">Sin cuotas para esa búsqueda.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'eventos' && !event && (
            <div className="nx-event-grid">
              {events.map((ev) => (
                <button key={ev.id} type="button" className="nx-event" onClick={() => setEventId(ev.id)}>
                  <b>{ev.name}</b>
                  <span>{ev.date}</span>
                  <span>Full pass {formatCurrency(ev.pass)}</span>
                  <Badge label={ev.status} />
                </button>
              ))}
              {events.length === 0 && <p className="nx-empty">Ningún evento coincide.</p>}
            </div>
          )}

          {event && (
            <div className="nx-detail">
              <p>{event.note}</p>
              <p>Fecha {event.date} · Full pass {formatCurrency(event.pass)}</p>
              {event.categories.map((cat) => (
                <div key={cat.name} className="nx-cat">
                  <div className="nx-row">
                    <div><b>{cat.name}</b><span>{cat.price ? formatCurrency(cat.price) : 'Sin costo'}</span></div>
                  </div>
                  <p>{cat.dancers.join(' · ')}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'horarios' && !klass && (
            <div className="nx-week nx-week-live">
              {DAYS.map((day) => (
                <div key={day} className="nx-day">
                  <b>{day.slice(0, 3)}</b>
                  {classes.filter((c) => c.day === day).map((c) => (
                    <button key={c.id} type="button" onClick={() => setClassId(c.id)}>
                      {c.group}<br />{c.start}
                    </button>
                  ))}
                </div>
              ))}
              {classes.length === 0 && <p className="nx-empty">No hay clases con ese filtro.</p>}
            </div>
          )}

          {klass && (
            <div className="nx-detail">
              <div className="nx-detail-grid">
                {[
                  ['Día', klass.day],
                  ['Hora', `${klass.start} – ${klass.end}`],
                  ['Grupo', klass.group],
                  ['Lugar', klass.room],
                  ['Instructor', klass.instructor],
                ].map(([label, value]) => (
                  <div key={label}><small>{label}</small><b>{value}</b></div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
