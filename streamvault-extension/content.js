// StreamVault Content Script — Detects Media Sources & Injects Clipper Helper
let lastCapturedMedia = ''
let lastCapturedThumb = ''

function scanMedia() {
  const vids = Array.from(document.querySelectorAll('video'))
  for (const v of vids) {
    const src = v.currentSrc || v.src
    if (src && !src.startsWith('blob:') && src.length > 5) {
      lastCapturedMedia = src
      if (v.poster) lastCapturedThumb = v.poster
      return { mediaUrl: src, thumbUrl: lastCapturedThumb, title: document.title }
    }
  }

  // Check script tags or player configs (e.g. KVS / PimpBunny flashvars or video_url)
  const scripts = Array.from(document.querySelectorAll('script'))
  for (const s of scripts) {
    const text = s.textContent || ''
    const match = text.match(/(?:video_url|file|src):\s*['"](https?:\/\/[^'"]+\.mp4[^'"]*)['"]/i)
    if (match) {
      lastCapturedMedia = match[1]
      return { mediaUrl: lastCapturedMedia, thumbUrl: lastCapturedThumb, title: document.title }
    }
  }

  return { mediaUrl: lastCapturedMedia, thumbUrl: lastCapturedThumb, title: document.title }
}

// Listen for popup inquiries
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === 'GET_VIDEO_SOURCE') {
    sendResponse(scanMedia())
  }
  return true
})

// Monitor video play events to capture active stream URL as soon as user plays
document.addEventListener('play', (e) => {
  if (e.target && e.target.tagName === 'VIDEO') {
    const v = e.target
    const src = v.currentSrc || v.src
    if (src && !src.startsWith('blob:')) {
      lastCapturedMedia = src
      if (v.poster) lastCapturedThumb = v.poster
    }
  }
}, true)

// Periodic check on tube pages
setInterval(scanMedia, 2000)
