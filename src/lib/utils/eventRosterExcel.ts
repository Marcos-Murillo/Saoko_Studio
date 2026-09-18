import { getEventRegistrations, REG_STATUS_LABEL } from '@/lib/services/event.service'
import { getDancers } from '@/lib/services/dancer.service'
import { downloadXlsxBook } from '@/lib/utils/exportExcel'
import { formatDate, getAge } from '@/lib/utils/dates'
import type { EventRegistration, StudioEvent } from '@/types'

function slug(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'evento'
}

function overallStatus(regs: EventRegistration[]) {
  if (regs.every(r => r.status === 'paid')) return REG_STATUS_LABEL.paid
  if (regs.some(r => r.status === 'partial' || r.amountPaid > 0)) return REG_STATUS_LABEL.partial
  return REG_STATUS_LABEL.pending
}

export async function downloadEventRosterExcel(event: StudioEvent) {
  const [registrations, dancers] = await Promise.all([
    getEventRegistrations(event.id),
    getDancers(false),
  ])
  if (registrations.length === 0) {
    throw new Error('Este evento aún no tiene inscripciones')
  }

  const dancerById = new Map(dancers.map(d => [d.id, d]))
  const byDancer = new Map<string, EventRegistration[]>()
  for (const r of registrations) {
    const list = byDancer.get(r.dancerId) ?? []
    list.push(r)
    byDancer.set(r.dancerId, list)
  }

  const inscritos = [...byDancer.entries()].map(([, regs]) => {
    const first = regs[0]
    const dancer = dancerById.get(first.dancerId)
    const categories = [...new Set(regs.map(r => r.categoryName ?? '').filter(Boolean))]
    return {
      Nombre: dancer?.fullName || first.dancerName || '',
      Documento: dancer?.documentNumber ?? '',
      Telefono: dancer?.phone ?? '',
      Correo: dancer?.email ?? '',
      FechaNacimiento: dancer?.birthDate ? formatDate(dancer.birthDate) : '',
      Edad: dancer?.birthDate ? getAge(dancer.birthDate) : '',
      Direccion: dancer?.address ?? '',
      Barrio: dancer?.neighborhood ?? '',
      Comuna: dancer?.commune ?? '',
      EPS: dancer?.eps ?? '',
      TipoSangre: dancer?.bloodType ?? '',
      Grupo: dancer?.currentGroupName ?? '',
      CategoriaAcademia: dancer?.categoryName ?? '',
      CategoriasEvento: categories.join(', '),
      EstadoPago: overallStatus(regs),
    }
  }).sort((a, b) => a.Nombre.localeCompare(b.Nombre, 'es'))

  const porCategoria = registrations.map(r => {
    const dancer = dancerById.get(r.dancerId)
    return {
      Nombre: dancer?.fullName || r.dancerName || '',
      Documento: dancer?.documentNumber ?? '',
      Telefono: dancer?.phone ?? '',
      Correo: dancer?.email ?? '',
      Categoria: r.categoryName ?? '',
      EstadoPago: REG_STATUS_LABEL[r.status] ?? r.status,
    }
  }).sort((a, b) =>
    a.Categoria.localeCompare(b.Categoria, 'es') || a.Nombre.localeCompare(b.Nombre, 'es'),
  )

  downloadXlsxBook(`inscritos-${slug(event.name)}`, [
    { name: 'Inscritos', rows: inscritos },
    { name: 'Por categoria', rows: porCategoria },
  ])
}
