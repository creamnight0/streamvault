/* API client for the StreamVault backend (server/index.js, proxied by Vite). */

export async function apiHealth() {
  const r = await fetch('/api/health')
  if (!r.ok) throw new Error('health failed')
  return r.json()
}

export async function apiListVideos() {
  const r = await fetch('/api/videos')
  if (!r.ok) throw new Error('list failed')
  return r.json()
}

export async function apiGetVideo(id) {
  const r = await fetch(`/api/videos/${id}`)
  if (!r.ok) throw new Error('get failed')
  return r.json()
}

export async function apiDeleteVideo(id) {
  const r = await fetch(`/api/videos/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('delete failed')
  return r.json()
}

export async function apiResolveStream(url) {
  try {
    const r = await fetch(`/api/resolve-stream?url=${encodeURIComponent(url)}`)
    if (!r.ok) return { ok: false }
    return await r.json()
  } catch {
    return { ok: false }
  }
}

/* Multipart publish with real upload progress (XHR — fetch has no upload progress). */
export function apiPublish(fields, files, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = new FormData()
    const stream = fields.streamUrl || fields.embed || ''
    const payload = {
      ...fields,
      streamUrl: stream,
      embed: stream,
      srcType: fields.srcType === 'stream' || fields.srcType === 'embed' ? 'stream' : 'file',
    }
    for (const [k, v] of Object.entries(payload)) fd.append(k, v ?? '')
    if (files.video) fd.append('video', files.video)
    if (files.thumb) fd.append('thumb', files.thumb)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/videos')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      let body
      try { body = JSON.parse(xhr.responseText) } catch { body = {} }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body)
      else reject(new Error(body.error || `Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Network error — is the backend running? (npm run server)'))
    xhr.send(fd)
  })
}

/* ---------- Categories API ---------- */
export async function apiListCategories() {
  try {
    const r = await fetch('/api/categories')
    if (!r.ok) return []
    return await r.json()
  } catch {
    return []
  }
}

export async function apiCreateCategory(catData) {
  const r = await fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(catData),
  })
  if (!r.ok) {
    const data = await r.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to create category')
  }
  return r.json()
}

export async function apiDeleteCategory(slug) {
  const r = await fetch(`/api/categories/${slug}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Failed to delete category')
  return r.json()
}

/* ---------- Models / Creators API ---------- */
export async function apiListModels() {
  try {
    const r = await fetch('/api/models')
    if (!r.ok) return []
    return await r.json()
  } catch {
    return []
  }
}

export async function apiCreateModel(modelData, avatarFile) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(modelData)) {
    if (v !== undefined && v !== null) fd.append(k, v)
  }
  if (avatarFile) fd.append('avatar', avatarFile)

  const r = await fetch('/api/models', {
    method: 'POST',
    body: fd,
  })
  if (!r.ok) {
    const data = await r.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to create model')
  }
  return r.json()
}

export async function apiDeleteModel(id) {
  const r = await fetch(`/api/models/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Failed to delete model')
  return r.json()
}
