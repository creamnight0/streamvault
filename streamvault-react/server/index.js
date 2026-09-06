/* StreamVault backend — uploads, ffmpeg transcoding, and the video API.
   Run with: npm run server (or npm run dev:full alongside Vite). */
import express from 'express'
import multer from 'multer'
import cors from 'cors'
import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const execFileP = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = process.env.PORT || 4000
const DATA = path.join(__dirname, 'data')
const UPLOADS = path.join(DATA, 'uploads')   // original masters (kept untouched)
const MEDIA = path.join(DATA, 'media')       // transcoded, web-ready mp4s
const THUMBS = path.join(DATA, 'thumbs')
const DB_FILE = path.join(DATA, 'db.json')
for (const d of [DATA, UPLOADS, MEDIA, THUMBS]) fs.mkdirSync(d, { recursive: true })

/* ---------- tiny JSON db ---------- */
function loadDb() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) } catch { return { videos: [] } }
}
function saveDb(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)) }
const db = loadDb()
const findVideo = (id) => db.videos.find((v) => String(v.id) === String(id))

/* ---------- ffmpeg helpers ---------- */
let FFMPEG_OK = false
try { await execFileP('ffmpeg', ['-version']); FFMPEG_OK = true } catch { FFMPEG_OK = false }

async function probe(file) {
  const { stdout } = await execFileP('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration:stream=width,height',
    '-of', 'json',
    file,
  ])
  const parsed = JSON.parse(stdout)
  const seconds = Math.round(parseFloat(parsed.format?.duration || 0))
  const videoStream = parsed.streams?.find((s) => s.width && s.height) || {}
  const width = videoStream.width || 1920
  const height = videoStream.height || 1080
  const isPortrait = height > width || (width / height) < 0.85
  const mm = Math.floor(seconds / 60), ss = seconds % 60
  return { seconds, dur: `${mm}:${String(ss).padStart(2, '0')}`, mins: Math.max(1, Math.round(seconds / 60)), width, height, isPortrait }
}

function ffmpegRun(args, onProgress, totalSeconds) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-y', '-hide_banner', ...args])
    let err = ''
    p.stderr.on('data', (d) => {
      const s = d.toString()
      err += s
      const m = s.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/)
      if (m && totalSeconds && onProgress) {
        const t = (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3])
        onProgress(Math.min(99, Math.round((t / totalSeconds) * 100)))
      }
    })
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.slice(-800)))))
    p.on('error', reject)
  })
}

/* Transcode: H.264 CRF (quality-targeted) + faststart for instant web playback.
   The master in uploads/ is never modified. */
