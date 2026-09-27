import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'

const BRANDING_ID = 'branding'
const MAX_EDGE = 1400

export async function getLetterhead(): Promise<string | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.APP_SETTINGS, BRANDING_ID))
  if (!snap.exists()) return null
  const value = snap.data().letterheadDataUrl
  return typeof value === 'string' && value.startsWith('data:image/') ? value : null
}

export async function saveLetterhead(dataUrl: string | null): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.APP_SETTINGS, BRANDING_ID), {
    letterheadDataUrl: dataUrl,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export function compressLetterhead(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const blobUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
      const width = Math.max(1, Math.round(img.width * scale))
      const height = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(blobUrl)
        reject(new Error('No se pudo preparar la imagen'))
        return
      }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
      URL.revokeObjectURL(blobUrl)
      if (dataUrl.length > 900_000) {
        reject(new Error('La imagen sigue siendo muy pesada. Usa una más liviana.'))
        return
      }
      resolve(dataUrl)
    }
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = blobUrl
  })
}
