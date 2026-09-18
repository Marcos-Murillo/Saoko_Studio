'use client'
import { useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, UserX, UserCheck, Phone, Mail, MapPin, Heart, Calendar, DollarSign, History, UserPlus, ArrowLeft, Download, Camera } from 'lucide-react'
import { getDancerById, deactivateDancer, reactivateDancer, getDancerGuardians, updateDancer } from '@/lib/services/dancer.service'
import { getDancerCurrentMemberships, getDancerMemberships } from '@/lib/services/group.service'
import { getDancerCredit } from '@/lib/services/credit.service'
import { ActiveBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { useToast } from '@/components/shared/Toast'
import { formatDate, getAge } from '@/lib/utils/dates'
import { formatCurrency } from '@/lib/utils/currency'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { BTN } from '@/components/shared/buttonStyles'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/lib/auth/AuthContext'
import { uploadDancerPhoto } from '@/lib/firebase/storage'
import { downloadSimplePdf } from '@/lib/utils/exportPdf'
import { downloadXlsx } from '@/lib/utils/exportExcel'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Dancer, DancerGuardian, GroupMembership, DancerCredit } from '@/types'

import { LinkButton } from '@/components/shared/LinkButton'

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <Icon size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--muted-foreground)' }} />
      <span className="flex-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
      <span className="text-sm font-medium text-right" style={{ color: 'var(--foreground)', maxWidth: '55%' }}>{value}</span>
    </div>
  )
}