async function processVideo(rec, masterPath, thumbUpload) {
  try {
    const meta = await probe(masterPath)
    rec.dur = meta.dur
    rec.mins = meta.mins
    saveDb(db)

    const outName = `${rec.id}.mp4`
    const outPath = path.join(MEDIA, outName)
    await ffmpegRun(
      ['-i', masterPath,
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-c:a', 'aac', '-b:a', '160k',
        outPath],
      (pct) => { rec.progress = pct; saveDb(db) },
      meta.seconds,
    )

    // thumbnail: admin-provided image, else 3-panel collage for 9:16 or frame snapshot
    const thumbName = `${rec.id}.jpg`
    const thumbPath = path.join(THUMBS, thumbName)
    if (thumbUpload) {
      await ffmpegRun(['-i', thumbUpload, '-vf', 'scale=640:-2', '-frames:v', '1', thumbPath])
      fs.rmSync(thumbUpload, { force: true })
    } else if (meta.isPortrait) {
      // 3-Panel Collage for 9:16 portrait videos (like reference)
      const at1 = Math.max(0.5, meta.seconds * 0.18).toFixed(2)
      const at2 = Math.max(1.0, meta.seconds * 0.50).toFixed(2)
      const at3 = Math.max(1.5, meta.seconds * 0.82).toFixed(2)
      try {
        await ffmpegRun([
          '-ss', String(at1), '-i', masterPath,
          '-ss', String(at2), '-i', masterPath,
          '-ss', String(at3), '-i', masterPath,
          '-filter_complex',
          '[0:v]scale=424:720:force_original_aspect_ratio=increase,crop=424:720[v0];[1:v]scale=424:720:force_original_aspect_ratio=increase,crop=424:720[v1];[2:v]scale=424:720:force_original_aspect_ratio=increase,crop=424:720[v2];[v0][v1][v2]hstack=inputs=3,scale=1280:720',
          '-frames:v', '1',
          thumbPath,
        ])
      } catch (err) {
        console.warn('[transcode] 3-panel collage fallback to single frame:', err.message)
        const at = Math.max(1, Math.round(meta.seconds * 0.15))
        await ffmpegRun(['-ss', String(at), '-i', masterPath, '-frames:v', '1', '-vf', 'scale=640:-2', thumbPath])
      }
    } else {
      const at = Math.max(1, Math.round(meta.seconds * 0.1))
      await ffmpegRun(['-ss', String(at), '-i', masterPath, '-frames:v', '1', '-vf', 'scale=640:-2', thumbPath])
    }

    rec.status = 'ready'
    rec.progress = 100
    rec.src = `/media/${outName}`
    rec.thumb = `/thumbs/${thumbName}`
    rec.originalBytes = fs.statSync(masterPath).size
    rec.outputBytes = fs.statSync(outPath).size
    saveDb(db)
    console.log(`[transcode] ${rec.title}: ${(rec.originalBytes / 1e6).toFixed(1)}MB -> ${(rec.outputBytes / 1e6).toFixed(1)}MB`)
  } catch (e) {
    console.error('[transcode] failed:', e.message)
    rec.status = 'failed'
    rec.error = String(e.message || e).slice(0, 300)
    saveDb(db)
  }
}

