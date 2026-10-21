/**
 * Carga la base incompleta de Saoko 2026.
 *
 *   npx tsx scripts/migrate-excel.ts --dry-run
 *   npx tsx scripts/migrate-excel.ts
 *
 * No genera mensualidades. Dirección, barrio, comuna, RH, foto y acudientes
 * quedan vacíos para completarlos en la app.
 *
 * Credenciales: GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT
 * (JSON de la cuenta de servicio). El project id sale de .env.local.
 */

import * as fs from 'fs'
import * as path from 'path'
import XLSX from 'xlsx'
import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'

const EXCEL = process.argv.find(a => a.endsWith('.xlsx'))
  ?? 'C:\\Users\\usuario\\Downloads\\MARCOS\\base de datos incompleta.xlsx'
const DRY = process.argv.includes('--dry-run')

function loadDotEnv(file: string) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (!process.env[k]) process.env[k] = v
  }
}

function norm(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function cleanName(s: string) {
  return s.replace(/\s+/g, ' ').trim()
}

function digits(s: string) {
  return s.replace(/\D/g, '')
}

function normEps(s: string) {
  const t = s.replace(/\s+/g, ' ').trim()
  const map: Record<string, string> = {
    sura: 'Sura',
    'nueva eps': 'Nueva EPS',
    comfandi: 'Comfandi',
    coopsalud: 'Coopsalud',
    coosalud: 'Coosalud',
    emssanar: 'Emssanar',
    comfenalco: 'Comfenalco',
    sanitas: 'Sanitas',
    fomag: 'Fomag',
    sos: 'SOS',
    'salud total': 'Salud Total',
  }
  return map[norm(t)] ?? t
}

function normCity(s: string) {
  const map: Record<string, string> = {
    bogota: 'Bogotá',
    cali: 'Cali',
    palmira: 'Palmira',
    barbacoas: 'Barbacoas',
    pereira: 'Pereira',
  }
  const t = s.replace(/\s+/g, ' ').trim()
  return map[norm(t)] ?? t
}

function normGender(s: string) {
  const n = norm(s)
  if (n === 'femenino') return 'Femenino'
  if (n === 'masculino') return 'Masculino'
  return ''
}

function parseBirth(raw: string): Date {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!m) throw new Error(`Fecha no reconocida: ${raw}`)
  let a = Number(m[1])
  let b = Number(m[2])
  let y = Number(m[3])
  if (y < 100) y += 1900
  let day: number
  let month: number
  if (a > 12) { day = a; month = b }
  else if (b > 12) { month = a; day = b }
  else { day = a; month = b }
  const d = new Date(y, month - 1, day, 12, 0, 0, 0)
  if (d.getFullYear() !== y || d.getMonth() !== month - 1 || d.getDate() !== day) {
    throw new Error(`Fecha inválida: ${raw}`)
  }
  return d
}

const GROUP_DEFS: { name: string; modality: string; category: string; level: string | null; monthlyFee: number }[] = [
  { name: 'Primera Línea', modality: 'Salsa Caleña', category: 'Adulto', level: 'Primera Línea', monthlyFee: 100000 },
  { name: 'Segunda Línea', modality: 'Salsa Caleña', category: 'Adulto', level: 'Segunda Línea', monthlyFee: 120000 },
  { name: 'Juvenil Intermedio', modality: 'Salsa Caleña', category: 'Juvenil', level: null, monthlyFee: 100000 },
  { name: 'Juvenil Básico', modality: 'Salsa Caleña', category: 'Juvenil', level: null, monthlyFee: 120000 },
  { name: 'Infantil Intermedio', modality: 'Salsa Caleña', category: 'Infantil', level: null, monthlyFee: 120000 },
  { name: 'Infantil Básico', modality: 'Salsa Caleña', category: 'Infantil', level: null, monthlyFee: 120000 },
  { name: 'Contemporáneo', modality: 'Danza Contemporánea', category: 'Adulto', level: null, monthlyFee: 120000 },
]

