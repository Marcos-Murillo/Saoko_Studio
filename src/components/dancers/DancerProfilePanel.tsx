'use client'
import { useEffect, useState } from 'react'
import { Phone, Mail, MapPin, Heart, Calendar, DollarSign } from 'lucide-react'
import { getDancerById, getDancerGuardians } from '@/lib/services/dancer.service'
import { getDancerCurrentMemberships } from '@/lib/services/group.service'
import { getDancerCredit } from '@/lib/services/credit.service'
import { ActiveBadge } from '@/components/shared/StatusBadge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatDate, getAge } from '@/lib/utils/dates'
import { formatCurrency } from '@/lib/utils/currency'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Dancer, DancerGuardian, GroupMembership, DancerCredit } from '@/types'

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
      <Icon size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--muted-foreground)' }} />
      <span className="flex-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
      <span className="text-sm font-medium text-right break-all" style={{ color: 'var(--foreground)', maxWidth: '62%' }}>{value}</span>
    </div>
  )
}

export function DancerProfilePanel({
  dancerId,
  onOpenFinancial,
}: {
  dancerId: string
  onOpenFinancial: () => void
}) {
  const [dancer, setDancer] = useState<Dancer | null>(null)
  const [guardians, setGuardians] = useState<DancerGuardian[]>([])
  const [current, setCurrent] = useState<GroupMembership[]>([])
  const [credit, setCredit] = useState<DancerCredit | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getDancerById(dancerId),
      getDancerGuardians(dancerId),
      getDancerCurrentMemberships(dancerId),
      getDancerCredit(dancerId),
    ]).then(([d, g, cm, cr]) => {
      setDancer(d); setGuardians(g); setCurrent(cm); setCredit(cr); setLoading(false)
    })
  }, [dancerId])

  if (loading) return <PageLoader />
  if (!dancer) return <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No encontrado.</p>

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar style={{ width: 56, height: 56 }}>
          {dancer.photoUrl && <AvatarImage src={dancer.photoUrl} alt={dancer.fullName} />}
          <AvatarFallback style={{ background: 'rgba(201,168,76,.14)', color: 'var(--gold)', fontSize: '1.25rem', fontWeight: 700 }}>
            {dancer.fullName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>{dancer.fullName}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <ActiveBadge isActive={dancer.isActive} />
            {dancer.birthDate && (
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{getAge(dancer.birthDate)} años</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {current.map(m => (
          <Badge key={m.id} style={{ background: 'var(--gold-muted)', color: 'var(--gold)', border: 'none' }}>
            {m.groupName}
          </Badge>
        ))}
      </div>

      <Button
        type="button"
        onClick={onOpenFinancial}
        className="w-full justify-start gap-2"
        style={{ background: 'var(--gold-muted)', color: 'var(--gold)', border: 'none' }}
      >
        <DollarSign size={15} />
        Ver historial financiero
      </Button>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--gold)' }}>Datos</p>
        <InfoRow icon={Calendar} label="Nacimiento" value={formatDate(dancer.birthDate)} />
        <InfoRow icon={Phone} label="Teléfono" value={dancer.phone} />
        <InfoRow icon={Mail} label="Correo" value={dancer.email} />
        <InfoRow icon={MapPin} label="Dirección" value={[dancer.address, dancer.neighborhood, dancer.commune && `Comuna ${dancer.commune}`].filter(Boolean).join(' · ')} />
        <InfoRow icon={Heart} label="EPS / RH" value={[dancer.eps, dancer.bloodType].filter(Boolean).join(' · ')} />
        {(credit?.balance ?? 0) > 0 && (
          <InfoRow icon={DollarSign} label="Saldo a favor" value={formatCurrency(credit!.balance)} />
        )}
      </div>

      {guardians.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--gold)' }}>Acudientes</p>
          {guardians.map(g => (
            <p key={g.id} className="text-sm py-1" style={{ color: 'var(--foreground)' }}>
              {g.guardianName} <span style={{ color: 'var(--muted-foreground)' }}>({g.relationship})</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