/* ---------- express ---------- */
const app = express()
app.use(cors())
app.use(express.json())
app.use('/media', express.static(MEDIA))
app.use('/thumbs', express.static(THUMBS))

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^\w.\-]+/g, '_')}`),
  }),
  limits: { fileSize: 10 * 1024 ** 3 }, // 10 GB
})

const YTDLP_PATHS = [
  '/Users/imran/Library/Python/3.14/bin/yt-dlp',
  'yt-dlp',
  '/opt/homebrew/bin/yt-dlp',
  '/usr/local/bin/yt-dlp',
]

async function resolveDirectMedia(targetUrl) {
  if (!targetUrl) return { ok: false, error: 'No URL provided' }
  let ytdlpBin = 'yt-dlp'
  for (const p of YTDLP_PATHS) {
    try {
      if (fs.existsSync(p)) {
        ytdlpBin = p
        break
      }
    } catch {}
  }

  let clean = targetUrl
  const phEmbed = clean.match(/pornhub\.com\/embed\/([a-zA-Z0-9_-]+)/i)
  if (phEmbed) {
    clean = `https://www.pornhub.com/view_video.php?viewkey=${phEmbed[1]}`
  }

  const xvEmbed = clean.match(/xvideos\.com\/embedframe\/([a-zA-Z0-9_-]+)/i)
  if (xvEmbed && xvEmbed[1] !== 'embedframe') {
    clean = `https://www.xvideos.com/video.${xvEmbed[1]}/_`
  }

  // PimpBunny: Live auto-token extraction from webpage URLs only
  if (clean.includes('pimpbunny.com')) {
    // If it's already a direct get_file link with v-acctoken, return it directly!
    if (clean.includes('/get_file/') && clean.includes('v-acctoken=')) {
      return { ok: true, streamUrl: clean, isDirect: true }
    }
    // Only scrape HTML if it's a webpage URL (like /videos/slug/)
    if (clean.includes('/videos/') || !clean.includes('/get_file/')) {
      try {
        const pageRes = await fetch(clean, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Referer': 'https://pimpbunny.com/',
          },
        })
        const html = await pageRes.text()
        const matches = html.match(/https:\/\/pimpbunny\.com\/get_file\/[^\s"']+_(\d+p)\.mp4\/\?v-acctoken=[^\s"']+/g) ||
                        html.match(/https:\/\/pimpbunny\.com\/get_file\/[^\s"']+\.mp4\/\?v-acctoken=[^\s"']+/g)
        if (matches && matches.length > 0) {
          const best = matches.find((u) => u.includes('1080p')) || matches.find((u) => u.includes('720p')) || matches[0]
          return { ok: true, streamUrl: best, isDirect: true }
        }
      } catch (err) {
        console.warn('[resolve-stream] Pimpbunny auto-token fetch failed:', err.message)
      }
    }
  }

  try {
    const { stdout } = await execFileP(ytdlpBin, ['-g', clean], { timeout: 15000 })
    const lines = stdout.trim().split('\n').filter(Boolean)
    // Prefer direct .mp4 if available, otherwise take best available format (m3u8 / webm / stream)
    const directUrl = lines.find((l) => l.includes('.mp4')) || lines[0]
    if (directUrl && /^https?:\/\//i.test(directUrl)) {
      return { ok: true, streamUrl: directUrl, isDirect: true }
    }
  } catch (err) {
    console.warn('[resolve-stream] yt-dlp resolution fallback:', err.message)
  }
  return { ok: false, error: 'Could not resolve direct media stream' }
}

import https from 'node:https'
import http from 'node:http'

const streamCache = new Map()

function isDirectMediaFile(u) {
  if (!u || typeof u !== 'string') return false
  const lower = u.toLowerCase()
  if (lower.includes('.ts') || lower.includes('.m4s') || lower.includes('.mpd') || lower.includes('/hls-') || lower.includes('.vtt')) {
    return true
  }
  if (/\.(mp4|webm|mov|mkv|m3u8|ts|ogg)(\?|$)/i.test(u)) {
    return true
  }
  return false
}

app.get('/api/stream-live', async (req, res) => {
  const rawUrl = req.query.url
  const videoId = req.query.id
  let targetUrl = rawUrl
  let matchedVideo = null

  if (videoId) {
    matchedVideo = findVideo(videoId)
  }
  if (!matchedVideo && rawUrl) {
    matchedVideo = db.videos.find(
      (v) => v.src === rawUrl || v.streamUrl === rawUrl || v.directStreamUrl === rawUrl || (v.embed && rawUrl.includes(v.embed))
    )
  }

  if (matchedVideo && !targetUrl) {
    targetUrl = matchedVideo.embed || matchedVideo.streamUrl || matchedVideo.src
  }

  if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.startsWith('http') || targetUrl.length < 15) {
    return res.status(400).send('Valid Stream URL required')
  }

  async function resolveTarget(u) {
    // If it's already a direct segment or stream chunk, proxy directly without yt-dlp
    if (isDirectMediaFile(u) && !u.includes('view_video.php') && !u.includes('/embed/') && !u.includes('/embedframe/')) {
      return u
    }

    const isTubeSite = /(?:pornhub|redtube|xvideos|spankbang|youtube|youtu\.be|vimeo|pimpbunny)/i.test(u)
    if (isTubeSite) {
      const cached = streamCache.get(u)
      if (cached && Date.now() - cached.time < 5 * 60 * 1000) {
        return cached.url
      }
      const resolved = await resolveDirectMedia(u)
      if (resolved.ok && resolved.streamUrl) {
        streamCache.set(u, { url: resolved.streamUrl, time: Date.now() })
        if (matchedVideo) {
          matchedVideo.streamUrl = resolved.streamUrl
          matchedVideo.src = resolved.streamUrl
          saveDb(db)
        }
        return resolved.streamUrl
      }
    }
    return u
  }

  let streamUrl = await resolveTarget(targetUrl)

  function proxyStream(urlToProxy, retryCount = 0) {
    // Determine dynamic domain for Referer
    let referer = 'https://www.google.com/'
    if (urlToProxy.includes('phncdn.com') || urlToProxy.includes('pornhub.com')) referer = 'https://www.pornhub.com/'
    else if (urlToProxy.includes('rdtcdn.com') || urlToProxy.includes('redtube.com')) referer = 'https://www.redtube.com/'
    else if (urlToProxy.includes('xvideos.com') || urlToProxy.includes('xvideos-cdn.com')) referer = 'https://www.xvideos.com/'
    else if (urlToProxy.includes('pimpbunny.com')) referer = 'https://pimpbunny.com/'
    else if (urlToProxy.includes('spankbang.com') || urlToProxy.includes('sb-cd.com')) referer = 'https://spankbang.com/'
    else {
      try {
        referer = new URL(urlToProxy).origin + '/'
      } catch {}
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Referer': referer,
      'Accept': '*/*',
    }
    if (req.headers.range) {
      headers['Range'] = req.headers.range
    }

    const client = urlToProxy.startsWith('https') ? https : http
    try {
      const proxyReq = client.get(urlToProxy, { headers }, async (proxyRes) => {
        // Handle HTTP redirects
        if ([301, 302, 303, 307, 308].includes(proxyRes.statusCode) && proxyRes.headers.location) {
          const redirectUrl = new URL(proxyRes.headers.location, urlToProxy).href
          return proxyStream(redirectUrl, retryCount)
        }

        // If upstream rejected the token (403 / 404 / 410) and we can re-resolve the source
        if ((proxyRes.statusCode === 403 || proxyRes.statusCode === 404 || proxyRes.statusCode === 410) && retryCount === 0) {
          const sourceToResolve = matchedVideo?.embed || matchedVideo?.streamUrl || (!isDirectMediaFile(targetUrl) ? targetUrl : null)
          if (sourceToResolve) {
            console.log('[stream-live] Upstream token expired/rejected, refreshing stream URL for:', sourceToResolve)
            streamCache.delete(sourceToResolve)
            const fresh = await resolveDirectMedia(sourceToResolve)
            if (fresh.ok && fresh.streamUrl) {
              streamCache.set(sourceToResolve, { url: fresh.streamUrl, time: Date.now() })
              if (matchedVideo) {
                matchedVideo.streamUrl = fresh.streamUrl
                matchedVideo.src = fresh.streamUrl
                saveDb(db)
              }
              return proxyStream(fresh.streamUrl, retryCount + 1)
            }
          }
        }

        const cType = proxyRes.headers['content-type'] || ''
        const isM3u8Text = cType.includes('mpegurl') || urlToProxy.includes('.m3u8')

        if (isM3u8Text) {
          // Rewrite relative segment paths in M3U8 playlist so segments load through /api/stream-live
          let body = ''
          proxyRes.setEncoding('utf8')
          proxyRes.on('data', (chunk) => { body += chunk })
          proxyRes.on('end', () => {
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl')
            res.setHeader('Access-Control-Allow-Origin', '*')
            const rewritten = body.split('\n').map((line) => {
              const trimmed = line.trim()
              if (!trimmed || trimmed.startsWith('#')) return line
              try {
                const fullSegUrl = new URL(trimmed, urlToProxy).href
                return `/api/stream-live?url=${encodeURIComponent(fullSegUrl)}`
              } catch {
                return line
              }
            }).join('\n')
            res.send(rewritten)
          })
          return
        }

        res.status(proxyRes.statusCode)
        for (const [key, value] of Object.entries(proxyRes.headers)) {
          if (['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control'].includes(key.toLowerCase())) {
            res.setHeader(key, value)
          }
        }
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Accept-Ranges', 'bytes')

        proxyRes.pipe(res)
      })

      proxyReq.on('error', (err) => {
        console.error('[stream-live] Proxy error:', err.message)
        if (!res.headersSent) res.status(502).send('Stream relay error')
      })

      req.on('close', () => {
        proxyReq.destroy()
      })
    } catch (err) {
      console.error('[stream-live] Request error:', err.message)
      if (!res.headersSent) res.status(500).send('Stream initialization error')
    }
  }

  proxyStream(streamUrl)
})