function categoryForGroup(name: string) {
  const n = norm(name)
  if (n.startsWith('infantil')) return 'Infantil'
  if (n.startsWith('juvenil')) return 'Juvenil'
  return 'Adulto'
}

function assignRow(label: string): { groups: string[]; doble: boolean } {
  const n = norm(label)
  if (n === 'doble proceso') return { groups: ['Primera Línea', 'Segunda Línea'], doble: true }
  const found = GROUP_DEFS.find(g => norm(g.name) === n)
  if (!found) throw new Error(`Grupo no reconocido: ${label}`)
  return { groups: [found.name], doble: false }
}

type Person = {
  fullName: string
  documentNumber: string
  birthDate: Date
  city: string
  eps: string
  gender: string
  email: string
  phone: string
  groups: string[]
  doble: boolean
}

function readPeople(file: string): Person[] {
  const wb = XLSX.readFile(file)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }) as string[][]
  const headerIdx = aoa.findIndex(r => norm(String(r[3] ?? '')) === 'nombre')
  if (headerIdx < 0) throw new Error('No encontré la fila de encabezados')
  const byKey = new Map<string, Person>()

  for (const r of aoa.slice(headerIdx + 1)) {
    const grupo = String(r[2] ?? '').trim()
    const nombre = cleanName(String(r[3] ?? ''))
    if (!nombre) continue
    const assignment = assignRow(grupo)
    const documentNumber = digits(String(r[8] ?? ''))
    const birthDate = parseBirth(String(r[5] ?? ''))
    const incoming: Person = {
      fullName: nombre,
      documentNumber,
      birthDate,
      city: normCity(String(r[7] ?? '')),
      eps: normEps(String(r[9] ?? '')),
      gender: normGender(String(r[10] ?? '')),
      email: String(r[11] ?? '').trim().toLowerCase(),
      phone: digits(String(r[12] ?? '')),
      groups: assignment.groups,
      doble: assignment.doble,
    }
    const key = documentNumber ? `doc:${documentNumber}` : `name:${norm(nombre)}`
    const prev = byKey.get(key)
    if (!prev) {
      byKey.set(key, incoming)
      continue
    }
    prev.groups = [...new Set([...prev.groups, ...incoming.groups])]
    prev.doble = prev.doble || incoming.doble
    if (!prev.documentNumber && incoming.documentNumber) prev.documentNumber = incoming.documentNumber
    if (!prev.email && incoming.email) prev.email = incoming.email
    if (!prev.phone && incoming.phone) prev.phone = incoming.phone
    if (!prev.eps && incoming.eps) prev.eps = incoming.eps
    if (!prev.city && incoming.city) prev.city = incoming.city
    if (!prev.gender && incoming.gender) prev.gender = incoming.gender
  }

  return [...byKey.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'))
}

function personCategories(p: Person) {
  const names: string[] = [...new Set(p.groups.map(categoryForGroup))]
  if (p.doble) names.push('Doble Proceso')
  const order = ['Infantil', 'Pre-juvenil', 'Juvenil', 'Adulto', 'Doble Proceso']
  names.sort((a, b) => order.indexOf(a) - order.indexOf(b))
  return names
}

function printPlan(people: Person[]) {
  console.log(`Personas: ${people.length}`)
  for (const p of people) {
    const fees = p.groups.map(name => {
      const g = GROUP_DEFS.find(x => x.name === name)!
      return `${name} $${g.monthlyFee}`
    }).join(' + ')
    const gaps = [
      !p.documentNumber ? 'sin documento' : '',
      !p.email ? 'sin correo' : '',
      !p.phone ? 'sin celular' : '',
      !p.eps ? 'sin EPS' : '',
    ].filter(Boolean)
    console.log(`- ${p.fullName} | ${p.documentNumber || '—'} | ${p.groups.join(', ')} | ${personCategories(p).join(', ')} | ${fees}${gaps.length ? ' | ' + gaps.join(', ') : ''}`)
  }
}

