import { readFileSync } from 'node:fs'
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

export const runtime = 'nodejs'

function adminApp(): App | null {
  const existing = getApps().find(app => app.name === 'saoko-admin')
  if (existing) return existing
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  if (!path) return null
  try {
    const json = JSON.parse(readFileSync(path, 'utf8'))
    return initializeApp({ credential: cert(json) }, 'saoko-admin')
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const app = adminApp()
  if (!app) return Response.json({ error: 'Sin credencial de servidor' }, { status: 501 })

  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return Response.json({ error: 'No autorizado' }, { status: 401 })

  let callerUid = ''
  try {
    callerUid = (await getAuth(app).verifyIdToken(token)).uid
  } catch {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as { uid?: unknown } | null
  const uid = typeof body?.uid === 'string' ? body.uid : ''
  if (!uid || uid === callerUid) {
    return Response.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })
  }

  const database = getFirestore(app)
  const caller = await database.doc(`adminUsers/${callerUid}`).get()
  const callerRole = caller.data()?.role
  if (caller.data()?.isActive !== true || (callerRole !== 'admin' && callerRole !== 'super_admin')) {
    return Response.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const target = await database.doc(`adminUsers/${uid}`).get()
  const targetRole = target.data()?.role
  if (callerRole === 'admin' && targetRole && !['staff', 'teacher', 'student'].includes(String(targetRole))) {
    return Response.json({ error: 'Sin permisos para eliminar este usuario' }, { status: 403 })
  }

  try {
    await getAuth(app).deleteUser(uid)
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code !== 'auth/user-not-found') {
      return Response.json({ error: 'No se pudo borrar la cuenta de acceso' }, { status: 500 })
    }
  }

  return Response.json({ ok: true })
}