export default function DancerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router  = useRouter()
  const toast   = useToast()
  const { adminUser } = useAuth()
  const [dancer,    setDancer]    = useState<Dancer | null>(null)
  const [guardians, setGuardians] = useState<DancerGuardian[]>([])
  const [memberships, setMemberships] = useState<GroupMembership[]>([])
  const [current,   setCurrent]   = useState<GroupMembership[]>([])
  const [credit,    setCredit]    = useState<DancerCredit | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [confirm,   setConfirm]   = useState(false)

  const load = async () => {
    const [d, g, m, cm, cr] = await Promise.all([
      getDancerById(id), getDancerGuardians(id),
      getDancerMemberships(id), getDancerCurrentMemberships(id),
      getDancerCredit(id),
    ])
    setDancer(d); setGuardians(g); setMemberships(m); setCurrent(cm); setCredit(cr)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const toggleActive = async () => {
    if (!dancer) return
    dancer.isActive
      ? await deactivateDancer(id, adminUser ? { id: adminUser.id, name: adminUser.name } : undefined)
      : await reactivateDancer(id)
    toast(dancer.isActive ? 'Bailarín desactivado' : 'Bailarín reactivado')
    setConfirm(false); load()
  }

  if (loading) return <PageLoader />
  if (!dancer)  return <p style={{ color: 'var(--muted-foreground)' }}>No encontrado.</p>

  return (
    <div className="flex flex-col gap-6 max-w-[1100px]">
      {/* Back */}
      <button onClick={() => router.back()}
        className="flex items-center gap-2 text-sm w-fit"
        style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}>
        <ArrowLeft size={14} /> Volver
      </button>

      {/* Hero card */}
      <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-5">
              <Avatar style={{ width: 64, height: 64 }}>
                {dancer.photoUrl && <AvatarImage src={dancer.photoUrl} alt={dancer.fullName} />}
                <AvatarFallback
                  style={{ background: 'rgba(201,168,76,.14)', color: 'var(--gold)', fontSize: '1.5rem', fontWeight: 700 }}>
                  {dancer.fullName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{dancer.fullName}</h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <ActiveBadge isActive={dancer.isActive} />
                  <Switch
                    checked={dancer.isActive}
                    onCheckedChange={() => setConfirm(true)}
                    className="data-checked:bg-[#4caf7d]"
                  />
                  {dancer.categoryName && (
                    <Badge variant="outline" style={{ fontSize: '0.72rem', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                      {dancer.categoryName}
                    </Badge>
                  )}
                  {dancer.birthDate && (
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{getAge(dancer.birthDate)} años</span>
                  )}
                  {(credit?.balance ?? 0) > 0 && (
                    <Badge variant="outline" style={{ color: '#4a90d9', borderColor: 'rgba(74,144,217,.35)', background: 'rgba(74,144,217,.1)', fontSize: '0.72rem' }}>
                      Saldo a favor: {formatCurrency(credit!.balance)}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {current.map(m => (
                    <Badge key={m.id} style={{ background: 'rgba(201,168,76,.14)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,.25)', fontSize: '0.75rem' }}>
                      {m.groupName}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs px-3 py-1.5 rounded-lg cursor-pointer" style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                <Camera size={14} className="inline mr-1" />Foto
                <input type="file" accept="image/*" className="hidden" onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    const url = await uploadDancerPhoto(id, file)
                    await updateDancer(id, { photoUrl: url })
                    toast('Foto actualizada')
                    load()
                  } catch { toast('No se pudo subir la foto', 'error') }
                }} />
              </label>
              <Button variant="outline" size="sm" onClick={() => {
                downloadSimplePdf(`ficha-${dancer.documentNumber || dancer.id}`, dancer.fullName, [
                  `Documento: ${dancer.documentNumber}`,
                  `Nacimiento: ${formatDate(dancer.birthDate)} · ${getAge(dancer.birthDate)} años`,
                  `Teléfono: ${dancer.phone || '—'} · Correo: ${dancer.email || '—'}`,
                  `Dirección: ${dancer.address || '—'} · ${dancer.neighborhood || ''} · Comuna ${dancer.commune || '—'}`,
                  `EPS: ${dancer.eps || '—'} · RH: ${dancer.bloodType || '—'}`,
                  `Grupos: ${current.map(m => m.groupName).join(', ') || 'Sin grupo'}`,
                  `Deuda/crédito: saldo a favor ${formatCurrency(credit?.balance ?? 0)}`,
                  `Acudientes: ${guardians.map(g => `${g.guardianName} (${g.relationship})`).join(', ') || 'Ninguno'}`,
                ])
              }} style={BTN.pdf}>
                <Download size={14} className="mr-1" />PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadXlsx(`ficha-${dancer.documentNumber || dancer.id}`, [{
                Nombre: dancer.fullName, Documento: dancer.documentNumber, Telefono: dancer.phone,
                Correo: dancer.email, Grupos: current.map(m => m.groupName).join(', '),
                EPS: dancer.eps, RH: dancer.bloodType,
              }])} style={BTN.excel}>
                Excel
              </Button>
              <LinkButton href={`/dancers/${id}/financial`} variant="outline" size="sm">
                <DollarSign size={14} />Financiero
              </LinkButton>
              <LinkButton href={`/dancers/${id}/edit`} variant="outline" size="sm">
                <Pencil size={14} />Editar
              </LinkButton>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Información Personal</CardTitle></CardHeader>
          <Separator style={{ background: 'var(--border)' }} />
          <CardContent className="pt-4">
            <InfoRow icon={Calendar} label="Cédula"              value={dancer.documentNumber} />
            <InfoRow icon={Calendar} label="Fecha de nacimiento" value={formatDate(dancer.birthDate)} />
            <InfoRow icon={Phone}    label="Teléfono"            value={dancer.phone} />
            <InfoRow icon={Mail}     label="Correo"              value={dancer.email} />
            <InfoRow icon={MapPin}   label="Dirección"           value={dancer.address} />
            <InfoRow icon={MapPin}   label="Barrio"              value={dancer.neighborhood} />
            <InfoRow icon={MapPin}   label="Comuna"              value={dancer.commune} />
          </CardContent>
        </Card>

        <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Datos Médicos</CardTitle></CardHeader>
          <Separator style={{ background: 'var(--border)' }} />
          <CardContent className="pt-4">
            <InfoRow icon={Heart}  label="EPS"            value={dancer.eps} />
            <InfoRow icon={MapPin} label="Lugar atención" value={dancer.epsLocation} />
            <InfoRow icon={Heart}  label="Grupo sanguíneo" value={dancer.bloodType} />
            {dancer.notes && (
              <div className="mt-4 p-3 rounded-lg" style={{ background: 'var(--accent)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>Observaciones</p>
                <p className="text-sm" style={{ color: 'var(--foreground)' }}>{dancer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Acudientes</CardTitle>
            <LinkButton href={`/dancers/${id}/guardians`} variant="outline" size="sm"
              style={{ fontSize: '0.78rem' }}>
              <UserPlus size={12} />Gestionar
            </LinkButton>
          </CardHeader>
          <Separator style={{ background: 'var(--border)' }} />
          <CardContent className="pt-4">
            {guardians.length === 0
              ? <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Sin acudientes registrados</p>
              : guardians.map(g => (
                <div key={g.id} className="py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{g.guardianName}</p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{g.relationship}</p>
                </div>
              ))
            }
          </CardContent>
        </Card>

        <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Historial de Grupos</CardTitle>
            <LinkButton href={`/dancers/${id}/history`} variant="outline" size="sm"
              style={{ fontSize: '0.78rem' }}>
              <History size={12} />Ver todo
            </LinkButton>
          </CardHeader>
          <Separator style={{ background: 'var(--border)' }} />
          <CardContent className="pt-4">
            {memberships.slice(0, 4).map(m => (
              <div key={m.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{m.groupName}</p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {formatDate(m.startDate)} {m.endDate ? `— ${formatDate(m.endDate)}` : '— presente'}
                  </p>
                </div>
                {m.isCurrent && <Badge variant="outline" style={{ color: '#4caf7d', borderColor: 'rgba(76,175,125,.35)', background: 'rgba(76,175,125,.1)', fontSize: '0.7rem' }}>Actual</Badge>}
              </div>
            ))}
            {memberships.length === 0 && <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Sin grupos</p>}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <LinkButton href={`/dancers/${id}/financial`} variant="primary">
          <DollarSign size={15} />Ver historial financiero
        </LinkButton>
        <LinkButton href="/accounting/payments/new" variant="outline">
          <DollarSign size={15} />Registrar pago
        </LinkButton>
      </div>

      <ConfirmDialog
        open={confirm}
        title={dancer.isActive ? 'Desactivar bailarín' : 'Reactivar bailarín'}
        description={dancer.isActive
          ? `¿Desactivar a ${dancer.fullName}? No generará nuevas mensualidades pero su historial se conserva.`
          : `¿Reactivar a ${dancer.fullName}? Volverá a generar mensualidades automáticamente.`}
        confirmLabel={dancer.isActive ? 'Desactivar' : 'Reactivar'}
        variant={dancer.isActive ? 'danger' : 'default'}
        onConfirm={toggleActive}
        onCancel={() => setConfirm(false)}
      />
    </div>
  )
}