const CATEGORIES = [
  { name: 'Infantil', description: 'Niños y niñas pequeños (5–8 años)', minAge: 5, maxAge: 8, sortOrder: 1 },
  { name: 'Juvenil', description: 'Jóvenes (13–17 años)', minAge: 13, maxAge: 17, sortOrder: 3 },
  { name: 'Adulto', description: 'Adultos (18 años en adelante)', minAge: 18, maxAge: null, sortOrder: 4 },
  { name: 'Doble Proceso', description: 'Bailarín de Primera Línea que también está en Segunda Línea. Se suma a su otra categoría.', minAge: null, maxAge: null, sortOrder: 5 },
]

const MODALITIES = [
  { name: 'Salsa Caleña', description: 'Principal especialidad de Saoko.' },
  { name: 'Danza Contemporánea', description: 'Movimiento libre y expresión corporal.' },
]

async function main() {
  const people = readPeople(EXCEL)
  printPlan(people)
  if (DRY) {
    console.log('\nDry-run: no se escribió nada.')
    return
  }

  loadDotEnv(path.resolve('.env.local'))
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'saokostudio-fc8be'
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT
    if (raw) initializeApp({ credential: cert(JSON.parse(raw)), projectId })
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) initializeApp({ credential: applicationDefault(), projectId })
    else initializeApp({ projectId })
  }
  const db = getFirestore()

  async function ensure(col: string, name: string, data: Record<string, unknown>) {
    const snap = await db.collection(col).get()
    const found = snap.docs.find(d => norm(String(d.get('name') ?? '')) === norm(name))
    if (found) return found.id
    const ref = db.collection(col).doc()
    await ref.set({
      name,
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    console.log(`  + ${col}/${name}`)
    return ref.id
  }

  console.log('\nCatálogo')
  const modalityId = new Map<string, string>()
  for (const m of MODALITIES) {
    modalityId.set(m.name, await ensure('modalities', m.name, { description: m.description, isActive: true }))
  }
  const categoryId = new Map<string, string>()
  for (const c of CATEGORIES) {
    categoryId.set(c.name, await ensure('categories', c.name, {
      description: c.description, minAge: c.minAge, maxAge: c.maxAge, isActive: true, sortOrder: c.sortOrder,
    }))
  }
  const levelId = new Map<string, string>()
  for (const levelName of ['Primera Línea', 'Segunda Línea']) {
    const salsa = modalityId.get('Salsa Caleña')!
    levelId.set(levelName, await ensure('levels', levelName, {
      description: '', modalityId: salsa, isActive: true, sortOrder: levelName === 'Primera Línea' ? 3 : 2,
    }))
  }

  console.log('\nGrupos')
  const groupId = new Map<string, string>()
  for (const g of GROUP_DEFS) {
    const payload = {
      modalityId: modalityId.get(g.modality) ?? null,
      modalityName: g.modality,
      categoryId: categoryId.get(g.category) ?? '',
      categoryName: g.category,
      levelId: g.level ? levelId.get(g.level) ?? null : null,
      levelName: g.level,
      monthlyFee: g.monthlyFee,
      description: '',
      isActive: true,
      instructorId: null,
      instructorName: null,
    }
    const snap = await db.collection('groups').get()
    const found = snap.docs.find(d => norm(String(d.get('name') ?? '')) === norm(g.name))
    if (found) {
      await found.ref.set({ ...payload, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
      groupId.set(g.name, found.id)
      console.log(`  = ${g.name} (${g.monthlyFee})`)
    } else {
      const ref = db.collection('groups').doc()
      await ref.set({
        name: g.name,
        ...payload,
        memberCount: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      groupId.set(g.name, ref.id)
      console.log(`  + ${g.name} (${g.monthlyFee})`)
    }
  }

  console.log('\nBailarines')
  const dancerSnap = await db.collection('dancers').get()
  const dancers = dancerSnap.docs.map(d => ({ id: d.id, ref: d.ref, data: d.data() }))
  const membershipSnap = await db.collection('groupMemberships').get()
  const memberships = membershipSnap.docs.map(d => d.data())

  const dancerIds: { person: Person; id: string }[] = []
  for (const p of people) {
    const cats = personCategories(p)
    const ids = cats.map(n => categoryId.get(n)).filter((id): id is string => !!id)
    const orderedGroups = GROUP_DEFS.map(g => g.name).filter(n => p.groups.includes(n))
    const packed = {
      fullName: p.fullName,
      documentNumber: p.documentNumber,
      birthDate: Timestamp.fromDate(p.birthDate),
      city: p.city,
      gender: p.gender,
      eps: p.eps,
      email: p.email,
      phone: p.phone,
      categoryIds: ids,
      categoryNames: cats,
      categoryId: ids[0] ?? '',
      categoryName: cats.join(', '),
      isActive: true,
      currentGroupId: groupId.get(orderedGroups[0]) ?? null,
      currentGroupName: orderedGroups.join(', ') || null,
      updatedAt: FieldValue.serverTimestamp(),
    }
    const existing = dancers.find(d => {
      const doc = digits(String(d.data.documentNumber ?? ''))
      if (p.documentNumber && doc && doc === p.documentNumber) return true
      return !p.documentNumber && norm(String(d.data.fullName ?? '')) === norm(p.fullName)
    })
    if (existing) {
      await existing.ref.set(packed, { merge: true })
      dancerIds.push({ person: p, id: existing.id })
      console.log(`  = ${p.fullName}`)
    } else {
      const ref = db.collection('dancers').doc()
      await ref.set({
        ...packed,
        address: '',
        neighborhood: '',
        commune: '',
        epsLocation: '',
        bloodType: '',
        inactiveDate: null,
        notes: '',
        photoUrl: null,
        createdAt: FieldValue.serverTimestamp(),
      })
      dancerIds.push({ person: p, id: ref.id })
      console.log(`  + ${p.fullName}`)
    }
  }

  console.log('\nMatrículas')
  let addedMemberships = 0
  for (const { person, id } of dancerIds) {
    for (const groupName of person.groups) {
      const gid = groupId.get(groupName)!
      const fee = GROUP_DEFS.find(g => g.name === groupName)!.monthlyFee
      const already = memberships.some(m => m.dancerId === id && m.groupId === gid && m.isCurrent === true)
      if (already) continue
      await db.collection('groupMemberships').add({
        dancerId: id,
        dancerName: person.fullName,
        groupId: gid,
        groupName,
        startDate: Timestamp.fromDate(new Date(2026, 9, 20, 12, 0, 0, 0)),
        endDate: null,
        isCurrent: true,
        monthlyFeeSnapshot: fee,
        notes: 'Migrado desde Excel Saoko 2026',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      memberships.push({ dancerId: id, groupId: gid, isCurrent: true })
      addedMemberships += 1
    }
  }
  console.log(`  matrículas nuevas: ${addedMemberships}`)

  const fresh = await db.collection('groupMemberships').where('isCurrent', '==', true).get()
  const counts = new Map<string, number>()
  fresh.docs.forEach(d => {
    const gid = String(d.get('groupId') ?? '')
    counts.set(gid, (counts.get(gid) ?? 0) + 1)
  })
  for (const g of GROUP_DEFS) {
    const gid = groupId.get(g.name)!
    await db.collection('groups').doc(gid).set({
      memberCount: counts.get(gid) ?? 0,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
  }

  console.log('\nListo. No se generaron mensualidades.')
}

main().catch(err => {
  const message = err instanceof Error ? err.message : String(err)
  if (/credential|UNAUTHENTICATED|Could not load the default credentials/i.test(message)) {
    console.error('\nFirestore rechazó la escritura: falta la cuenta de servicio.')
    console.error('Define GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT y vuelve a correr el script.')
    process.exit(1)
  }
  console.error(message)
  process.exit(1)
})
