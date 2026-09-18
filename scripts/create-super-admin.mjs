/**
 * create-super-admin.mjs
 * Crea el super administrador directamente en Firebase Auth y Firestore
 * usando la REST API de Firebase (no requiere firebase-admin ni emulador).
 *
 * Ejecutar: node scripts/create-super-admin.mjs
 */

const API_KEY      = 'AIzaSyC_vPLT8Pzd8HHl7hOsp2vrTabTbKu4mhw'
const PROJECT_ID   = 'saokostudio-fc8be'

const DOC_NUMBER   = '1007260358'
const PASSWORD     = 'romanos812'
// Email virtual — solo se usa internamente para Firebase Auth
const EMAIL        = `superadmin.${DOC_NUMBER}@saokostudio.internal`

// ─── 1. Crear usuario en Firebase Auth ───────────────────────────────────────
async function createAuthUser() {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      returnSecureToken: true,
    }),
  })
  const data = await res.json()

  if (data.error) {
    if (data.error.message === 'EMAIL_EXISTS') {
      console.log('ℹ  Usuario ya existe en Firebase Auth. Obteniendo UID...')
      return await signInAndGetUid()
    }
    throw new Error(`Auth error: ${data.error.message}`)
  }

  console.log(`✓  Usuario creado en Firebase Auth`)
  console.log(`   UID: ${data.localId}`)
  return data.localId
}

// Si el usuario ya existe, iniciamos sesión para obtener el UID
async function signInAndGetUid() {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      returnSecureToken: true,
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(`Sign-in error: ${data.error.message}`)
  console.log(`   UID: ${data.localId}`)
  return data.localId
}

// ─── 2. Verificar si ya existe en Firestore ───────────────────────────────────
async function superAdminExistsInFirestore(idToken) {
  // Buscamos documentos con role == super_admin en la colección adminUsers
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'adminUsers' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'role' },
            op: 'EQUAL',
            value: { stringValue: 'super_admin' },
          },
        },
        limit: 1,
      },
    }),
  })
  const data = await res.json()
  if (!Array.isArray(data)) return false
  return data.some(d => d.document)
}

// ─── 3. Crear documento en Firestore ─────────────────────────────────────────
async function createFirestoreRecord(uid, idToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/adminUsers`

  const now = new Date().toISOString()
  const body = {
    fields: {
      uid:            { stringValue: uid },
      name:           { stringValue: 'Super Administrador' },
      email:          { stringValue: EMAIL },
      documentNumber: { stringValue: DOC_NUMBER },
      role:           { stringValue: 'super_admin' },
      isActive:       { booleanValue: true },
      createdAt:      { timestampValue: now },
      updatedAt:      { timestampValue: now },
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data.error) throw new Error(`Firestore error: ${data.error.message}`)
  console.log(`✓  Documento creado en Firestore`)
  console.log(`   Path: ${data.name}`)
}

// ─── 4. Obtener idToken para Firestore ────────────────────────────────────────
async function getIdToken() {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
  })
  const data = await res.json()
  if (data.error) throw new Error(`Token error: ${data.error.message}`)
  return { idToken: data.idToken, uid: data.localId }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Saoko Studio — Crear Super Administrador')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Proyecto:  ${PROJECT_ID}`)
  console.log(`  Cédula:    ${DOC_NUMBER}`)
  console.log(`  Email int: ${EMAIL}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  try {
    // Paso 1: crear en Auth
    console.log('→ Paso 1: Firebase Auth...')
    const uid = await createAuthUser()

    // Paso 2: obtener token para poder escribir en Firestore
    console.log('→ Paso 2: Obteniendo token de acceso...')
    const { idToken } = await getIdToken()

    // Paso 3: verificar si ya existe en Firestore
    console.log('→ Paso 3: Verificando Firestore...')
    const exists = await superAdminExistsInFirestore(idToken)

    if (exists) {
      console.log('ℹ  El super administrador ya existe en Firestore. No se duplicará.')
    } else {
      console.log('→ Paso 4: Creando documento en Firestore...')
      await createFirestoreRecord(uid, idToken)
    }

    console.log('')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  ✅  Super administrador listo')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('  Para ingresar al sistema:')
    console.log(`  Usuario:   ${DOC_NUMBER}`)
    console.log(`  Contraseña: ${PASSWORD}`)
    console.log('')
  } catch (err) {
    console.error('\n❌ Error:', err.message)
    console.error('\nPosibles causas:')
    console.error('  • Las reglas de Firestore no permiten escritura anónima.')
    console.error('    → Ve a Firebase Console > Firestore > Rules y cambia temporalmente a:')
    console.error('      allow read, write: if request.auth != null;')
    console.error('  • El proyecto de Firebase no tiene habilitado Email/Password auth.')
    console.error('    → Ve a Firebase Console > Authentication > Sign-in method > Email/Password > Habilitar')
    process.exit(1)
  }
}

main()
