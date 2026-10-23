'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  CalendarDays, Eye, EyeOff, Home, LogOut, MapPin, Receipt, UserRound, UsersRound,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate, formatMonth } from '@/lib/utils/dates'
import type { FeeStatus } from '@/types'
import type { PortalClass, PortalGroup, StudentPortalData, StudentProfile } from '@/lib/services/portal.service'
import { StudentProfileForm } from '@/components/portal/StudentProfileForm'
import { GroupEnrollMenu } from '@/components/groups/GroupEnrollMenu'

type Tab = 'inicio' | 'grupos' | 'horario' | 'pagos' | 'perfil'

const MARK = '/LOGOS/N%20SIN%20FONDO.png'

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'grupos', label: 'Grupos', icon: UsersRound },
  { id: 'horario', label: 'Horario', icon: CalendarDays },
  { id: 'pagos', label: 'Pagos', icon: Receipt },
  { id: 'perfil', label: 'Perfil', icon: UserRound },
]

const FEE_LABEL: Record<FeeStatus | 'none', { label: string; bg: string; color: string }> = {
  paid: { label: 'Pagada', bg: 'rgba(76,175,125,.16)', color: '#4caf7d' },
  pending: { label: 'Pendiente', bg: 'rgba(224,82,82,.16)', color: '#e05252' },
  partial: { label: 'Abono', bg: 'rgba(232,160,48,.16)', color: '#e8a030' },
  forgiven: { label: 'Condonada', bg: 'rgba(160,144,112,.14)', color: '#a09070' },
  none: { label: 'Sin cobro', bg: 'rgba(201,168,76,.14)', color: '#c9a84c' },
}

const cardClass = 'rounded-3xl border border-[var(--border)] bg-[var(--card)]'

function monthTitle(year: number, month: number) {
  const label = formatMonth(year, month)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName
}

