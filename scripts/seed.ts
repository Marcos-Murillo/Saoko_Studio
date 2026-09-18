/**
 * scripts/seed.ts
 * Seeds Firestore with initial catalog data for Saoko Studio.
 *
 * Run from project root:
 *   npx tsx scripts/seed.ts
 *
 * Requirements:
 *   npm install -D tsx
 *
 * This script creates:
 *   - Modalities (Salsa Caleña, Contemporánea, Jazz, Ballet)
 *   - Categories (Infantil, Pre-juvenil, Juvenil)
 *   - Levels (Iniciación, Segunda Línea, Primera Línea — for Salsa)
 *   - Payment Methods (Efectivo, Transferencia, Nequi, Daviplata)
 *   - Expense Categories (Arriendo, Vestuario, Transporte, etc.)
 *   - One admin user record (you must first create the user in Firebase Auth)
 *
 * IMPORTANT: Set FIREBASE_PROJECT_ID and credentials before running,
 * or use the emulator. This script uses the firebase-admin SDK.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as path from 'path'

// ─── Init ─────────────────────────────────────────────────────────────────────
// For local seeding use the Firebase emulator or a service account JSON.
// Set GOOGLE_APPLICATION_CREDENTIALS env var or pass cert() below.
if (!getApps().length) {
  initializeApp({
    projectId: 'saokostudio-fc8be',
  })
}

const db = getFirestore()
const now = FieldValue.serverTimestamp()

async function upsert(col: string, id: string, data: Record<string, unknown>) {
  await db.collection(col).doc(id).set({ ...data, createdAt: now, updatedAt: now }, { merge: true })
  console.log(`  ✓ ${col}/${id}`)
}

// ─── Seed data ────────────────────────────────────────────────────────────────

async function seedModalities() {
  console.log('\n📌 Modalidades')
  const items = [
    { id: 'salsa-calena', name: 'Salsa Caleña', description: 'Principal especialidad de Saoko. Ritmo, elegancia y técnica caleña.', isActive: true },
    { id: 'contemporanea', name: 'Danza Contemporánea', description: 'Movimiento libre y expresión corporal.', isActive: true },
    { id: 'jazz', name: 'Jazz', description: 'Técnica de jazz aplicada a la danza escénica.', isActive: true },
    { id: 'ballet', name: 'Ballet', description: 'Formación clásica en técnica ballet.', isActive: true },
  ]
  for (const item of items) await upsert('modalities', item.id, item)
}

async function seedCategories() {
  console.log('\n📌 Categorías')
  const items = [
    { id: 'infantil', name: 'Infantil', description: 'Niños y niñas pequeños (5–8 años)', minAge: 5, maxAge: 8, isActive: true, sortOrder: 1 },
    { id: 'pre-juvenil', name: 'Pre-juvenil', description: 'Niños y niñas en etapa intermedia (9–12 años)', minAge: 9, maxAge: 12, isActive: true, sortOrder: 2 },
    { id: 'juvenil', name: 'Juvenil', description: 'Jóvenes (13–17 años)', minAge: 13, maxAge: 17, isActive: true, sortOrder: 3 },
    { id: 'adulto', name: 'Adulto', description: 'Adultos (18 años en adelante)', minAge: 18, maxAge: null, isActive: true, sortOrder: 4 },
  ]
  for (const item of items) await upsert('categories', item.id, item)
}

async function seedLevels() {
  console.log('\n📌 Niveles')
  const items = [
    { id: 'iniciacion', name: 'Iniciación', description: 'Nivel básico, primer acercamiento a la danza.', modalityId: 'salsa-calena', isActive: true, sortOrder: 1 },
    { id: 'segunda-linea', name: 'Segunda Línea', description: 'Nivel intermedio de salsa caleña.', modalityId: 'salsa-calena', isActive: true, sortOrder: 2 },
    { id: 'primera-linea', name: 'Primera Línea', description: 'Nivel avanzado, grupo de alto rendimiento.', modalityId: 'salsa-calena', isActive: true, sortOrder: 3 },
  ]
  for (const item of items) await upsert('levels', item.id, item)
}

async function seedPaymentMethods() {
  console.log('\n📌 Métodos de pago')
  const items = [
    { id: 'efectivo', name: 'Efectivo', isActive: true },
    { id: 'transferencia', name: 'Transferencia bancaria', isActive: true },
    { id: 'nequi', name: 'Nequi', isActive: true },
    { id: 'daviplata', name: 'Daviplata', isActive: true },
    { id: 'otro', name: 'Otro', isActive: true },
  ]
  for (const item of items) await upsert('paymentMethods', item.id, item)
}

async function seedExpenseCategories() {
  console.log('\n📌 Categorías de gastos')
  const items = [
    { id: 'arriendo', name: 'Arriendo', description: 'Pago del espacio de ensayo o presentaciones.', isActive: true },
    { id: 'vestuario', name: 'Vestuario', description: 'Compra o alquiler de vestuarios para presentaciones.', isActive: true },
    { id: 'transporte', name: 'Transporte', description: 'Transporte para competencias, eventos o ensayos externos.', isActive: true },
    { id: 'competencias', name: 'Competencias', description: 'Inscripciones, inscripciones y gastos de competencias.', isActive: true },
    { id: 'materiales', name: 'Materiales', description: 'Material didáctico, implementos de danza y accesorios.', isActive: true },
    { id: 'servicios', name: 'Servicios', description: 'Agua, luz, internet y otros servicios del local.', isActive: true },
    { id: 'nomina', name: 'Nómina', description: 'Pago a profesores y personal.', isActive: true },
    { id: 'marketing', name: 'Marketing', description: 'Publicidad, redes sociales y promoción.', isActive: true },
    { id: 'otros', name: 'Otros gastos', description: 'Gastos varios no clasificados.', isActive: true },
  ]
  for (const item of items) await upsert('expenseCategories', item.id, item)
}

async function seedSampleGroups() {
  console.log('\n📌 Grupos de ejemplo')
  const items = [
    {
      id: 'salsa-infantil-iniciacion',
      name: 'Salsa Infantil Iniciación',
      modalityId: 'salsa-calena', modalityName: 'Salsa Caleña',
      categoryId: 'infantil', categoryName: 'Infantil',
      levelId: 'iniciacion', levelName: 'Iniciación',
      monthlyFee: 80000,
      description: 'Grupo de iniciación en salsa para niños pequeños.',
      isActive: true, memberCount: 0, instructorId: null, instructorName: null,
    },
    {
      id: 'salsa-juvenil-segunda-linea',
      name: 'Salsa Juvenil Segunda Línea',
      modalityId: 'salsa-calena', modalityName: 'Salsa Caleña',
      categoryId: 'juvenil', categoryName: 'Juvenil',
      levelId: 'segunda-linea', levelName: 'Segunda Línea',
      monthlyFee: 120000,
      description: 'Grupo juvenil nivel intermedio de salsa caleña.',
      isActive: true, memberCount: 0, instructorId: null, instructorName: null,
    },
    {
      id: 'salsa-adulto-primera-linea',
      name: 'Salsa Primera Línea',
      modalityId: 'salsa-calena', modalityName: 'Salsa Caleña',
      categoryId: 'adulto', categoryName: 'Adulto',
      levelId: 'primera-linea', levelName: 'Primera Línea',
      monthlyFee: 150000,
      description: 'Grupo élite de salsa caleña, alto rendimiento.',
      isActive: true, memberCount: 0, instructorId: null, instructorName: null,
    },
    {
      id: 'ballet-infantil',
      name: 'Ballet Infantil',
      modalityId: 'ballet', modalityName: 'Ballet',
      categoryId: 'infantil', categoryName: 'Infantil',
      levelId: null, levelName: null,
      monthlyFee: 90000,
      description: 'Formación básica en ballet clásico para niños.',
      isActive: true, memberCount: 0, instructorId: null, instructorName: null,
    },
    {
      id: 'jazz-juvenil',
      name: 'Jazz Juvenil',
      modalityId: 'jazz', modalityName: 'Jazz',
      categoryId: 'juvenil', categoryName: 'Juvenil',
      levelId: null, levelName: null,
      monthlyFee: 100000,
      description: 'Técnica jazz para jóvenes.',
      isActive: true, memberCount: 0, instructorId: null, instructorName: null,
    },
  ]
  for (const item of items) await upsert('groups', item.id, item)
}

async function seedSampleSchedules() {
  console.log('\n📌 Horarios de ejemplo')
  const items = [
    { id: 'sch-1', groupId: 'salsa-infantil-iniciacion', groupName: 'Salsa Infantil Iniciación', dayOfWeek: 'Lunes', startTime: '15:00', endTime: '16:30', location: 'Salón Principal', isActive: true, instructorId: null, instructorName: null, notes: '' },
    { id: 'sch-2', groupId: 'salsa-infantil-iniciacion', groupName: 'Salsa Infantil Iniciación', dayOfWeek: 'Miércoles', startTime: '15:00', endTime: '16:30', location: 'Salón Principal', isActive: true, instructorId: null, instructorName: null, notes: '' },
    { id: 'sch-3', groupId: 'salsa-juvenil-segunda-linea', groupName: 'Salsa Juvenil Segunda Línea', dayOfWeek: 'Martes', startTime: '17:00', endTime: '19:00', location: 'Salón Principal', isActive: true, instructorId: null, instructorName: null, notes: '' },
    { id: 'sch-4', groupId: 'salsa-juvenil-segunda-linea', groupName: 'Salsa Juvenil Segunda Línea', dayOfWeek: 'Jueves', startTime: '17:00', endTime: '19:00', location: 'Salón Principal', isActive: true, instructorId: null, instructorName: null, notes: '' },
    { id: 'sch-5', groupId: 'salsa-adulto-primera-linea', groupName: 'Salsa Primera Línea', dayOfWeek: 'Lunes', startTime: '19:00', endTime: '21:00', location: 'Estudio 2', isActive: true, instructorId: null, instructorName: null, notes: '' },
    { id: 'sch-6', groupId: 'salsa-adulto-primera-linea', groupName: 'Salsa Primera Línea', dayOfWeek: 'Miércoles', startTime: '19:00', endTime: '21:00', location: 'Estudio 2', isActive: true, instructorId: null, instructorName: null, notes: '' },
    { id: 'sch-7', groupId: 'salsa-adulto-primera-linea', groupName: 'Salsa Primera Línea', dayOfWeek: 'Viernes', startTime: '19:00', endTime: '21:30', location: 'Estudio 2', isActive: true, instructorId: null, instructorName: null, notes: '' },
    { id: 'sch-8', groupId: 'ballet-infantil', groupName: 'Ballet Infantil', dayOfWeek: 'Sábado', startTime: '09:00', endTime: '10:30', location: 'Salón Principal', isActive: true, instructorId: null, instructorName: null, notes: '' },
    { id: 'sch-9', groupId: 'jazz-juvenil', groupName: 'Jazz Juvenil', dayOfWeek: 'Sábado', startTime: '11:00', endTime: '12:30', location: 'Estudio 2', isActive: true, instructorId: null, instructorName: null, notes: '' },
  ]
  for (const item of items) await upsert('schedules', item.id, item)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Iniciando seed de Saoko Studio...\n')
  console.log('Proyecto: saokostudio-fc8be')
  console.log('──────────────────────────────────────')

  await seedModalities()
  await seedCategories()
  await seedLevels()
  await seedPaymentMethods()
  await seedExpenseCategories()
  await seedSampleGroups()
  await seedSampleSchedules()

  console.log('\n──────────────────────────────────────')
  console.log('✅ Seed completado exitosamente!')
  console.log('\nPróximos pasos:')
  console.log('  1. Crea un usuario en Firebase Authentication (email/password)')
  console.log('  2. Agrega el documento en Firestore > adminUsers:')
  console.log('     { uid, name, email, role: "admin", isActive: true }')
  console.log('  3. Ejecuta: npm run dev')
  console.log('  4. Accede a: http://localhost:3000')
  process.exit(0)
}

main().catch(err => { console.error('❌ Error en seed:', err); process.exit(1) })