app.get('/api/health', (req, res) => res.json({ ok: true, ffmpeg: FFMPEG_OK }))

app.get('/api/resolve-stream', async (req, res) => {
  const url = req.query.url
  if (!url) return res.status(400).json({ error: 'url parameter is required' })
  const result = await resolveDirectMedia(url)
  res.json(result)
})

app.get('/api/videos', (req, res) => {
  res.json(db.videos.map(({ error, ...v }) => v))
})

app.get('/api/videos/:id', (req, res) => {
  const v = findVideo(req.params.id)
  if (!v) return res.status(404).json({ error: 'not found' })
  res.json(v)
})

app.post('/api/videos',
  upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumb', maxCount: 1 }]),
  async (req, res) => {
    const { title, desc, cat, tags, streamUrl, embed, srcType, startTime } = req.body
    if (!title?.trim() || !desc?.trim() || !cat) {
      return res.status(400).json({ error: 'Title, description and category are required.' })
    }
    const isStream = srcType === 'stream' || srcType === 'embed'
    const videoFile = req.files?.video?.[0]
    const thumbFile = req.files?.thumb?.[0]
    if (!isStream && !videoFile) return res.status(400).json({ error: 'No video file received.' })
    let finalStreamUrl = null
    if (isStream) {
      finalStreamUrl = (streamUrl || embed || '').trim()
      if (!finalStreamUrl) return res.status(400).json({ error: 'Enter a stream URL or direct video link.' })
      const iframeSrc = finalStreamUrl.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i)
      if (iframeSrc) finalStreamUrl = iframeSrc[1]
      if (!/^https?:\/\//i.test(finalStreamUrl)) finalStreamUrl = 'https://' + finalStreamUrl
      try { new URL(finalStreamUrl) } catch { return res.status(400).json({ error: 'Invalid stream URL.' }) }
    }
    if (!isStream && !FFMPEG_OK) return res.status(500).json({ error: 'ffmpeg is not installed on the server.' })

    let directStream = null
    if (isStream) {
      const resolved = await resolveDirectMedia(finalStreamUrl)
      if (resolved.ok && resolved.streamUrl) {
        directStream = resolved.streamUrl
      }
    }

    const startOffset = startTime !== undefined && startTime !== '' ? Number(startTime) : 5
    const rec = {
      id: Date.now(),
      title: title.trim(), desc: desc.trim(), cat, tags: (tags || '').trim(),
      creator: (req.body.creator || 'streamvault').trim(),
      views: 0, likes: 0, rating: 0, exclusive: false, q: null,
      createdAt: new Date().toISOString(),
      srcType: isStream ? 'stream' : 'file',
      streamUrl: directStream || finalStreamUrl,
      directStreamUrl: directStream,
      src: directStream || finalStreamUrl,
      embed: finalStreamUrl,
      startTime: Number.isFinite(startOffset) && startOffset >= 0 ? startOffset : 5,
      status: isStream ? 'ready' : 'processing',
      progress: isStream ? 100 : 0,
      dur: isStream ? 'Live / Stream' : '—',
      mins: 0,
      master: videoFile ? path.basename(videoFile.path) : null,
    }
    db.videos.unshift(rec)
    saveDb(db)

    if (!isStream) {
      // transcode in the background; the client polls /api/videos/:id
      processVideo(rec, videoFile.path, thumbFile?.path)
    } else if (thumbFile) {
      const thumbName = `${rec.id}.jpg`
      const thumbPath = path.join(THUMBS, thumbName)
      try {
        await ffmpegRun(['-i', thumbFile.path, '-vf', 'scale=640:-2', '-frames:v', '1', thumbPath])
        rec.thumb = `/thumbs/${thumbName}`
        saveDb(db)
        fs.rmSync(thumbFile.path, { force: true })
      } catch (err) {
        console.error('[thumb] thumbnail generation failed:', err.message)
      }
    }
    res.json(rec)
  })