function todayName() {
  const label = format(new Date(), 'EEEE', { locale: es })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function money(value: number, hidden: boolean) {
  return hidden ? '$ ••••••' : formatCurrency(value)
}

export function StudentHome({
  data,
  onSignOut,
  onSaveProfile,
  onEnrollGroups,
  studioHref,
}: {
  data: StudentPortalData
  onSignOut: () => void
  onSaveProfile: (input: StudentProfile) => Promise<void>
  onEnrollGroups: (groupIds: string[]) => Promise<void>
  studioHref?: string
}) {
  const [tab, setTab] = useState<Tab>('inicio')
  const [hidden, setHidden] = useState(false)
  const today = todayName()
  const month = monthTitle(data.year, data.month)
  const nextClass = useMemo(() => upcomingClass(data.classes, today), [data.classes, today])
  const title = tab === 'inicio' ? firstName(data.fullName) : TABS.find(item => item.id === tab)?.label

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)] md:flex">
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] px-4 py-6 md:flex">
        <div className="flex items-center gap-3 px-2">
          <img src={MARK} alt="" className="h-9 w-9 object-contain" />
          <div className="leading-none">
            <p className="text-[0.95rem] font-bold text-[var(--gold)]">Nexora</p>
            <p className="mt-1 text-[0.62rem] uppercase tracking-widest text-[#5c5045]">Saoko</p>
          </div>
        </div>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Secciones">
          {TABS.map(item => {
            const Icon = item.icon
            const active = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className="flex h-11 items-center gap-3 rounded-full px-4 text-sm font-semibold"
                style={{
                  background: active ? 'var(--gold-muted)' : 'transparent',
                  color: active ? 'var(--gold)' : '#a09070',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>
        {studioHref && (
          <Link href={studioHref} className="mt-auto flex h-11 items-center gap-3 rounded-full px-4 text-sm font-semibold text-[var(--gold)]">
            Panel del estudio
          </Link>
        )}
        <button
          type="button"
          onClick={onSignOut}
          className={`${studioHref ? '' : 'mt-auto '}flex h-11 items-center gap-3 rounded-full px-4 text-sm font-semibold text-[#a09070]`}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <LogOut size={18} />
          Salir
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b border-[var(--border)] bg-[var(--sidebar)] px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5 md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={MARK} alt="" className="h-8 w-8 object-contain" />
              <p className="text-sm font-bold text-[var(--gold)]">Nexora</p>
            </div>
            <div className="flex items-center gap-3">
              {studioHref && (
                <Link href={studioHref} className="text-sm font-semibold text-[var(--gold)]">Panel</Link>
              )}
              <button type="button" onClick={onSignOut} className="text-sm font-semibold text-[#a09070]" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                Salir
              </button>
            </div>
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">
            {tab === 'inicio' ? 'Mi espacio' : month}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <ProfileMark photoUrl={data.photoUrl} name={data.fullName} onOpen={() => setTab('perfil')} />
            <h1 className="text-[1.75rem] font-bold leading-none tracking-tight">{title}</h1>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pt-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:gap-6 md:px-10 md:py-10 md:pb-12">
          <div className="hidden items-end justify-between md:flex">
            <div className="flex items-center gap-4">
              <ProfileMark photoUrl={data.photoUrl} name={data.fullName} onOpen={() => setTab('perfil')} />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">
                  {tab === 'inicio' ? 'Mi espacio' : 'Nexora'}
                </p>
                <h1 className="mt-1 text-4xl font-bold tracking-tight">{title}</h1>
              </div>
            </div>
            <p className="text-sm text-[#a09070]">{month}</p>
          </div>

          {tab === 'perfil' && <StudentProfileForm profile={data.profile} onSave={onSaveProfile} />}

          {(tab === 'inicio' || tab === 'pagos') && (
            <section className={`grid gap-4 ${tab === 'inicio' ? 'md:grid-cols-[1.4fr_1fr]' : ''}`}>
              <BalanceCard data={data} month={month} hidden={hidden} onToggle={() => setHidden(value => !value)} />
              {tab === 'inicio' && <MonthAside data={data} month={month} hidden={hidden} />}
            </section>
          )}

          {tab !== 'perfil' && tab === 'inicio' && nextClass && <NextClassBanner item={nextClass} today={today} />}

          {tab === 'grupos' && (
            <GroupsBlock groups={data.groups} hidden={hidden} onEnrollGroups={onEnrollGroups} />
          )}

          {tab !== 'perfil' && (tab === 'inicio' || tab === 'horario') && (
            <ScheduleBlock classes={data.classes} today={today} />
          )}

          {tab !== 'perfil' && (tab === 'inicio' || tab === 'grupos') && <TeachersBlock teachers={data.teachers} />}

          {tab !== 'perfil' && (tab === 'inicio' || tab === 'pagos') && (
            <PaymentsBlock
              payments={tab === 'inicio' ? data.payments.slice(0, 3) : data.payments}
              fees={data.fees}
              showFees={tab === 'pagos'}
              credit={data.credit}
              totalDebt={data.totalDebt}
              hidden={hidden}
            />
          )}
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--sidebar-border)] bg-[var(--sidebar)] px-2 pt-2 md:hidden"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
          aria-label="Secciones"
        >
          <div className="grid grid-cols-5">
            {TABS.map(item => {
              const Icon = item.icon
              const active = tab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className="flex flex-col items-center gap-1 py-1 text-[11px] font-semibold"
                  style={{ color: active ? 'var(--gold)' : '#5c5045', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}

function ProfileMark({ photoUrl, name, onOpen }: { photoUrl: string | null; name: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Editar perfil"
      className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[rgba(201,168,76,.4)]"
      style={{ background: 'var(--accent)', padding: 0, cursor: 'pointer' }}
    >
      {photoUrl
        ? <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        : <span className="text-lg font-bold text-[var(--gold)]">{name.charAt(0).toUpperCase() || 'N'}</span>}
    </button>
  )
}

function BalanceCard({
  data, month, hidden, onToggle,
}: {
  data: StudentPortalData
  month: string
  hidden: boolean
  onToggle: () => void
}) {
  const headline = data.currentStatus === 'na'
    ? 'Sin cobro este mes'
    : data.currentStatus === 'paid'
      ? 'Estás al día'
      : 'Por pagar'
  const figure = data.currentStatus === 'na'
    ? money(data.expectedMonthly, hidden)
    : data.currentStatus === 'paid'
      ? 'Al día'
      : money(data.currentRemaining, hidden)

  return (
    <article
      className="rounded-3xl border p-6"
      style={{
        background: 'linear-gradient(145deg, rgba(201,168,76,.2), #141414 46%)',
        borderColor: 'rgba(201,168,76,.32)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-[#a09070]">Mensualidad de {month}</p>
        <button type="button" onClick={onToggle} aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'} className="text-[#a09070]" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <p className="mt-3 text-4xl font-bold tracking-tight text-[var(--gold-light)] md:text-5xl">
        {figure}
      </p>
      <p className="mt-2 text-sm text-[#a09070]">
        {headline}
        {data.currentStatus === 'partial' ? ` · abonaste ${money(data.currentPaid, hidden)}` : ''}
        {data.currentStatus === 'paid' ? ` · pagaste ${money(data.currentBilled, hidden)}` : ''}
        {data.currentStatus === 'na' && data.expectedMonthly > 0 ? ' · valor de tus grupos' : ''}
      </p>
      {data.olderDebt > 0 && (
        <p className="mt-4 rounded-2xl px-3 py-2 text-sm font-semibold" style={{ background: 'rgba(224,82,82,.14)', color: '#e05252' }}>
          También debes {money(data.olderDebt, hidden)} de meses anteriores
        </p>
      )}
    </article>
  )
}

function MonthAside({ data, month, hidden }: { data: StudentPortalData; month: string; hidden: boolean }) {
  return (
    <article className={`${cardClass} p-6`}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">{month}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">
        {data.groups.length === 0 ? 'Sin grupos' : `${data.groups.length} ${data.groups.length === 1 ? 'grupo' : 'grupos'}`}
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {data.groups.length === 0 && (
          <p className="text-sm text-[#a09070]">Cuando el estudio te inscriba, vas a ver aquí el valor y el estado.</p>
        )}
        {data.groups.map(group => (
          <div key={group.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{group.name}</p>
              <p className="text-xs text-[#a09070]">{group.teacher || 'Profesor por confirmar'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{group.chargesFee ? money(group.monthRemaining || group.monthlyFee, hidden) : 'Incluido'}</p>
              <StatusPill status={group.monthStatus} />
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

function GroupsBlock({
  groups, hidden, onEnrollGroups,
}: {
  groups: PortalGroup[]
  hidden: boolean
  onEnrollGroups: (groupIds: string[]) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [catalog, setCatalog] = useState<Array<{ id: string; name: string; monthlyFee: number; detail: string }>>([])
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [error, setError] = useState('')

  const openPicker = async () => {
    setError('')
    setLoadingList(true)
    setOpen(true)
    try {
      const { getGroups } = await import('@/lib/services/group.service')
      const list = await getGroups(true)
      const joined = new Set(groups.map(group => group.id))
      setCatalog(list.filter(group => !joined.has(group.id)).map(group => ({
        id: group.id,
        name: group.name,
        monthlyFee: group.monthlyFee,
        detail: [group.modalityName, group.levelName].filter(Boolean).join(' · '),
      })))
    } catch {
      setError('No pudimos cargar los grupos.')
    } finally {
      setLoadingList(false)
    }
  }

  const enroll = async () => {
    if (picked.length === 0) {
      setError('Elige al menos un grupo.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onEnrollGroups(picked)
      setPicked([])
      setOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar la inscripción.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="mb-4">
        <GroupEnrollMenu
          title={<h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">Tus grupos</h2>}
          buttonLabel="Inscribirme a grupo"
          buttonAlign="end"
          groups={catalog.map(group => ({ id: group.id, name: group.name, feeLabel: money(group.monthlyFee, hidden) }))}
          selected={picked}
          onToggle={id => setPicked(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])}
          open={open}
          onOpenChange={next => { setOpen(next); if (next) void openPicker() }}
          error={error}
          loading={loadingList}
          note="Elige el grupo o los grupos. La inscripción queda igual en el panel del estudio."
          emptyText="Ya estás en todos los grupos activos."
          disabled={busy}
          footer={(
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setPicked([]); setOpen(false) }} className="rounded-full px-4 py-2 text-xs font-semibold text-[#a09070]" style={{ background: 'transparent', border: '1px solid var(--border)', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="button" disabled={busy || picked.length === 0} onClick={enroll} className="rounded-full px-4 py-2 text-xs font-bold" style={{ background: 'linear-gradient(180deg, var(--gold-light), var(--gold))', color: '#0c0c0c', border: 'none', cursor: 'pointer', opacity: busy || picked.length === 0 ? 0.7 : 1 }}>
                {busy ? 'Inscribiendo...' : 'Confirmar inscripción'}
              </button>
            </div>
          )}
        />
      </div>
      {groups.length === 0 ? (
        <Empty text="Todavía no estás inscrito. Usa Inscribirme a grupo para elegir tu clase." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map(group => (
            <article key={group.id} className={`${cardClass} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">{group.name}</h3>
                  <p className="text-sm text-[#a09070]">{[group.modality, group.level].filter(Boolean).join(' · ') || 'Clase'}</p>
                </div>
                <StatusPill status={group.monthStatus} />
              </div>
              {group.chargesFee ? (
                <p className="mt-4 text-2xl font-bold tracking-tight text-[var(--gold-light)]">{money(group.monthlyFee, hidden)}<span className="text-sm font-medium text-[#a09070]"> / mes</span></p>
              ) : (
                <p className="mt-4 text-lg font-bold tracking-tight text-[var(--gold-light)]">Sin cobro adicional</p>
              )}
              <p className="mt-1 text-sm">Profesor: <strong>{group.teacher || 'por confirmar'}</strong></p>
              <div className="mt-3 flex flex-col gap-1">
                {group.classes.length === 0 && <p className="text-sm text-[#a09070]">Sin horario publicado.</p>}
                {group.classes.map(item => (
                  <p key={item.id} className="text-sm text-[#f0ead6]">{item.day} · {item.start}–{item.end}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function ScheduleBlock({ classes, today }: { classes: PortalClass[]; today: string }) {
  const days = [...new Set(classes.map(item => item.day))]
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">Horario</h2>
      {classes.length === 0 ? (
        <Empty text="Todavía no hay clases en tu horario." />
      ) : (
        <div className={`${cardClass} overflow-hidden`}>
          {days.map(day => (
            <div key={day} className="border-b border-[var(--border)] last:border-b-0">
              <p className="px-5 pt-4 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: day === today ? 'var(--gold)' : '#a09070' }}>
                {day}{day === today ? ' · hoy' : ''}
              </p>
              {classes.filter(item => item.day === day).map(item => (
                <div key={item.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-24 shrink-0">
                    <p className="text-sm font-bold text-[var(--gold-light)]">{item.start}</p>
                    <p className="text-xs text-[#a09070]">{item.end}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{item.groupName}</p>
                    <p className="truncate text-sm text-[#a09070]">{item.teacher || 'Profesor por confirmar'}</p>
                  </div>
                  {item.location && (
                    <p className="hidden items-center gap-1 text-xs text-[#a09070] sm:flex">
                      <MapPin size={12} /> {item.location}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function TeachersBlock({ teachers }: { teachers: StudentPortalData['teachers'] }) {
  if (teachers.length === 0) return null
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">Tus profesores</h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {teachers.map(teacher => (
          <article key={teacher.name} className={`${cardClass} min-w-[180px] flex-1 p-4`}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold" style={{ background: 'var(--gold-muted)', color: 'var(--gold)' }}>
              {teacher.name.charAt(0).toUpperCase()}
            </div>
            <p className="mt-3 font-bold">{teacher.name}</p>
            <p className="text-sm text-[#a09070]">{teacher.groups.join(', ')}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function PaymentsBlock({
  payments, fees, showFees, credit = 0, totalDebt = 0, hidden = false,
}: {
  payments: StudentPortalData['payments']
  fees: StudentPortalData['fees']
  showFees: boolean
  credit?: number
  totalDebt?: number
  hidden?: boolean
}) {
  return (
    <section className="flex flex-col gap-4">
      {showFees && (
        <div className="grid grid-cols-2 gap-3">
          <Mini label="Deuda total" value={money(totalDebt, hidden)} tone={totalDebt > 0 ? '#e05252' : '#4caf7d'} />
          <Mini label="Saldo a favor" value={money(credit, hidden)} tone="#c9a84c" />
        </div>
      )}
      {showFees && (
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">Mensualidades</h2>
          {fees.length === 0 ? <Empty text="Aún no hay mensualidades generadas a tu nombre." /> : (
            <div className={`${cardClass} overflow-hidden`}>
              {fees.map(fee => {
                const remaining = Math.max(0, fee.amount - fee.amountPaid)
                return (
                  <div key={fee.id} className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4 last:border-b-0">
                    <div className="min-w-0">
                      <p className="font-semibold capitalize">{monthTitle(fee.periodYear, fee.periodMonth)}</p>
                      <p className="truncate text-sm text-[#a09070]">{fee.groupName || 'Grupo'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{money(remaining > 0 ? remaining : fee.amount, hidden)}</p>
                      <StatusPill status={fee.status} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">Historial de pagos</h2>
        {payments.length === 0 ? <Empty text="Cuando registres un pago en el estudio, queda en este historial." /> : (
          <div className={`${cardClass} overflow-hidden`}>
            {payments.map(payment => (
              <div key={payment.id} className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4 last:border-b-0">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{payment.concept || 'Pago'}</p>
                  <p className="text-sm text-[#a09070]">{formatDate(payment.paymentDate)}{payment.paymentMethodName ? ` · ${payment.paymentMethodName}` : ''}</p>
                </div>
                <p className="font-bold text-[#4caf7d]">{money(payment.amount, hidden)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function NextClassBanner({ item, today }: { item: PortalClass; today: string }) {
  return (
    <article className={`${cardClass} p-5`}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">{item.day === today ? 'Tu próxima clase es hoy' : 'Próxima clase'}</p>
      <p className="mt-1 text-xl font-bold">{item.groupName}</p>
      <p className="text-sm text-[#a09070]">{item.day} · {item.start}–{item.end}{item.teacher ? ` · ${item.teacher}` : ''}</p>
    </article>
  )
}

function StatusPill({ status }: { status: FeeStatus | 'none' }) {
  const tone = FEE_LABEL[status]
  return (
    <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: tone.bg, color: tone.color }}>
      {tone.label}
    </span>
  )
}

function Mini({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <article className={`${cardClass} p-4`}>
      <p className="text-xs text-[#a09070]">{label}</p>
      <p className="mt-1 text-lg font-bold" style={{ color: tone }}>{value}</p>
    </article>
  )
}

function Empty({ text }: { text: string }) {
  return <p className={`${cardClass} px-5 py-6 text-sm text-[#a09070]`}>{text}</p>
}

function upcomingClass(classes: PortalClass[], today: string): PortalClass | null {
  if (classes.length === 0) return null
  const order = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  const start = order.indexOf(today)
  const sorted = [...classes].sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day) || a.start.localeCompare(b.start))
  return sorted.find(item => order.indexOf(item.day) >= start) || sorted[0]
}
