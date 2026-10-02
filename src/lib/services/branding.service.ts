import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'

const BRANDING_ID = 'branding'
const MAX_EDGE = 1400

export type LetterheadParts = {
  header: string | null
  center: string | null
  footer: string | null
}

function asImage(value: unknown): string | null {
  return typeof value === 'string' && value.startsWith('data:image/') ? value : null
}

export async function getLetterheadParts(): Promise<LetterheadParts> {
  const snap = await getDoc(doc(db, COLLECTIONS.APP_SETTINGS, BRANDING_ID))
  if (!snap.exists()) return { header: null, center: null, footer: null }
  const data = snap.data()
  return {
    header: asImage(data.headerDataUrl) ?? asImage(data.letterheadDataUrl),
    center: asImage(data.centerDataUrl),
    footer: asImage(data.footerDataUrl),
  }
}

export async function saveLetterheadParts(parts: LetterheadParts): Promise<void> {
  const total = (parts.header?.length ?? 0) + (parts.center?.length ?? 0) + (parts.footer?.length ?? 0)
  if (total > 900_000) {
    throw new Error('Las tres imágenes juntas pesan demasiado. Usa archivos más livianos.')
  }
  await setDoc(doc(db, COLLECTIONS.APP_SETTINGS, BRANDING_ID), {
    headerDataUrl: parts.header,
    centerDataUrl: parts.center,
    footerDataUrl: parts.footer,
    letterheadDataUrl: parts.header,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export function compressLetterhead(file: File, maxChars = 900_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const blobUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      let quality = 0.82
      let edge = MAX_EDGE
      let dataUrl = ''
      for (let attempt = 0; attempt < 4; attempt++) {
        const scale = Math.min(1, edge / Math.max(img.width, img.height))
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
        dataUrl = canvas.toDataURL('image/jpeg', quality)
        if (dataUrl.length <= maxChars) break
        quality -= 0.16
        edge = Math.round(edge * 0.75)
      }
      URL.revokeObjectURL(blobUrl)
      if (dataUrl.length > maxChars) {
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
