import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase/config'

export async function uploadFile(path: string, file: File): Promise<string> {
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

export function uploadReceipt(file: File): Promise<string> {
  const safe = file.name.replace(/[^\w.\-]+/g, '_')
  return uploadFile(`receipts/${Date.now()}-${safe}`, file)
}

export function uploadDancerPhoto(dancerId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  return uploadFile(`dancer-photos/${dancerId}/photo.${ext}`, file)
}
