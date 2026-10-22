/**
 * Doble Proceso no cobra los dos grupos.
 * A quien ya tiene esa categoría y está en Segunda Línea, esa matrícula
 * queda sin mensualidad y se borran las cuotas de ese grupo que nadie abonó.
 *
 *   npx tsx scripts/fix-doble-proceso-fees.ts
 */
import * as fs from 'fs'
import * as path from 'path'
import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

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

async function main() {
  loadDotEnv(path.resolve('.env.local'))
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'saokostudio-fc8be'
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT
    if (raw) initializeApp({ credential: cert(JSON.parse(raw)), projectId })
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) initializeApp({ credential: applicationDefault(), projectId })
    else initializeApp({ projectId })
  }
  const db = getFirestore()

  const categories = await db.collection('categories').get()
  const doble = categories.docs.find(d => norm(String(d.get('name') ?? '')) === 'doble proceso')
  if (doble) {
    await doble.ref.set({
      description: 'Asiste a un segundo grupo, además de su categoría. Ese segundo grupo no genera mensualidad.',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
  }

  const dancers = await db.collection('dancers').get()
  const memberships = await db.collection('groupMemberships').where('isCurrent', '==', true).get()
  const fees = await db.collection('monthlyFees').get()
  const allocations = await db.collection('paymentAllocations').get()
  const credits = await db.collection('dancerCredits').get()
  const creditTx = await db.collection('creditTransactions').get()

  let updated = 0
  let removedFees = 0
  for (const dancer of dancers.docs) {
    const names = Array.isArray(dancer.get('categoryNames'))
      ? dancer.get('categoryNames') as string[]
      : String(dancer.get('categoryName') ?? '').split(',')
    if (!names.some(name => norm(name) === 'doble proceso')) continue

    const own = memberships.docs.filter(m => m.get('dancerId') === dancer.id)
    const second = own.find(m => norm(String(m.get('groupName') ?? '')) === 'segunda linea')
    if (!second) {
      console.log(`- ${dancer.get('fullName')}: Doble Proceso sin Segunda Línea, no se cambió el cobro`)
      continue
    }

    await second.ref.set({
      chargesFee: false,
      notes: 'Segundo grupo de Doble Proceso. No genera mensualidad.',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
    await dancer.ref.set({
      secondGroupId: second.get('groupId'),
      secondGroupName: second.get('groupName') ?? 'Segunda Línea',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    for (const fee of fees.docs) {
      if (fee.get('dancerId') !== dancer.id) continue
      if (fee.get('groupId') !== second.get('groupId')) continue
      const paid = Number(fee.get('amountPaid') ?? 0)
      const status = String(fee.get('status') ?? '')
      const linked = allocations.docs.some(a => a.get('monthlyFeeId') === fee.id && a.get('isReversed') !== true)
      if (linked || status === 'forgiven') {
        console.log(`  cuota conservada ${dancer.get('fullName')} ${fee.get('periodYear')}-${fee.get('periodMonth')} (${status}, abono ${paid})`)
        continue
      }
      if (paid > 0) {
        const sameMonth = fees.docs.filter(other =>
          other.id !== fee.id
          && other.get('dancerId') === dancer.id
          && other.get('groupId') !== second.get('groupId')
          && other.get('periodYear') === fee.get('periodYear')
          && other.get('periodMonth') === fee.get('periodMonth')
          && Number(other.get('amount') ?? 0) - Number(other.get('amountPaid') ?? 0) > 0,
        )
        const target = sameMonth.find(other => norm(String(other.get('groupName') ?? '')) === 'primera linea') ?? sameMonth[0]
        let leftover = paid
        if (target) {
          const already = Number(target.get('amountPaid') ?? 0)
          const amount = Number(target.get('amount') ?? 0)
          const moved = Math.min(leftover, Math.max(0, amount - already))
          const newPaid = already + moved
          await target.ref.set({
            amountPaid: newPaid,
            status: newPaid >= amount ? 'paid' : 'partial',
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true })
          leftover -= moved
          for (const tx of creditTx.docs) {
            if (tx.get('targetMonthlyFeeId') !== fee.id) continue
            await tx.ref.set({
              targetMonthlyFeeId: target.id,
              notes: 'Saldo aplicado a la mensualidad del grupo principal. El segundo grupo de Doble Proceso no se cobra.',
              updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true })
          }
          console.log(`  abono ${moved} pasado a ${target.get('groupName')}`)
        }
        if (leftover > 0) {
          const credit = credits.docs.find(c => c.get('dancerId') === dancer.id)
          if (credit) {
            await credit.ref.set({
              balance: Number(credit.get('balance') ?? 0) + leftover,
              updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true })
          }
          console.log(`  abono ${leftover} devuelto a saldo a favor`)
        }
      }
      await fee.ref.delete()
      removedFees += 1
    }
    updated += 1
    console.log(`= ${dancer.get('fullName')}: paga el otro grupo, Segunda Línea sin mensualidad`)
  }

  console.log(`\nListo. ${updated} bailarines, ${removedFees} cuotas sin abono eliminadas.`)
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
