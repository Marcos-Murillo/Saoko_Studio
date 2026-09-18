import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, type Auth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function getFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApp()
  return initializeApp(firebaseConfig)
}

const app = getFirebaseApp()

export const db = getFirestore(app)
export const storage = getStorage(app)

/**
 * Auth is created lazily. `getAuth()` throws `auth/invalid-api-key` at import
 * time when env vars are missing (Vercel prerender of /_not-found).
 */
let authInstance: Auth | undefined
export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(app)
  return authInstance
}

export default app
