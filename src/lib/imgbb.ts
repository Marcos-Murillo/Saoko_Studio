export async function uploadToImgbb(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Elige un archivo de imagen')
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('La imagen no puede pesar más de 8 MB')
  }

  const body = new FormData()
  body.append('image', file)
  const res = await fetch('/api/imgbb', { method: 'POST', body })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.url) {
    throw new Error(typeof json.error === 'string' ? json.error : 'No se pudo subir la foto')
  }
  return json.url as string
}
