import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Upload, FolderKanban, Cog, LogOut, Lock, Clapperboard,
  ServerOff, Loader2, CheckCircle2, XCircle, Camera, Radio, Tv,
  Clock, Play, Pause, RotateCcw, Check, Users, Plus, Trash2, Tag, Star,
  ExternalLink, Sparkles, Crown, Image,
} from 'lucide-react'
import StreamPlayer from '../components/StreamPlayer.jsx'
import { CATEGORIES, catOf, fmtViews } from '../data/catalog.js'
import { useCatalog } from '../lib/CatalogContext.jsx'
import { apiPublish, apiGetVideo, apiDeleteVideo } from '../lib/api.js'
import { isAdmin, setAdmin, store, storeSet } from '../lib/store.js'
import { resolveStreamUrl } from '../lib/streamUtils.js'

const fmtMB = (b) => (b / 1e6).toFixed(1) + ' MB'

export default function Admin() {
  const nav = useNavigate()
  const {
    videos, serverVideos, categories, models, creators,
    serverOnline, ffmpeg, refresh,
    addCategory, deleteCategory, addModel, deleteModel,
  } = useCatalog()

  if (!isAdmin()) {
    return (
      <div className="container">
        <div className="form-card">
          <h1><Lock size={20} /> Admin area</h1>
          <p className="sub">You need to sign in to access the studio panel.</p>
          <Link className="btn btn-solid" to="/login">Go to Sign In</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="admin-wrap">
        <nav className="admin-nav">
          <a href="#dashboard" className="active"><LayoutDashboard size={16} /> Dashboard</a>
          <a href="#upload"><Upload size={16} /> Upload Video</a>
          <a href="#manage"><FolderKanban size={16} /> Manage Videos</a>
          <a href="#directories"><Users size={16} /> Models & Categories</a>
          <a href="#pipeline"><Cog size={16} /> Encoding Pipeline</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setAdmin(false); nav('/') }}>
            <LogOut size={16} /> Sign Out
          </a>
        </nav>
        <div>
          {!serverOnline && (
            <div className="notice warn" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <ServerOff size={18} style={{ color: 'var(--gold)' }} />
              <span>
                <strong>Backend offline.</strong> Uploads need the API server — run{' '}
                <code>npm run dev:full</code> (or <code>npm run server</code> in a second terminal),
                then reload this page.
              </span>
            </div>
          )}
          {serverOnline && !ffmpeg && (
            <div className="notice warn">
              <strong>ffmpeg not found on the server.</strong> File transcoding is disabled — install
              it with <code>brew install ffmpeg</code>. Stream publishing still works.
            </div>
          )}
          <Stats videos={videos} mine={serverVideos.length} />
          <UploadPanel
            disabled={!serverOnline}
            onPublished={refresh}
            categories={categories}
            models={models}
            creators={creators}
            onAddCategory={addCategory}
            onAddModel={addModel}
          />
          <ManagePanel rows={[...serverVideos, ...videos.filter((v) => !v.uploaded)]} onChanged={refresh} />
          <DirectoryPanel
            categories={categories}
            models={models}
            onAddCategory={addCategory}
            onDeleteCategory={deleteCategory}
            onAddModel={addModel}
            onDeleteModel={deleteModel}
          />
          <PipelinePanel />
        </div>
      </div>
    </div>
  )
}

function Stats({ videos, mine }) {
  const views = videos.reduce((s, v) => s + v.views, 0)
  const likes = videos.reduce((s, v) => s + v.likes, 0)
  return (
    <section id="dashboard">
      <h1 style={{ fontSize: 26, marginBottom: 18 }}>Studio Dashboard</h1>
      <div className="stat-row">
        <div className="stat"><div className="num">{videos.length}</div><div className="lbl">Published videos</div></div>
        <div className="stat"><div className="num">{mine}</div><div className="lbl">Your uploads</div></div>
        <div className="stat"><div className="num">{fmtViews(views)}</div><div className="lbl">Total views</div></div>
        <div className="stat"><div className="num">{fmtViews(likes)}</div><div className="lbl">Total likes</div></div>
      </div>
    </section>
  )
}

