export async function POST(request: Request) {
  const key = process.env.IMGBB_API_KEY
  if (!key) {
    return Response.json({ error: 'Falta configurar IMGBB_API_KEY' }, { status: 500 })
  }

  const incoming = await request.formData()
  const file = incoming.get('image')
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: 'Selecciona una imagen' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return Response.json({ error: 'El archivo tiene que ser una imagen' }, { status: 400 })
  }

  const out = new FormData()
  out.append('image', file)

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    body: out,
  })
  const json = await res.json().catch(() => null)
  const url = json?.data?.display_url || json?.data?.url
  if (!res.ok || !json?.success || !url) {
    const message = json?.error?.message || 'ImgBB no aceptó la imagen'
    return Response.json({ error: message }, { status: 502 })
  }

  return Response.json({ url })
}
