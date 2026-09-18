/**
 * Eventos de la academia (festivales / competencias).
 * Independiente de mensualidades: no escribe en `payments` ni afecta el dashboard de caja.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { logAudit } from './audit.service'
import { toMillis } from '@/lib/utils/dates'
import type {
  StudioEvent,
  EventCategory,
  EventRegistration,
  EventPayment,
  EventStats,
  EventStatus,
  EventPaymentConcept,
  EventRegistrationStatus,
} from '@/types'

function snapToEntity<T>(snap: { id: string; data: () => Record<string, unknown> }): T {
  return { id: snap.id, ...snap.data() } as T
}

function registrationStatus(paid: number, due: number): EventRegistrationStatus {
  if (paid <= 0) return 'pending'
  if (paid >= due) return 'paid'
  return 'partial'
}

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  finished: 'Finalizado',
}

export const CONCEPT_LABEL: Record<EventPaymentConcept, string> = {
  full_pass: 'Full Pass',
  category: 'Categoría',
  other: 'Otro',
}

export const REG_STATUS_LABEL: Record<EventRegistrationStatus, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagado',
}

export async function getEvents(): Promise<StudioEvent[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.EVENTS))
  return snap.docs
    .map(d => snapToEntity<StudioEvent>(d))
    .sort((a, b) => toMillis(b.eventDate) - toMillis(a.eventDate))
}

export async function getEventById(id: string): Promise<StudioEvent | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.EVENTS, id))
  if (!snap.exists()) return null
  return snapToEntity<StudioEvent>(snap)
}

export async function createEvent(
  data: { name: string; eventDate: Date; fullPassPrice: number; status: EventStatus; notes?: string },
  actor: { id: string; name: string },
): Promise<string> {
  if (!data.name.trim()) throw new Error('El nombre es obligatorio')
  if (!data.eventDate || Number.isNaN(data.eventDate.getTime())) throw new Error('Fecha inválida')
  if (data.fullPassPrice < 0) throw new Error('El Full Pass no puede ser negativo')

  const ref = await addDoc(collection(db, COLLECTIONS.EVENTS), {
    name: data.name.trim(),
    eventDate: Timestamp.fromDate(data.eventDate),
    fullPassPrice: data.fullPassPrice,
    status: data.status,
    notes: data.notes?.trim() ?? '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await logAudit(actor.id, actor.name, 'event.create', 'events', ref.id, null, { name: data.name })
  return ref.id
}

export async function updateEvent(
  id: string,
  data: Partial<{ name: string; eventDate: Date; fullPassPrice: number; status: EventStatus; notes: string }>,
  actor: { id: string; name: string },
): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() }
  if (data.name != null) patch.name = data.name.trim()
  if (data.eventDate) {
    if (Number.isNaN(data.eventDate.getTime())) throw new Error('Fecha inválida')
    patch.eventDate = Timestamp.fromDate(data.eventDate)
  }
  if (data.fullPassPrice != null) {
    if (data.fullPassPrice < 0) throw new Error('El Full Pass no puede ser negativo')
    patch.fullPassPrice = data.fullPassPrice
  }
  if (data.status) patch.status = data.status
  if (data.notes != null) patch.notes = data.notes
  await updateDoc(doc(db, COLLECTIONS.EVENTS, id), patch)
  await logAudit(actor.id, actor.name, 'event.update', 'events', id, null, patch)
}

export async function getEventCategories(eventId: string): Promise<EventCategory[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.EVENT_CATEGORIES), where('eventId', '==', eventId)),
  )
  return snap.docs
    .map(d => snapToEntity<EventCategory>(d))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export async function createEventCategory(
  eventId: string,
  data: { name: string; price: number; status?: EventCategory['status'] },
  actor: { id: string; name: string },
): Promise<string> {
  const event = await getEventById(eventId)
  if (!event) throw new Error('Evento no encontrado')
  if (!data.name.trim()) throw new Error('El nombre es obligatorio')
  if (data.price < 0) throw new Error('El precio no puede ser negativo')

  const ref = await addDoc(collection(db, COLLECTIONS.EVENT_CATEGORIES), {
    eventId,
    name: data.name.trim(),
    price: data.price,
    status: data.status ?? 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await logAudit(actor.id, actor.name, 'eventCategory.create', 'eventCategories', ref.id, null, { eventId, name: data.name })
  return ref.id
}

export async function updateEventCategory(
  id: string,
  data: Partial<{ name: string; price: number; status: EventCategory['status'] }>,
): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() }
  if (data.name != null) patch.name = data.name.trim()
  if (data.price != null) {
    if (data.price < 0) throw new Error('El precio no puede ser negativo')
    patch.price = data.price
  }
  if (data.status) patch.status = data.status
  await updateDoc(doc(db, COLLECTIONS.EVENT_CATEGORIES, id), patch)
}

export async function getEventRegistrations(eventId: string): Promise<EventRegistration[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.EVENT_REGISTRATIONS), where('eventId', '==', eventId)),
  )
  return snap.docs
    .map(d => snapToEntity<EventRegistration>(d))
    .sort((a, b) => (a.dancerName ?? '').localeCompare(b.dancerName ?? '', 'es'))
}

export async function getRegistrationsByDancer(dancerId: string, eventId?: string): Promise<EventRegistration[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.EVENT_REGISTRATIONS), where('dancerId', '==', dancerId)),
  )
  return snap.docs
    .map(d => snapToEntity<EventRegistration>(d))
    .filter(r => !eventId || r.eventId === eventId)
}

export async function createEventRegistration(
  input: {
    eventId: string
    dancerId: string
    dancerName: string
    categoryId: string
  },
  actor: { id: string; name: string },
): Promise<string> {
  const event = await getEventById(input.eventId)
  if (!event) throw new Error('Evento no encontrado')
  if (event.status !== 'active') throw new Error('El evento no está activo')

  const catSnap = await getDoc(doc(db, COLLECTIONS.EVENT_CATEGORIES, input.categoryId))
  if (!catSnap.exists()) throw new Error('Categoría no encontrada')
  const category = snapToEntity<EventCategory>(catSnap)
  if (category.eventId !== input.eventId) throw new Error('La categoría no pertenece a este evento')
  if (category.status !== 'active') throw new Error('La categoría está inactiva')

  const existing = await getEventRegistrations(input.eventId)
  const duplicate = existing.find(r => r.dancerId === input.dancerId && r.categoryId === input.categoryId)
  if (duplicate) throw new Error('Este bailarín ya está inscrito en esa categoría')

  const alreadyInEvent = existing.some(r => r.dancerId === input.dancerId)
  const fullPassAmount = alreadyInEvent ? 0 : event.fullPassPrice
  const categoryPrice = category.price
  const totalDue = categoryPrice + fullPassAmount

  const ref = await addDoc(collection(db, COLLECTIONS.EVENT_REGISTRATIONS), {
    eventId: input.eventId,
    eventName: event.name,
    dancerId: input.dancerId,
    dancerName: input.dancerName,
    categoryId: category.id,
    categoryName: category.name,
    categoryPrice,
    fullPassAmount,
    totalDue,
    amountPaid: 0,
    status: 'pending' as EventRegistrationStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await logAudit(actor.id, actor.name, 'eventRegistration.create', 'eventRegistrations', ref.id, null, {
    dancerId: input.dancerId,
    categoryId: input.categoryId,
  })
  return ref.id
}

export async function getEventPayments(eventId?: string): Promise<EventPayment[]> {
  const snap = eventId
    ? await getDocs(query(collection(db, COLLECTIONS.EVENT_PAYMENTS), where('eventId', '==', eventId)))
    : await getDocs(collection(db, COLLECTIONS.EVENT_PAYMENTS))
  return snap.docs
    .map(d => snapToEntity<EventPayment>(d))
    .sort((a, b) => toMillis(b.paymentDate) - toMillis(a.paymentDate))
}

export async function registerEventPayment(
  input: {
    registrationId: string
    concept: EventPaymentConcept
    amount: number
    paymentDate: Date
    paymentMethodId: string
    paymentMethodName: string
    notes?: string
  },
  actor: { id: string; name: string },
): Promise<string> {
  if (!input.registrationId) throw new Error('Selecciona una inscripción')
  if (!(input.amount > 0)) throw new Error('El valor debe ser mayor a 0')
  if (!input.paymentDate || Number.isNaN(input.paymentDate.getTime())) throw new Error('Fecha inválida')
  if (!input.paymentMethodId) throw new Error('Selecciona un método de pago')
  if (!input.concept) throw new Error('Selecciona un concepto')

  const regSnap = await getDoc(doc(db, COLLECTIONS.EVENT_REGISTRATIONS, input.registrationId))
  if (!regSnap.exists()) throw new Error('Inscripción no encontrada')
  const registration = snapToEntity<EventRegistration>(regSnap)

  const remaining = Math.max(0, registration.totalDue - registration.amountPaid)
  if (input.amount > remaining + 0.5) {
    throw new Error(`El pago supera el saldo pendiente (${remaining})`)
  }

  const newPaid = registration.amountPaid + input.amount
  const newStatus = registrationStatus(newPaid, registration.totalDue)

  const ref = await addDoc(collection(db, COLLECTIONS.EVENT_PAYMENTS), {
    dancerId: registration.dancerId,
    dancerName: registration.dancerName ?? '',
    eventId: registration.eventId,
    eventName: registration.eventName ?? '',
    registrationId: registration.id,
    categoryId: registration.categoryId,
    categoryName: registration.categoryName ?? '',
    concept: input.concept,
    amount: input.amount,
    paymentDate: Timestamp.fromDate(input.paymentDate),
    paymentMethodId: input.paymentMethodId,
    paymentMethodName: input.paymentMethodName,
    notes: input.notes?.trim() ?? '',
    registeredById: actor.id,
    registeredByName: actor.name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await updateDoc(doc(db, COLLECTIONS.EVENT_REGISTRATIONS, registration.id), {
    amountPaid: newPaid,
    status: newStatus,
    updatedAt: serverTimestamp(),
  })

  await logAudit(actor.id, actor.name, 'eventPayment.create', 'eventPayments', ref.id, null, {
    amount: input.amount,
    registrationId: registration.id,
  })
  return ref.id
}

export async function getEventStats(eventId: string): Promise<EventStats> {
  const regs = await getEventRegistrations(eventId)
  const byDancer = new Map<string, EventRegistration[]>()
  for (const r of regs) {
    const list = byDancer.get(r.dancerId) ?? []
    list.push(r)
    byDancer.set(r.dancerId, list)
  }

  let paidDancers = 0
  let pendingDancers = 0
  let collected = 0
  let outstanding = 0

  byDancer.forEach(list => {
    const due = list.reduce((s, r) => s + r.totalDue, 0)
    const paid = list.reduce((s, r) => s + r.amountPaid, 0)
    collected += paid
    outstanding += Math.max(0, due - paid)
    if (due > 0 && paid >= due) paidDancers++
    else pendingDancers++
  })

  return {
    registeredDancers: byDancer.size,
    paidDancers,
    pendingDancers,
    collected,
    outstanding,
    registrations: regs.length,
  }
}