function UploadPanel({ disabled, onPublished, categories, models, creators, onAddCategory, onAddModel }) {
  const [form, setForm] = useState({ title: '', desc: '', cat: '', creator: 'streamvault', tags: '', streamUrl: '', startTime: 5 })
  const [srcType, setSrcType] = useState('file')
  const [selectedThumb, setSelectedThumb] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [phase, setPhase] = useState('idle')
  const [uploadPct, setUploadPct] = useState(0)
  const [transcodePct, setTranscodePct] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  // Quick inline creation states
  const [showNewCatModal, setShowNewCatModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatEmoji, setNewCatEmoji] = useState('🔥')
  const [catCreating, setCatCreating] = useState(false)

  const [showNewModelModal, setShowNewModelModal] = useState(false)
  const [newModelForm, setNewModelForm] = useState({
    name: '',
    id: '',
    bio: '',
    externalUrl: '',
    externalLabel: 'VIEW CHANNEL',
    category: 'exclusive',
    verified: true,
    collab: false,
    photoUrl: '',
  })
  const [modelCreating, setModelCreating] = useState(false)

  const videoRef = useRef()
  const pollRef = useRef()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  useEffect(() => () => clearInterval(pollRef.current), [])

  function reset() {
    setForm({ title: '', desc: '', cat: '', creator: 'streamvault', tags: '', streamUrl: '', startTime: 5 })
    setSelectedThumb(null)
    setVideoFile(null)
    if (videoRef.current) videoRef.current.value = ''
  }

  async function handleQuickAddCat() {
    if (!newCatName.trim()) return
    setCatCreating(true)
    try {
      const created = await onAddCategory({
        name: newCatName.trim(),
        emoji: newCatEmoji.trim() || '🔥',
      })
      setForm((prev) => ({ ...prev, cat: created.slug }))
      setNewCatName('')
      setShowNewCatModal(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setCatCreating(false)
    }
  }

  async function handleQuickAddModel() {
    if (!newModelForm.name.trim()) return
    setModelCreating(true)
    try {
      const created = await onAddModel(newModelForm)
      setForm((prev) => ({ ...prev, creator: created.id }))
      setNewModelForm({
        name: '', id: '', bio: '', externalUrl: '', externalLabel: 'VIEW CHANNEL',
        category: 'exclusive', verified: true, collab: false, photoUrl: '',
      })
      setShowNewModelModal(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setModelCreating(false)
    }
  }

  async function publish() {
    setError(''); setResult(null)
    if (!form.title.trim() || !form.desc.trim() || !form.cat) {
      setError('Title, description and category are required.'); return
    }
    if (srcType === 'file' && !videoFile) { setError('Choose a video file.'); return }
    let streamUrl = ''
    if (srcType === 'stream') {
      const n = resolveStreamUrl(form.streamUrl)
      if (n.error) { setError(n.error); return }
      streamUrl = n.url
    }

    try {
      setPhase('uploading'); setUploadPct(0)
      let thumb = null
      if (selectedThumb?.blob) {
        thumb = selectedThumb.blob instanceof File
          ? selectedThumb.blob
          : new File([selectedThumb.blob], 'thumbnail.jpg', { type: 'image/jpeg' })
      }

      const st = typeof form.startTime === 'number' ? form.startTime : Number(form.startTime) || 5
      let rec
      try {
        rec = await apiPublish(
          { ...form, streamUrl, srcType, startTime: st },
          { video: srcType === 'file' ? videoFile : null, thumb },
          setUploadPct,
        )
      } catch (err) {
        if (srcType === 'stream') {
          rec = {
            id: Date.now(),
            title: form.title.trim(),
            desc: form.desc.trim(),
            cat: form.cat,
            creator: form.creator || 'streamvault',
            tags: form.tags.trim(),
            srcType: 'stream',
            streamUrl,
            src: streamUrl,
            embed: streamUrl,
            thumb: selectedThumb?.url || null,
            startTime: st,
            status: 'ready',
            progress: 100,
            views: 0,
            likes: 0,
            rating: 0,
            exclusive: false,
            createdAt: new Date().toISOString(),
            dur: 'Live / Stream',
            mins: 0,
            uploaded: true,
          }
        } else {
          throw err
        }
      }

      // Save to local storage mirror so it appears everywhere immediately
      const local = store('sv-admin-videos', [])
      const nextList = [rec, ...local.filter((x) => String(x.id) !== String(rec.id))]
      storeSet('sv-admin-videos', nextList)

      if (srcType === 'stream' || rec.status === 'ready') {
        setPhase('done'); setResult(rec); reset(); onPublished(); return
      }
      // poll transcode progress
      setPhase('transcoding'); setTranscodePct(0)
      pollRef.current = setInterval(async () => {
        try {
          const v = await apiGetVideo(rec.id)
          setTranscodePct(v.progress || 0)
          if (v.status === 'ready') {
            clearInterval(pollRef.current)
            setPhase('done'); setResult(v); reset(); onPublished()
          } else if (v.status === 'failed') {
            clearInterval(pollRef.current)
            setPhase('error'); setError('Transcoding failed on the server — check the server logs.')
          }
        } catch { /* keep polling */ }
      }, 1000)
    } catch (e) {
      setPhase('error'); setError(e.message)
    }
  }

  const busy = phase === 'uploading' || phase === 'transcoding'
  return (
    <section className="panel" id="upload">
      <h2><Upload size={18} /> Upload a Video</h2>
      <div className="field"><label>Title *</label>
        <input maxLength={120} placeholder="A clear, descriptive title" value={form.title} onChange={set('title')} disabled={busy} /></div>
      <div className="field"><label>Full description *</label>
        <textarea placeholder="Everything viewers should know — shown on the watch page and used for search." value={form.desc} onChange={set('desc')} disabled={busy} /></div>

      {/* Category Field with Inline Creation */}
      <div className="field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ margin: 0 }}>Category *</label>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setShowNewCatModal(!showNewCatModal)}
            disabled={busy}
          >
            <Plus size={13} /> {showNewCatModal ? 'Cancel' : '+ New Category'}
          </button>
        </div>
        <select value={form.cat} onChange={set('cat')} disabled={busy}>
          <option value="">Select a category…</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.emoji ? c.emoji + ' ' : ''}{c.name}</option>)}
        </select>

        {showNewCatModal && (
          <div className="admin-inline-box">
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Tag size={14} style={{ color: 'var(--brand)' }} /> Create New Category
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                placeholder="Category Name (e.g. Bunnies, 4K, Cosplay)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                style={{ flex: 1, minWidth: 200 }}
              />
              <input
                placeholder="Emoji (e.g. 🐰, 🎬)"
                value={newCatEmoji}
                onChange={(e) => setNewCatEmoji(e.target.value)}
                style={{ width: 110 }}
              />
              <button
                type="button"
                className="btn btn-solid"
                style={{ fontSize: 12.5, padding: '6px 14px' }}
                onClick={handleQuickAddCat}
                disabled={catCreating || !newCatName.trim()}
              >
                {catCreating ? 'Saving…' : 'Save Category'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Model / Creator Attribution Field with Inline Creation */}
      <div className="field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ margin: 0 }}>Model / Creator *</label>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setShowNewModelModal(!showNewModelModal)}
            disabled={busy}
          >
            <Plus size={13} /> {showNewModelModal ? 'Cancel' : '+ New Model / Creator'}
          </button>
        </div>
        <select value={form.creator} onChange={set('creator')} disabled={busy}>
          <option value="streamvault">StreamVault Studio (Official)</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              ⭐ {m.name} {m.verified ? '✓' : ''} ({m.category || 'model'})
            </option>
          ))}
          {creators.filter((c) => !models.some((m) => m.id === c.id) && c.id !== 'streamvault').map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {showNewModelModal && (
          <div className="admin-inline-box">
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={14} style={{ color: 'var(--brand)' }} /> Add New Model Profile
            </div>
            <div className="admin-inline-grid">
              <div>
                <label style={{ fontSize: 11.5, color: 'var(--muted)' }}>Model Name *</label>
                <input
                  placeholder="e.g. Dainty Wilder"
                  value={newModelForm.name}
                  onChange={(e) => setNewModelForm({ ...newModelForm, name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 11.5, color: 'var(--muted)' }}>Profile Photo URL</label>
                <input
                  placeholder="https://.../photo.jpg"
                  value={newModelForm.photoUrl}
                  onChange={(e) => setNewModelForm({ ...newModelForm, photoUrl: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 11.5, color: 'var(--muted)' }}>Channel / Social Link (Optional)</label>
                <input
                  placeholder="https://..."
                  value={newModelForm.externalUrl}
                  onChange={(e) => setNewModelForm({ ...newModelForm, externalUrl: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 11.5, color: 'var(--muted)' }}>Primary Category</label>
                <select
                  value={newModelForm.category}
                  onChange={(e) => setNewModelForm({ ...newModelForm, category: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 11.5, color: 'var(--muted)' }}>Bio / Description</label>
              <input
                placeholder="Model bio, exclusive content info…"
                value={newModelForm.bio}
                onChange={(e) => setNewModelForm({ ...newModelForm, bio: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newModelForm.verified}
                    onChange={(e) => setNewModelForm({ ...newModelForm, verified: e.target.checked })}
                  /> Verified Badge
                </label>
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newModelForm.collab}
                    onChange={(e) => setNewModelForm({ ...newModelForm, collab: e.target.checked })}
                  /> Collab Available
                </label>
              </div>
              <button
                type="button"
                className="btn btn-solid"
                style={{ fontSize: 12.5, padding: '6px 14px' }}
                onClick={handleQuickAddModel}
                disabled={modelCreating || !newModelForm.name.trim()}
              >
                {modelCreating ? 'Saving…' : 'Save Model Profile'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="field"><label>Tags</label>
        <input placeholder="Comma-separated, e.g. travel, street food, exclusive" value={form.tags} onChange={set('tags')} disabled={busy} /></div>

      {/* 1. Video Source Field (File Upload or Stream / OBS Link) */}
      <div className="field">
        <label>Video source *</label>
        <div className="radio-row">
          <label className="radio-pill">
            <input type="radio" name="src" checked={srcType === 'file'} onChange={() => setSrcType('file')} disabled={busy} /> Upload a file
          </label>
          <label className="radio-pill">
            <input type="radio" name="src" checked={srcType === 'stream'} onChange={() => setSrcType('stream')} disabled={busy} /> 📡 Stream URL (OBS / .m3u8 / Direct Link)
          </label>
        </div>
      </div>
      {srcType === 'file' ? (
        <div className="field" key="src-file">
          <input type="file" ref={videoRef} accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
            onChange={(e) => setVideoFile(e.target.files[0] || null)} disabled={busy} />
          <div className="hint">
            MP4 / MOV / WEBM / MKV up to 10 GB. The server keeps your untouched master and transcodes a web-ready version.
            {videoFile && <> Selected: <strong>{videoFile.name}</strong> ({fmtMB(videoFile.size)})</>}
          </div>
        </div>
      ) : (
        <div className="field" key="src-stream">
          <input placeholder="https://example.com/live/stream.m3u8 or https://domain.com/video.mp4" value={form.streamUrl} onChange={set('streamUrl')} disabled={busy} />
          <div className="hint">
            Enter an OBS live stream output (e.g. HLS <code>.m3u8</code> stream URL) or any direct video link (<code>.mp4</code>, <code>.webm</code>, CDN streaming link).
          </div>
          <StreamPreview raw={form.streamUrl} />
        </div>
      )}

      {/* 2. YouTube-Style Thumbnail Selection (Comes AFTER Video Source) */}
      <YouTubeThumbnailSelector
        srcType={srcType}
        videoFile={videoFile}
        streamUrl={form.streamUrl}
        selectedThumb={selectedThumb}
        onSelectThumb={setSelectedThumb}
        disabled={busy}
      />

      {/* 3. Start Timestamp & Intro Skip Selector (With Live Preview) */}
      <StartTimestampPicker
        srcType={srcType}
        videoFile={videoFile}
        streamUrl={form.streamUrl}
        startTime={form.startTime}
        onChange={(val) => setForm((prev) => ({ ...prev, startTime: val }))}
        disabled={busy}
      />

      <div className="notice" style={{ marginTop: 20 }}>
        By publishing you certify that you own or hold written licenses for this content, that every
        performer gave documented consent and age verification per the{' '}
        <Link to="/content-submission-guidelines">Submission Guidelines</Link> and{' '}
        <Link to="/2257">record-keeping requirements</Link>, and that it complies with the{' '}
        <Link to="/content-guidelines">Content Guidelines</Link>.
      </div>

      {phase === 'uploading' && <Progress label={`Uploading… ${uploadPct}%`} pct={uploadPct} />}
      {phase === 'transcoding' && <Progress label={`Transcoding on server… ${transcodePct}%`} pct={transcodePct} spinning />}
      {phase === 'done' && result && (
        <p className="msg-ok" style={{ margin: '10px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
          <CheckCircle2 size={17} /> Published! It's now live across the site.
          {result.originalBytes && (
            <> Compressed {fmtMB(result.originalBytes)} → {fmtMB(result.outputBytes)} (
              {Math.round((1 - result.outputBytes / result.originalBytes) * 100)}% smaller).</>
          )}
        </p>
      )}
      {error && (
        <p className="msg-err" style={{ margin: '10px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
          <XCircle size={17} /> {error}
        </p>
      )}

      <button className="btn btn-solid" onClick={publish} disabled={busy || disabled}>
        {busy ? <><Loader2 size={15} className="spin" /> Working…</> : 'Publish Video'}
      </button>
    </section>
  )
}

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/* YouTube-style thumbnail selection component with auto-generated frames,
   custom frame-by-frame scrubber, and file upload card */
function YouTubeThumbnailSelector({ srcType, videoFile, streamUrl, selectedThumb, onSelectThumb, disabled }) {
  const hiddenVideoRef = useRef(null)
  const scrubberVideoRef = useRef(null)
  const fileInputRef = useRef(null)
  const [videoSrc, setVideoSrc] = useState(null)
  const [duration, setDuration] = useState(0)
  const [scrubTime, setScrubTime] = useState(0)
  const [autoFrames, setAutoFrames] = useState([])
  const [collageThumb, setCollageThumb] = useState(null)
  const [isPortrait, setIsPortrait] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [customFrame, setCustomFrame] = useState(null)
  const [showScrubber, setShowScrubber] = useState(false)

  // Resolve media source for frame extraction
  useEffect(() => {
    let active = true
    let blobUrl = null

    if (srcType === 'file' && videoFile) {
      blobUrl = URL.createObjectURL(videoFile)
      setVideoSrc(blobUrl)
      setAutoFrames([])
      setCollageThumb(null)
      setCustomFrame(null)
    } else if (srcType === 'stream' && streamUrl?.trim()) {
      const n = resolveStreamUrl(streamUrl)
      if (!n.error && n.url) {
        const urlToUse = n.isDirect ? n.url : `/api/stream-live?url=${encodeURIComponent(n.url)}`
        setVideoSrc(urlToUse)
        setAutoFrames([])
        setCollageThumb(null)
        setCustomFrame(null)
      } else {
        setVideoSrc(null)
      }
    } else {
      setVideoSrc(null)
      setAutoFrames([])
      setCollageThumb(null)
      setCustomFrame(null)
    }

    return () => {
      active = false
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [srcType, videoFile, streamUrl])

  // Helper to draw an image/video with object-fit: cover inside a target rectangle
  function drawCover(ctx, img, dx, dy, dw, dh) {
    const sw = img.videoWidth || img.width
    const sh = img.videoHeight || img.height
    if (!sw || !sh) return
    const imgAspect = sw / sh
    const targetAspect = dw / dh
    let sx, sy, sWidth, sHeight
    if (imgAspect > targetAspect) {
      sHeight = sh
      sWidth = sHeight * targetAspect
      sx = (sw - sWidth) / 2
      sy = 0
    } else {
      sWidth = sw
      sHeight = sWidth / targetAspect
      sx = 0
      sy = (sh - sHeight) / 2
    }
    ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dw, dh)
  }

  // Extract snapshot at timestamp into canvas blob
  function captureFrameFromVideo(videoEl) {
    if (!videoEl || !videoEl.videoWidth) return null
    const w = Math.min(1280, videoEl.videoWidth)
    const h = Math.round((w * videoEl.videoHeight) / videoEl.videoWidth)
    const cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const ctx = cv.getContext('2d')
    try {
      ctx.drawImage(videoEl, 0, 0, w, h)
      return new Promise((resolve) => {
        cv.toBlob((b) => {
          if (b) {
            resolve({ blob: b, url: URL.createObjectURL(b), canvas: cv })
          } else {
            resolve(null)
          }
        }, 'image/jpeg', 0.88)
      })
    } catch {
      return null
    }
  }

  // Create a 3-Panel Collage (16:9 composed of 3 vertical 9:16 frames side-by-side)
  async function generateThreePanelCollage(dur) {
    if (!hiddenVideoRef.current || dur <= 0) return null
    const v = hiddenVideoRef.current
    const points = [
      Math.max(0.5, dur * 0.18),
      Math.max(1.0, dur * 0.50),
      Math.max(1.5, dur * 0.82),
    ]

    const capturedCanvases = []
    for (let i = 0; i < points.length; i++) {
      const targetTime = points[i]
      try {
        await new Promise((resolve) => {
          const onSeeked = () => {
            v.removeEventListener('seeked', onSeeked)
            resolve()
          }
          v.addEventListener('seeked', onSeeked)
          v.currentTime = targetTime
        })
        const res = await captureFrameFromVideo(v)
        if (res?.canvas) {
          capturedCanvases.push(res.canvas)
        }
      } catch {}
    }

    if (capturedCanvases.length === 3) {
      const cv = document.createElement('canvas')
      cv.width = 1280
      cv.height = 720
      const ctx = cv.getContext('2d')
      ctx.fillStyle = '#0a0807'
      ctx.fillRect(0, 0, 1280, 720)

      const panelW = 424
      const gap = 2

      // Panel 1 (Left)
      drawCover(ctx, capturedCanvases[0], 0, 0, panelW, 720)
      // Panel 2 (Center)
      drawCover(ctx, capturedCanvases[1], panelW + gap, 0, panelW, 720)
      // Panel 3 (Right)
      drawCover(ctx, capturedCanvases[2], (panelW + gap) * 2, 0, panelW, 720)

      // Thin separator lines
      ctx.fillStyle = '#1c1511'
      ctx.fillRect(panelW, 0, gap, 720)
      ctx.fillRect(panelW * 2 + gap, 0, gap, 720)

      return new Promise((resolve) => {
        cv.toBlob((b) => {
          if (b) {
            const url = URL.createObjectURL(b)
            const collageObj = {
              type: 'collage',
              id: 'collage-3panel',
              url,
              blob: b,
              label: '3-Panel 9:16 Collage',
            }
            setCollageThumb(collageObj)
            resolve(collageObj)
          } else {
            resolve(null)
          }
        }, 'image/jpeg', 0.92)
      })
    }
    return null
  }

  // Auto-generate frames & 3-panel collage once metadata loads
  async function generateAutoFrames(dur, isVertical) {
    if (!hiddenVideoRef.current || dur <= 0 || generating) return
    setGenerating(true)
    const v = hiddenVideoRef.current

    // If 9:16 portrait video (or vertical aspect ratio), generate 3-panel collage first
    let collageResult = null
    if (isVertical) {
      collageResult = await generateThreePanelCollage(dur)
    }

    const points = [
      Math.max(1, dur * 0.15),
      Math.max(2, dur * 0.5),
      Math.max(3, dur * 0.85),
    ]

    const frames = []
    for (let i = 0; i < points.length; i++) {
      const targetTime = points[i]
      try {
        await new Promise((resolve) => {
          const onSeeked = () => {
            v.removeEventListener('seeked', onSeeked)
            resolve()
          }
          v.addEventListener('seeked', onSeeked)
          v.currentTime = targetTime
        })
        const res = await captureFrameFromVideo(v)
        if (res) {
          frames.push({
            id: `auto-${i}`,
            time: targetTime,
            url: res.url,
            blob: res.blob,
            label: `Frame ${i + 1} (${fmtTime(targetTime)})`,
          })
        }
      } catch {}
    }

    setAutoFrames(frames)
    setGenerating(false)

    // Pre-select 3-panel collage for 9:16 videos, or default frame for 16:9 videos
    if (isVertical && collageResult && !selectedThumb) {
      onSelectThumb(collageResult)
    } else if (frames.length > 0 && !selectedThumb) {
      const defaultFrame = frames[1] || frames[0]
      onSelectThumb({
        type: 'auto',
        url: defaultFrame.url,
        blob: defaultFrame.blob,
      })
    }
  }

  function handleLoadedMetadata(e) {
    const dur = e.target.duration || 0
    const vw = e.target.videoWidth || 1920
    const vh = e.target.videoHeight || 1080
    const isVert = vh > vw || (vw / vh) < 0.85
    setIsPortrait(isVert)
    setDuration(dur)
    setScrubTime(Math.min(5, dur / 2))
    generateAutoFrames(dur, isVert)
  }

  // Handle custom frame scrubber
  async function handleCaptureScrubberFrame() {
    if (!scrubberVideoRef.current) return
    const res = await captureFrameFromVideo(scrubberVideoRef.current)
    if (res) {
      setCustomFrame(res)
      onSelectThumb({
        type: 'custom',
        url: res.url,
        blob: res.blob,
      })
    }
  }

  // Handle file input pick
  function handleCustomFile(e) {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      onSelectThumb({
        type: 'upload',
        url,
        blob: file,
      })
    }
  }

  const hasSource = !!(videoFile || streamUrl?.trim())

  return (
    <div className="yt-thumb-section">
      <div className="yt-thumb-title">
        <Camera size={16} style={{ color: 'var(--brand)' }} /> Thumbnail Selection
      </div>
      <div className="yt-thumb-desc">
        Choose a thumbnail that stands out. Select an auto-generated frame from your video, scrub to capture any exact frame, or upload a custom image.
      </div>

      {/* Hidden worker video for extracting auto-frames */}
      {videoSrc && (
        <video
          ref={hiddenVideoRef}
          src={videoSrc}
          muted
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          style={{ display: 'none' }}
          onLoadedMetadata={handleLoadedMetadata}
        />
      )}

      {/* Thumbnail Selection Cards Grid (YouTube Studio Style) */}
      <div className="yt-thumb-grid">
        {/* Card 1: Custom Image Upload Card */}
        <div
          className={`yt-thumb-card ${selectedThumb?.type === 'upload' ? 'active' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div className="preview-box">
            {selectedThumb?.type === 'upload' ? (
              <img src={selectedThumb.url} alt="Custom upload" />
            ) : (
              <div className="yt-custom-upload-card">
                <Upload size={18} />
                <span>Upload Custom Image</span>
              </div>
            )}
            {selectedThumb?.type === 'upload' && (
              <div className="active-badge"><CheckCircle2 size={11} /> Selected</div>
            )}
          </div>
          <div className="card-label">
            <span>Custom file</span>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleCustomFile}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Card: 3-Panel 9:16 Collage Thumbnail Card (Matches attached reference) */}
        {collageThumb && (
          <div
            className={`yt-thumb-card ${selectedThumb?.url === collageThumb.url ? 'active' : ''}`}
            onClick={() => onSelectThumb({ type: 'collage', url: collageThumb.url, blob: collageThumb.blob })}
            role="button"
            tabIndex={0}
            style={{ border: isPortrait ? '2px solid var(--brand)' : undefined }}
          >
            <div className="preview-box">
              <img src={collageThumb.url} alt="3-Panel 9:16 Collage" />
              {selectedThumb?.url === collageThumb.url ? (
                <div className="active-badge"><CheckCircle2 size={11} /> Selected</div>
              ) : isPortrait ? (
                <div className="active-badge" style={{ background: 'linear-gradient(135deg, #e11d48, #be123c)' }}><Sparkles size={11} /> 9:16 Collage</div>
              ) : null}
            </div>
            <div className="card-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, color: 'var(--ink)' }}>
                <Sparkles size={12} style={{ color: 'var(--brand)' }} /> 3-Panel Collage (9:16)
              </span>
            </div>
          </div>
        )}

        {/* Cards: Auto-Generated Frames from Video */}
        {autoFrames.map((f) => {
          const isSelected = selectedThumb?.url === f.url
          return (
            <div
              key={f.id}
              className={`yt-thumb-card ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectThumb({ type: 'auto', url: f.url, blob: f.blob })}
              role="button"
              tabIndex={0}
            >
              <div className="preview-box">
                <img src={f.url} alt={f.label} />
                {isSelected && (
                  <div className="active-badge"><CheckCircle2 size={11} /> Selected</div>
                )}
              </div>
              <div className="card-label">
                <span>{f.label}</span>
              </div>
            </div>
          )
        })}

        {/* Card 5: Custom Captured Frame from Scrubber */}
        {customFrame && (
          <div
            className={`yt-thumb-card ${selectedThumb?.type === 'custom' ? 'active' : ''}`}
            onClick={() => onSelectThumb({ type: 'custom', url: customFrame.url, blob: customFrame.blob })}
            role="button"
            tabIndex={0}
          >
            <div className="preview-box">
              <img src={customFrame.url} alt="Captured frame" />
              {selectedThumb?.type === 'custom' && (
                <div className="active-badge"><CheckCircle2 size={11} /> Selected</div>
              )}
            </div>
            <div className="card-label">
              <span>Captured frame</span>
            </div>
          </div>
        )}

        {/* Loading placeholders while extracting frames */}
        {generating && autoFrames.length === 0 && (
          <div className="yt-thumb-card" style={{ opacity: 0.7, pointerEvents: 'none' }}>
            <div className="preview-box">
              <Loader2 size={20} className="spin" style={{ color: 'var(--brand)' }} />
            </div>
            <div className="card-label">
              <span>Generating frames…</span>
            </div>
          </div>
        )}
      </div>

      {!hasSource && (
        <div className="hint" style={{ marginTop: 6 }}>
          💡 Add a video file or stream URL above to automatically generate frame snapshots from the video.
        </div>
      )}

      {/* Frame Scrubber Toggle & Picker */}
      {hasSource && (
        <div className="yt-scrubber-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
              Frame-by-Frame Picker
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '4px 12px' }}
              onClick={() => setShowScrubber(!showScrubber)}
            >
              {showScrubber ? 'Close Frame Scrubber' : '🔍 Scrub exact video frame'}
            </button>
          </div>

          {showScrubber && (
            <div style={{ background: 'var(--dark)', padding: 14, borderRadius: 10, border: '1px solid var(--line)' }}>
              {videoSrc && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                  <div style={{ aspectRatio: '16/9', width: '100%', maxWidth: 360, background: '#000', borderRadius: 8, overflow: 'hidden' }}>
                    <video
                      ref={scrubberVideoRef}
                      src={videoSrc}
                      muted
                      playsInline
                      preload="auto"
                      crossOrigin="anonymous"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onLoadedMetadata={(e) => {
                        if (e.target.duration) setDuration(e.target.duration)
                      }}
                    />
                  </div>

                  {duration > 0 && (
                    <div style={{ width: '100%', maxWidth: 420, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="range"
                        min={0}
                        max={duration}
                        step={0.1}
                        value={scrubTime}
                        onChange={(e) => {
                          const val = +e.target.value
                          setScrubTime(val)
                          if (scrubberVideoRef.current) scrubberVideoRef.current.currentTime = val
                        }}
                        style={{ flex: 1 }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 70, textAlign: 'right', color: 'var(--faint)' }}>
                        {fmtTime(scrubTime)} / {fmtTime(duration)}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: 12.5, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={handleCaptureScrubberFrame}
                  >
                    <Camera size={14} /> Set this frame as thumbnail
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* Interactive Start Timestamp Picker with live video preview, presets, scrubber, and exact MM:SS input */
function StartTimestampPicker({ srcType, videoFile, streamUrl, startTime, onChange, disabled }) {
  const previewVideoRef = useRef(null)
  const [videoSrc, setVideoSrc] = useState(null)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentPlayTime, setCurrentPlayTime] = useState(0)
  const [customText, setCustomText] = useState('')

  const numericStartTime = typeof startTime === 'number' && !isNaN(startTime) ? Math.max(0, startTime) : 5

  // Sync media source
  useEffect(() => {
    let blobUrl = null
    if (srcType === 'file' && videoFile) {
      blobUrl = URL.createObjectURL(videoFile)
      setVideoSrc(blobUrl)
    } else if (srcType === 'stream' && streamUrl?.trim()) {
      const n = resolveStreamUrl(streamUrl)
      if (!n.error && n.url) {
        const urlToUse = n.isDirect ? n.url : `/api/stream-live?url=${encodeURIComponent(n.url)}`
        setVideoSrc(urlToUse)
      } else {
        setVideoSrc(null)
      }
    } else {
      setVideoSrc(null)
    }

    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [srcType, videoFile, streamUrl])

  // Keep preview video in sync when startTime changes
  useEffect(() => {
    if (previewVideoRef.current && !isPlaying) {
      previewVideoRef.current.currentTime = numericStartTime
    }
    setCustomText(fmtTime(numericStartTime))
  }, [numericStartTime, isPlaying])

  const handleTimeUpdate = (e) => {
    setCurrentPlayTime(e.target.currentTime)
  }

  const handleLoadedMetadata = (e) => {
    const dur = e.target.duration || 0
    setDuration(dur)
    if (previewVideoRef.current) {
      previewVideoRef.current.currentTime = numericStartTime
    }
  }

  const togglePlay = () => {
    if (!previewVideoRef.current) return
    if (previewVideoRef.current.paused) {
      previewVideoRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
    } else {
      previewVideoRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleSetCurrentAsStart = () => {
    if (!previewVideoRef.current) return
    const cur = Math.max(0, Math.floor(previewVideoRef.current.currentTime * 10) / 10)
    onChange(cur)
  }

  const handleSeek = (timeInSeconds) => {
    const clamped = Math.max(0, timeInSeconds)
    onChange(clamped)
    if (previewVideoRef.current) {
      previewVideoRef.current.currentTime = clamped
    }
  }

  const handleCustomTextChange = (e) => {
    const val = e.target.value
    setCustomText(val)
    // Try parsing mm:ss or pure seconds
    const parts = val.split(':')
    if (parts.length === 2) {
      const m = parseInt(parts[0], 10)
      const s = parseFloat(parts[1])
      if (!isNaN(m) && !isNaN(s) && m >= 0 && s >= 0) {
        const total = m * 60 + s
        onChange(total)
        if (previewVideoRef.current) previewVideoRef.current.currentTime = total
      }
    } else {
      const num = parseFloat(val)
      if (!isNaN(num) && num >= 0) {
        onChange(num)
        if (previewVideoRef.current) previewVideoRef.current.currentTime = num
      }
    }
  }

  const presets = [
    { label: '0:00 (Start)', seconds: 0 },
    { label: '0:05 (Default)', seconds: 5 },
    { label: '0:10', seconds: 10 },
    { label: '0:15', seconds: 15 },
    { label: '0:30', seconds: 30 },
    { label: '1:00', seconds: 60 },
  ]

  const maxSliderTime = duration > 0 ? duration : Math.max(120, numericStartTime + 30)

  return (
    <div className="start-time-section">
      <div className="start-time-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} style={{ color: 'var(--brand)' }} />
          <strong style={{ fontSize: 14 }}>Custom Start Timestamp & Intro Skip</strong>
        </div>
        <div style={{
          background: 'var(--brand-soft)',
          color: 'var(--brand)',
          padding: '4px 10px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}>
          🎯 Starts at: {fmtTime(numericStartTime)} ({numericStartTime}s)
        </div>
      </div>

      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 12px 0' }}>
        Configure where viewers begin watching. Viewers automatically start playback from this timestamp and cannot seek backwards before it.
      </p>

      {/* Preset Quick-Select Pills */}
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--faint)' }}>Quick Presets:</span>
        <div className="start-time-presets">
          {presets.map((p) => {
            const isSelected = numericStartTime === p.seconds
            return (
              <button
                key={p.seconds}
                type="button"
                className={`preset-btn ${isSelected ? 'active' : ''}`}
                onClick={() => handleSeek(p.seconds)}
                disabled={disabled}
              >
                {isSelected && <Check size={12} style={{ marginRight: 4 }} />}
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Live Video Preview Box */}
      {videoSrc ? (
        <div style={{
          background: '#0d0b0a',
          padding: 14,
          borderRadius: 10,
          border: '1px solid var(--line)',
          marginBottom: 14,
        }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{
              width: '100%',
              maxWidth: 320,
              aspectRatio: '16/9',
              background: '#000',
              borderRadius: 8,
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}>
              <video
                ref={previewVideoRef}
                src={videoSrc}
                playsInline
                muted
                preload="metadata"
                crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              <div style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                background: 'rgba(0,0,0,0.75)',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
              }}>
                Preview Time: {fmtTime(isPlaying ? currentPlayTime : numericStartTime)}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={togglePlay}
                  disabled={disabled}
                >
                  {isPlaying ? <><Pause size={14} /> Pause Preview</> : <><Play size={14} /> Play Preview</>}
                </button>
                <button
                  type="button"
                  className="btn btn-solid"
                  style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={handleSetCurrentAsStart}
                  disabled={disabled}
                >
                  📍 Set current preview as Start Time
                </button>
              </div>

              {/* Slider Scrub Bar */}
              <div style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                  <span>Timeline Scrubber</span>
                  <span style={{ fontWeight: 700, color: 'var(--ink)' }}>
                    {fmtTime(numericStartTime)} {duration > 0 ? `/ ${fmtTime(duration)}` : ''}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={maxSliderTime}
                  step={0.5}
                  value={numericStartTime}
                  onChange={(e) => handleSeek(+e.target.value)}
                  disabled={disabled}
                  style={{ width: '100%', accentColor: 'var(--brand)' }}
                />
              </div>

              {/* Manual exact text input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  Exact time (MM:SS or sec):
                </label>
                <input
                  type="text"
                  value={customText}
                  placeholder="0:05"
                  onChange={handleCustomTextChange}
                  disabled={disabled}
                  style={{
                    width: 90,
                    padding: '4px 8px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    textAlign: 'center',
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 6,
                    color: 'var(--ink)',
                  }}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 11, padding: '4px 8px' }}
                  onClick={() => handleSeek(5)}
                  disabled={disabled}
                >
                  <RotateCcw size={12} /> Reset to 0:05
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'var(--surface)',
          border: '1px dashed var(--line)',
          borderRadius: 8,
          padding: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12.5, color: 'var(--faint)' }}>
            💡 Select a video file or stream URL above to see a live visual frame preview for your start time.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Start timestamp:</span>
            <input
              type="number"
              min={0}
              value={numericStartTime}
              onChange={(e) => onChange(Math.max(0, +e.target.value || 0))}
              disabled={disabled}
              style={{
                width: 70,
                padding: '4px 8px',
                fontSize: 12,
                fontWeight: 700,
                textAlign: 'center',
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                borderRadius: 6,
                color: 'var(--ink)',
              }}
            />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>sec</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* Live native stream preview so the admin can verify direct stream playback before publishing */
function StreamPreview({ raw }) {
  const [testing, setTesting] = useState(false)
  const n = resolveStreamUrl(raw)
  if (!raw?.trim()) return null
  if (n.error) {
    return (
      <div className="notice warn" style={{ marginTop: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '10px 14px', borderRadius: 8 }}>
        <XCircle size={16} style={{ color: 'var(--brand)', flexShrink: 0 }} />
        <span>{n.error}</span>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 12 }}>
      {!testing ? (
        <button
          type="button"
          className="btn btn-ghost"
          style={{ fontSize: 13, padding: '7px 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          onClick={() => setTesting(true)}
        >
          <Tv size={14} /> Test & Preview Stream
        </button>
      ) : (
        <div>
          <div style={{
            aspectRatio: '16/9',
            maxWidth: 520,
            borderRadius: 12,
            overflow: 'hidden',
            background: '#000',
            border: '1px solid var(--line)',
            boxShadow: 'var(--shadow)',
          }}>
            <StreamPlayer src={n.url} autoPlay={false} />
          </div>
          <div className="hint" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Radio size={13} style={{ color: 'var(--ok)' }} />
            Connected to <code>{n.url}</code> — native web playback ready.
          </div>
        </div>
      )}
    </div>
  )
}


function Progress({ label, pct }) {
  return (
    <div style={{ margin: '12px 0' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--brand)', borderRadius: 99, transition: 'width .3s' }} />
      </div>
    </div>
  )
}

function ManagePanel({ rows, onChanged }) {
  return (
    <section className="panel" id="manage">
      <h2><FolderKanban size={18} /> Manage Videos</h2>
      <p style={{ color: 'var(--faint)', fontSize: 13.5, marginBottom: 12 }}>
        Uploads and streams are managed here and live across the platform. Demo entries are read-only.
      </p>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr><th></th><th>Title</th><th>Category</th><th>Source / Status</th><th>Size</th><th>Views</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((v) => {
              const mine = !!v.uploaded
              const Icon = v.icon || Clapperboard
              const isStream = v.srcType === 'stream' || (!v.src && !!(v.streamUrl || v.embed))
              return (
                <tr key={v.id}>
                  <td>
                    <div className="thumb-mini" style={{
                      background: v.thumb ? `url('${v.thumb}') center/cover` : `linear-gradient(135deg,${v.grad[0]},${v.grad[1]})`,
                    }}>
                      {!v.thumb && <Icon size={18} />}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, maxWidth: 320 }}>{v.title}</td>
                  <td>{catOf(v).name}</td>
                  <td>
                    {!mine ? <span className="pill info">Demo</span>
                      : isStream ? <span className="pill" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>📡 Stream</span>
                      : v.status === 'ready' ? <span className="pill ok">Ready</span>
                      : v.status === 'failed' ? <span className="pill" style={{ background: '#fdeeee', color: 'var(--danger)' }}>Failed</span>
                      : <span className="pill info">Processing {v.progress || 0}%</span>}
                  </td>
                  <td style={{ fontSize: 12.5, color: 'var(--faint)' }}>
                    {v.outputBytes ? <>{fmtMB(v.outputBytes)}<br /><s>{fmtMB(v.originalBytes)}</s></> : (isStream ? 'Live / Stream' : '—')}
                  </td>
                  <td>{fmtViews(v.views)}</td>
                  <td>
                    {mine && (
                      <button className="btn btn-danger" style={{ padding: '6px 14px', fontSize: 12 }}
                        onClick={async () => { await apiDeleteVideo(v.id); onChanged() }}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function DirectoryPanel({ categories, models, onAddCategory, onDeleteCategory, onAddModel, onDeleteModel }) {
  const [activeTab, setActiveTab] = useState('models') // 'models' | 'categories'
  const [newCatName, setNewCatName] = useState('')
  const [newCatEmoji, setNewCatEmoji] = useState('🔥')
  const [newCatDesc, setNewCatDesc] = useState('')

  const [newModelForm, setNewModelForm] = useState({
    name: '', id: '', bio: '', externalUrl: '', externalLabel: 'VIEW CHANNEL',
    category: 'exclusive', verified: true, collab: false, photoUrl: '',
  })

  async function handleAddCat(e) {
    e.preventDefault()
    if (!newCatName.trim()) return
    await onAddCategory({
      name: newCatName.trim(),
      emoji: newCatEmoji.trim() || '🔥',
      desc: newCatDesc.trim(),
    })
    setNewCatName('')
    setNewCatDesc('')
  }

  async function handleAddModel(e) {
    e.preventDefault()
    if (!newModelForm.name.trim()) return
    await onAddModel(newModelForm)
    setNewModelForm({
      name: '', id: '', bio: '', externalUrl: '', externalLabel: 'VIEW CHANNEL',
      category: 'exclusive', verified: true, collab: false, photoUrl: '',
    })
  }

  return (
    <section className="panel" id="directories">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}><Users size={18} /> Models & Categories Directory</h2>
          <p style={{ color: 'var(--faint)', fontSize: 13, margin: '4px 0 0 0' }}>
            Manage models, creators, and content categories across the entire site.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className={`btn ${activeTab === 'models' ? 'btn-solid' : 'btn-ghost'}`}
            style={{ fontSize: 12.5, padding: '6px 14px' }}
            onClick={() => setActiveTab('models')}
          >
            <Users size={14} /> Models Directory ({models.length})
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'categories' ? 'btn-solid' : 'btn-ghost'}`}
            style={{ fontSize: 12.5, padding: '6px 14px' }}
            onClick={() => setActiveTab('categories')}
          >
            <Tag size={14} /> Categories Directory ({categories.length})
          </button>
        </div>
      </div>

      {activeTab === 'models' ? (
        <div>
          {/* Add Model Form */}
          <form onSubmit={handleAddModel} className="admin-inline-box" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} style={{ color: 'var(--brand)' }} /> Add New Model Profile
            </h3>
            <div className="admin-inline-grid">
              <div>
                <label style={{ fontSize: 11.5, color: 'var(--muted)' }}>Model Name *</label>
                <input
                  placeholder="e.g. Dainty Wilder"
                  value={newModelForm.name}
                  onChange={(e) => setNewModelForm({ ...newModelForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 11.5, color: 'var(--muted)' }}>Profile Photo URL</label>
                <input
                  placeholder="https://.../photo.jpg"
                  value={newModelForm.photoUrl}
                  onChange={(e) => setNewModelForm({ ...newModelForm, photoUrl: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 11.5, color: 'var(--muted)' }}>Channel / Social Link (Optional)</label>
                <input
                  placeholder="https://..."
                  value={newModelForm.externalUrl}
                  onChange={(e) => setNewModelForm({ ...newModelForm, externalUrl: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 11.5, color: 'var(--muted)' }}>Category</label>
                <select
                  value={newModelForm.category}
                  onChange={(e) => setNewModelForm({ ...newModelForm, category: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 11.5, color: 'var(--muted)' }}>Bio / Description</label>
              <input
                placeholder="Model bio, exclusive content info…"
                value={newModelForm.bio}
                onChange={(e) => setNewModelForm({ ...newModelForm, bio: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newModelForm.verified}
                    onChange={(e) => setNewModelForm({ ...newModelForm, verified: e.target.checked })}
                  /> Verified Badge
                </label>
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newModelForm.collab}
                    onChange={(e) => setNewModelForm({ ...newModelForm, collab: e.target.checked })}
                  /> Collab Available
                </label>
              </div>
              <button type="submit" className="btn btn-solid" style={{ fontSize: 12.5, padding: '6px 16px' }}>
                Save Model to Directory
              </button>
            </div>
          </form>

          {/* Models Table */}
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th></th>
                  <th>Model / Creator</th>
                  <th>Category</th>
                  <th>Badges</th>
                  <th>Videos</th>
                  <th>Channel Link</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: '#222',
                        display: 'grid',
                        placeItems: 'center',
                      }}>
                        {m.avatar ? (
                          <img src={m.avatar} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Users size={18} color="var(--brand)" />
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      <Link to={`/creator/${m.id}`} style={{ color: 'var(--ink)' }}>
                        {m.name}
                      </Link>
                      <div style={{ fontSize: 11.5, color: 'var(--faint)', fontWeight: 400 }}>{m.id}</div>
                    </td>
                    <td>
                      <span className="pill" style={{ background: 'var(--surface-2)' }}>
                        {m.category || 'exclusive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {m.verified && <span className="pill ok" style={{ fontSize: 11 }}>Verified</span>}
                        {m.collab && <span className="pill info" style={{ fontSize: 11 }}>Collab</span>}
                      </div>
                    </td>
                    <td>{m.videoCount || 0}</td>
                    <td>
                      {m.externalUrl ? (
                        <a href={m.externalUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <ExternalLink size={12} /> {m.externalLabel || 'Channel'}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--faint)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td>
                      {m.custom && (
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => onDeleteModel(m.id)}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          {/* Add Category Form */}
          <form onSubmit={handleAddCat} className="admin-inline-box" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} style={{ color: 'var(--brand)' }} /> Create New Category
            </h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 11.5, color: 'var(--muted)' }}>Category Name *</label>
                <input
                  placeholder="e.g. Cosplay, Bunnies, 4K"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  required
                />
              </div>
              <div style={{ width: 100 }}>
                <label style={{ fontSize: 11.5, color: 'var(--muted)' }}>Emoji</label>
                <input
                  placeholder="🐰"
                  value={newCatEmoji}
                  onChange={(e) => setNewCatEmoji(e.target.value)}
                />
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <label style={{ fontSize: 11.5, color: 'var(--muted)' }}>Short Description</label>
                <input
                  placeholder="Category highlights and tags"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-solid" style={{ fontSize: 12.5, padding: '7px 16px', height: 38 }}>
                Save Category
              </button>
            </div>
          </form>

          {/* Categories Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 12,
          }}>
            {categories.map((c) => (
              <div
                key={c.slug}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{c.emoji || '📁'}</span>
                    <span>{c.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>
                    /{c.slug} • {c.count || 0} videos
                  </div>
                </div>
                {c.custom && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '4px', color: 'var(--danger)' }}
                    onClick={() => onDeleteCategory(c.slug)}
                    title="Delete Category"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function PipelinePanel() {
  return (
    <section className="panel" id="pipeline">
      <h2><Cog size={18} /> Encoding Pipeline</h2>
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>
        This is what the backend runs on every file upload — the untouched master is kept in{' '}
        <code>server/data/uploads</code>, and viewers are served the compressed, fast-start web copy:
      </p>
      <div className="code-block">{`# what server/index.js runs on upload (quality-targeted CRF, instant web playback)
ffmpeg -i master -c:v libx264 -preset veryfast -crf 21 -pix_fmt yuv420p \\
  -movflags +faststart -c:a aac -b:a 160k media/<id>.mp4

# thumbnail (auto, unless you upload one)
ffmpeg -ss <10%> -i master -frames:v 1 -vf scale=640:-2 thumbs/<id>.jpg

# upgrades when you outgrow the demo: H.265/AV1 ladder + HLS
ffmpeg -i master -c:v libsvtav1 -preset 6 -crf 30 -c:a libopus -b:a 128k out_av1.webm`}</div>
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>
        For production scale, move transcoding to a queue (one job at a time per core), add an HLS
        ladder for adaptive streaming, and validate with VMAF ≥ 95.
      </p>
    </section>
  )
}