app.delete('/api/videos/:id', (req, res) => {
  const v = findVideo(req.params.id)
  if (!v) return res.status(404).json({ error: 'not found' })
  db.videos = db.videos.filter((x) => x !== v)
  saveDb(db)
  for (const f of [
    v.master && path.join(UPLOADS, v.master),
    path.join(MEDIA, `${v.id}.mp4`),
    path.join(THUMBS, `${v.id}.jpg`),
  ]) if (f) fs.rmSync(f, { force: true })
  res.json({ ok: true })
})

/* ---------- categories API ---------- */
app.get('/api/categories', (req, res) => {
  db.categories = db.categories || []
  res.json(db.categories)
})

app.post('/api/categories', (req, res) => {
  const { name, slug, desc, emoji } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Category name is required' })
  const cleanSlug = (slug || name).toLowerCase().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '')
  db.categories = db.categories || []
  const existing = db.categories.find((c) => c.slug === cleanSlug)
  if (existing) return res.status(400).json({ error: 'Category with this slug already exists' })
  const newCat = {
    slug: cleanSlug,
    name: name.trim(),
    desc: desc?.trim() || '',
    emoji: emoji?.trim() || '📁',
    count: 0,
    custom: true,
    createdAt: new Date().toISOString(),
  }
  db.categories.push(newCat)
  saveDb(db)
  res.json(newCat)
})

