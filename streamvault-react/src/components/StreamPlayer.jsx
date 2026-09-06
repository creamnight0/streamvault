import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Hls from 'hls.js'
import { AlertCircle, RefreshCw, Radio, Sparkles, X, Play, Eye } from 'lucide-react'
import { resolveStreamUrl } from '../lib/streamUtils.js'
import { fmtViews } from '../data/catalog.js'

export default function StreamPlayer({
  videoId,
  src,
  poster,
  autoPlay = false,
  muted = false,
  controls = true,
  className = '',
  style = {},
  suggestions = [],
  startTime = 5,
  onLoadedMetadata,
}) {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const hasSetStartRef = useRef(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState(null)
  const [isLive, setIsLive] = useState(false)
  const [showRecs, setShowRecs] = useState(false) // Displays suggestions ONLY when video ends
  const [activeStreamUrl, setActiveStreamUrl] = useState('')

  const minTime = typeof startTime === 'number' && !isNaN(startTime) ? Math.max(0, startTime) : 5

  useEffect(() => {
    const video = videoRef.current
    if (!src || !video) return

    setError(null)
    setShowRecs(false)
    setIsLive(false)
    hasSetStartRef.current = false

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    // Determine the playable stream URL (Local asset, direct CDN, or relayed via backend stream server)
    let playableUrl = src
    const isLocalAsset =
      src.startsWith('/media/') ||
      src.startsWith('blob:') ||
      src.startsWith('data:') ||
      src.startsWith('/api/') ||
      src.includes('cdn.plyr.io') ||
      src.includes('vjs.zencdn.net') ||
      src.includes('media.w3.org')

    // External streams (Pornhub, XVideos, RedTube, PimpBunny, tube CDNs) route through live stream proxy
    const needsTokenProxy = !isLocalAsset

    if (needsTokenProxy) {
      playableUrl = `/api/stream-live?url=${encodeURIComponent(src)}${videoId ? `&id=${videoId}` : ''}`
    } else {
      playableUrl = src
    }

    setActiveStreamUrl(playableUrl)

    const isHlsCandidate =
      /\.m3u8(\?|$)/i.test(src) ||
      src.includes('/hls/') ||
      src.includes('xvideos.com') ||
      src.includes('redtube.com') ||
      src.includes('spankbang.com') ||
      (needsTokenProxy && !src.includes('.mp4'))

    if (isHlsCandidate && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      })
      hlsRef.current = hls

      hls.loadSource(playableUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsLive(data?.live || false)
        if (!hasSetStartRef.current && minTime > 0) {
          video.currentTime = minTime
          hasSetStartRef.current = true
        }
        if (autoPlay) video.play().catch(() => {})
      })

      hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
        if (data?.details?.live) setIsLive(true)
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError()
          } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR && data.details !== 'manifestLoadError') {
            hls.startLoad()
          } else {
            // Direct MP4 fallback if stream is not M3U8
            hls.destroy()
            hlsRef.current = null
            video.src = playableUrl
            video.load()
            if (autoPlay) video.play().catch(() => {})
          }
        }
      })
    } else {
      // Direct MP4 / WebM / browser stream playback
      video.src = playableUrl
      video.load()
      if (autoPlay) {
        video.play().catch(() => {})
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [src, autoPlay, minTime])

  const recList = suggestions && suggestions.length > 0 ? suggestions.slice(0, 8) : []

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: 'inherit',
        ...style,
      }}
      className={className}
    >
      {/* 100% Native HTML5 Video Stream Player (ZERO IFRAMES) */}
      <video
        ref={videoRef}
        poster={poster}
        controls={controls}
        muted={muted}
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => {
          const v = e.target
          if (!hasSetStartRef.current && minTime > 0) {
            if (!v.duration || v.duration >= minTime) {
              v.currentTime = minTime
              hasSetStartRef.current = true
            }
          }
          onLoadedMetadata?.(e)
        }}
        onSeeking={(e) => {
          const v = e.target
          if (hasSetStartRef.current && minTime > 0 && v.currentTime < minTime - 0.25) {
            v.currentTime = minTime
          }
        }}
        onPlay={(e) => {
          const v = e.target
          if (!hasSetStartRef.current && minTime > 0 && v.currentTime < minTime) {
            v.currentTime = minTime
            hasSetStartRef.current = true
          }
          setIsPlaying(true)
          setError(null)
          setShowRecs(false)
        }}
        onError={() => {
          if (videoRef.current && activeStreamUrl.startsWith('/api/') && activeStreamUrl !== src) {
            setActiveStreamUrl(src)
            videoRef.current.src = src
            videoRef.current.load()
            videoRef.current.play().catch(() => {})
            return
          }
          if (videoRef.current?.error?.code) {
            setError('Unable to load video stream.')
          }
        }}
        onPause={() => {
          setIsPlaying(false)
        }}
        onEnded={() => {
          setIsPlaying(false)
          setShowRecs(true)
        }}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />

      {/* Centered Big Play Button (Clicking anywhere or on button starts playback) */}
      {!isPlaying && !error && !showRecs && (
        <button
          type="button"
          aria-label="Play video"
          onClick={() => {
            if (videoRef.current) {
              videoRef.current.play().catch((err) => {
                console.warn('[player] Play error:', err)
              })
            }
          }}
          style={{
            position: 'absolute',
            zIndex: 15,
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(225, 29, 72, 0.9)',
            border: '3px solid rgba(255, 255, 255, 0.9)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(225, 29, 72, 0.5)',
            transition: 'transform 0.15s ease, background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.12)'
            e.currentTarget.style.background = '#f43f5e'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.background = 'rgba(225, 29, 72, 0.9)'
          }}
        >
          <Play size={32} fill="#fff" style={{ marginLeft: 4 }} />
        </button>
      )}

      {/* StreamVault Suggested Video Tiles Overlay — Appears ONLY when stopped/paused */}
      {showRecs && recList.length > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(10, 8, 7, 0.96)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            zIndex: 30,
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            overflowY: 'auto',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} style={{ color: 'var(--brand)' }} /> Suggested on StreamVault
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setShowRecs(false)
                  if (videoRef.current) {
                    videoRef.current.play().catch(() => {})
                  }
                }}
                className="btn btn-solid"
                style={{ padding: '6px 16px', fontSize: 12.5 }}
              >
                <Play size={13} fill="currentColor" /> Resume Video
              </button>
              <button
                type="button"
                onClick={() => setShowRecs(false)}
                className="btn btn-ghost"
                style={{ color: '#fff', padding: '6px 10px', fontSize: 12 }}
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Grid of StreamVault Video Tiles */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 10,
            }}
          >
            {recList.map((item) => (
              <Link
                key={item.id}
                to={`/watch/${item.id}`}
                onClick={() => setShowRecs(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.borderColor = 'var(--brand)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                }}
              >
                <div
                  style={{
                    aspectRatio: '16/9',
                    background: item.thumb
                      ? `url('${item.thumb}') center/cover`
                      : `linear-gradient(135deg, ${item.grad?.[0] || '#c62b4a'}, ${item.grad?.[1] || '#8f1d38'})`,
                    display: 'grid',
                    placeItems: 'center',
                    position: 'relative',
                    color: '#fff',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.65)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--brand)',
                    }}
                  >
                    <Play size={14} fill="currentColor" />
                  </div>
                  {item.dur && (
                    <span
                      style={{
                        position: 'absolute',
                        right: 6,
                        bottom: 6,
                        background: 'rgba(0,0,0,0.85)',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {item.dur}
                    </span>
                  )}
                </div>
                <div style={{ padding: '8px 10px' }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#fff',
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--faint)',
                      marginTop: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Eye size={11} /> {fmtViews(item.views || 0)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* StreamVault Brand Shield (Click routes to Homepage) */}
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          navigate('/')
        }}
        title="StreamVault Home"
        style={{
          position: 'absolute',
          bottom: 14,
          right: 20,
          height: 26,
          padding: '0 9px',
          background: 'rgba(15, 12, 10, 0.95)',
          borderRadius: 6,
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          fontSize: 10.5,
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '0.4px',
          cursor: 'pointer',
          zIndex: 20,
          userSelect: 'none',
          transition: 'transform 0.15s ease, background 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.04)'
          e.currentTarget.style.background = '#251a16'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.background = 'rgba(15, 12, 10, 0.95)'
        }}
      >
        <span style={{ color: 'var(--brand)', fontSize: 9 }}>▶</span>
        STREAM<span style={{ color: 'var(--brand)' }}>VAULT</span>
      </div>

      {isLive && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            background: 'rgba(220, 38, 38, 0.9)',
            color: '#fff',
            fontSize: 11.5,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            letterSpacing: '0.5px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <Radio size={13} className="spin" style={{ animationDuration: '2s' }} /> LIVE
        </div>
      )}

      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 12, 10, 0.92)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            textAlign: 'center',
            color: '#fff',
            zIndex: 40,
          }}
        >
          <AlertCircle size={32} style={{ color: 'var(--brand)', marginBottom: 10 }} />
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Stream Offline or Unavailable</div>
          <div style={{ fontSize: 13, color: 'var(--faint)', maxWidth: 360, marginBottom: 16 }}>{error}</div>
          <button
            type="button"
            className="btn btn-outline"
            style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '7px 16px' }}
            onClick={() => {
              setError(null)
              if (videoRef.current && activeStreamUrl) {
                videoRef.current.src = activeStreamUrl
                videoRef.current.load()
                videoRef.current.play().catch(() => {})
              }
            }}
          >
            <RefreshCw size={14} /> Retry Stream
          </button>
        </div>
      )}
    </div>
  )
}