app.delete('/api/categories/:slug', (req, res) => {
  db.categories = db.categories || []
  db.categories = db.categories.filter((c) => c.slug !== req.params.slug)
  saveDb(db)
  res.json({ ok: true })
})

/* ---------- models / creators API ---------- */
app.get('/api/models', (req, res) => {
  db.models = db.models || []
  res.json(db.models)
})

app.post('/api/models', upload.single('avatar'), (req, res) => {
  const { name, id, bio, externalUrl, externalLabel, verified, collab, category, photoUrl } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Model name is required' })
  const cleanId = (id || name).toLowerCase().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '')
  db.models = db.models || []
  const existing = db.models.find((m) => m.id === cleanId)
  if (existing) return res.status(400).json({ error: 'Model with this handle/ID already exists' })

  let avatar = photoUrl || null
  if (req.file) {
    const avatarName = `avatar-${cleanId}-${Date.now()}.jpg`
    const avatarPath = path.join(THUMBS, avatarName)
    try {
      fs.renameSync(req.file.path, avatarPath)
      avatar = `/thumbs/${avatarName}`
    } catch {
      avatar = null
    }
  }

  const newModel = {
    id: cleanId,
    name: name.trim(),
    avatar,
    bio: bio?.trim() || '',
    about: bio?.trim() || '',
    externalUrl: externalUrl?.trim() || '',
    externalLabel: externalLabel?.trim() || 'View Profile',
    verified: verified === 'true' || verified === true,
    collab: collab === 'true' || collab === true,
    category: category?.trim() || 'all',
    subs: '0',
    views: 0,
    videoCount: 0,
    grad: ['#c62b4a', '#8f1d38'],
    custom: true,
    createdAt: new Date().toISOString(),
  }
  db.models.push(newModel)
  saveDb(db)
  res.json(newModel)
})

app.delete('/api/models/:id', (req, res) => {
  db.models = db.models || []
  db.models = db.models.filter((m) => m.id !== req.params.id)
  saveDb(db)
  res.json({ ok: true })
})

/* ---------- Chrome Extension 1-Click Remote Ingest ---------- */
app.post('/api/remote-import', async (req, res) => {
  const { mediaUrl, title, desc, cat, creator, tags, startTime, thumbUrl, pageUrl } = req.body
  if (!mediaUrl?.trim()) return res.status(400).json({ error: 'mediaUrl is required' })

  const id = Date.now()
  const cleanTitle = (title || 'Imported Video').trim().slice(0, 120)
  const cleanDesc = (desc || `Imported from ${pageUrl || 'web source'}`).trim()
  const cleanCat = (cat || 'exclusive').toLowerCase()
  const cleanCreator = (creator || 'streamvault').toLowerCase()
  const st = typeof startTime === 'number' ? startTime : Number(startTime) || 5

  const rec = {
    id,
    title: cleanTitle,
    desc: cleanDesc,
    cat: cleanCat,
    creator: cleanCreator,
    tags: tags || 'imported, web, streamvault',
    srcType: 'file',
    status: 'downloading',
    progress: 5,
    views: 0,
    likes: 0,
    rating: 0,
    startTime: st,
    exclusive: false,
    createdAt: new Date().toISOString(),
    dur: '0:00',
    mins: 0,
    uploaded: true,
  }

  db.videos.unshift(rec)
  saveDb(db)

  // Respond right away so the Chrome Extension gets immediate feedback
  res.json({ ok: true, id, video: rec, watchUrl: `http://localhost:5174/watch/${id}` })

  // Download and transcode in background
  ;(async () => {
    try {
      const masterName = `${id}-import.mp4`
      const masterPath = path.join(UPLOADS, masterName)

      // Determine appropriate Referer header
      let referer = pageUrl || 'https://pimpbunny.com/'
      if (mediaUrl.includes('pimpbunny.com')) referer = 'https://pimpbunny.com/'

      const downloadFile = (srcUrl, destPath) => {
        return new Promise((resolve, reject) => {
          const client = srcUrl.startsWith('https') ? https : http
          const headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Referer': referer,
            'Accept': '*/*',
          }
          client.get(srcUrl, { headers }, (response) => {
            if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
              const redirect = new URL(response.headers.location, srcUrl).href
              return downloadFile(redirect, destPath).then(resolve).catch(reject)
            }
            if (response.statusCode !== 200 && response.statusCode !== 206) {
              return reject(new Error(`Download failed with HTTP ${response.statusCode}`))
            }
            const fileStream = fs.createWriteStream(destPath)
            response.pipe(fileStream)
            fileStream.on('finish', () => {
              fileStream.close()
              resolve()
            })
            fileStream.on('error', reject)
          }).on('error', reject)
        })
      }

      console.log(`[remote-import] Downloading media for: ${cleanTitle} from ${mediaUrl}`)
      await downloadFile(mediaUrl, masterPath)

      // Optional thumbnail download
      let thumbPath = null
      if (thumbUrl && /^https?:\/\//i.test(thumbUrl)) {
        try {
          const tempThumb = path.join(THUMBS, `temp-${id}.jpg`)
          await downloadFile(thumbUrl, tempThumb)
          thumbPath = tempThumb
        } catch (err) {
          console.warn('[remote-import] Thumbnail download failed, will generate from video:', err.message)
        }
      }

      rec.status = 'transcoding'
      rec.progress = 20
      saveDb(db)

      if (FFMPEG_OK) {
        await processVideo(rec, masterPath, thumbPath)
      } else {
        // Fallback without ffmpeg
        const webName = `${id}.mp4`
        const webPath = path.join(MEDIA, webName)
        fs.copyFileSync(masterPath, webPath)
        rec.status = 'ready'
        rec.progress = 100
        rec.src = `/media/${webName}`
        saveDb(db)
      }
      console.log(`[remote-import] Finished import successfully for: ${cleanTitle}`)
    } catch (err) {
      console.error('[remote-import] Error processing video import:', err.message)
      rec.status = 'failed'
      rec.error = err.message
      saveDb(db)
    }
  })()
})

/* serve the built frontend when dist/ exists (production mode) */
const DIST = path.join(__dirname, '..', 'dist')
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST))
  app.get(/^(?!\/(api|media|thumbs)\/).*/, (req, res) => res.sendFile(path.join(DIST, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`StreamVault backend on http://localhost:${PORT}  (ffmpeg: ${FFMPEG_OK ? 'available' : 'MISSING'})`)
})
