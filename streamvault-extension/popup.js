// StreamVault Clipper Extension Popup Logic
let detectedData = {
  mediaUrl: '',
  title: '',
  thumbUrl: '',
  pageUrl: '',
}

document.addEventListener('DOMContentLoaded', async () => {
  const statusHeader = document.getElementById('statusHeader')
  const mediaSourceText = document.getElementById('mediaSourceText')
  const videoTitle = document.getElementById('videoTitle')
  const videoCat = document.getElementById('videoCat')
  const videoCreator = document.getElementById('videoCreator')
  const videoTags = document.getElementById('videoTags')
  const videoStartTime = document.getElementById('videoStartTime')
  const btnImport = document.getElementById('btnImport')
  const noticeBox = document.getElementById('noticeBox')
  const importForm = document.getElementById('importForm')

  // Load custom categories dynamically from StreamVault backend if running
  try {
    const catRes = await fetch('http://localhost:4000/api/categories')
    if (catRes.ok) {
      const cats = await catRes.json()
      if (Array.isArray(cats) && cats.length > 0) {
        videoCat.innerHTML = cats.map(c => `<option value="${c.slug}">${c.name}</option>`).join('')
      }
    }
  } catch {}

  // Query active tab and send message to content script
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab) {
      statusHeader.innerHTML = '<span>⚠️</span> No active tab found'
      return
    }

    detectedData.pageUrl = tab.url || ''
    detectedData.title = tab.title || ''
    videoTitle.value = tab.title ? tab.title.replace(/ - [^-]+$/g, '').replace(/ \| [^|]+$/g, '').trim() : ''

    // Request detected stream from content script
    chrome.tabs.sendMessage(tab.id, { action: 'GET_VIDEO_SOURCE' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.mediaUrl) {
        // Fallback: run script directly
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractPageMedia,
        }, (results) => {
          if (results && results[0] && results[0].result) {
            applyDetected(results[0].result)
          } else {
            statusHeader.innerHTML = '<span>⚠️</span> No direct video detected on page'
            mediaSourceText.textContent = 'Please start playing the video on the page, then reopen clipper.'
          }
        })
      } else {
        applyDetected(response)
      }
    })
  } catch (err) {
    statusHeader.innerHTML = '<span>⚠️</span> Error scanning page'
    mediaSourceText.textContent = err.message
  }

  function applyDetected(data) {
    detectedData = { ...detectedData, ...data }
    if (data.title && !videoTitle.value) videoTitle.value = data.title
    if (data.tags && !videoTags.value) videoTags.value = data.tags

    if (data.mediaUrl) {
      statusHeader.innerHTML = '<span>✓</span> Direct Video Stream Detected!'
      statusHeader.style.color = 'var(--ok)'
      mediaSourceText.textContent = data.mediaUrl
      btnImport.disabled = false
    } else {
      statusHeader.innerHTML = '<span>⚠️</span> Waiting for video playback...'
      mediaSourceText.textContent = 'Play the video on this page to let StreamVault capture the stream link.'
      btnImport.disabled = true
    }
  }

  // Handle Form Submit (Ingest to StreamVault)
  importForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (!detectedData.mediaUrl) {
      alert('No media stream detected to import.')
      return
    }

    btnImport.disabled = true
    btnImport.innerHTML = '<span>⏳</span> Downloading & Ingesting...'
    noticeBox.style.display = 'none'

    try {
      const payload = {
        mediaUrl: detectedData.mediaUrl,
        title: videoTitle.value.trim(),
        desc: `Clipped from ${detectedData.pageUrl || 'web page'}`,
        cat: videoCat.value,
        creator: videoCreator.value.trim() || 'streamvault',
        tags: videoTags.value.trim(),
        startTime: Number(videoStartTime.value) || 5,
        thumbUrl: detectedData.thumbUrl || '',
        pageUrl: detectedData.pageUrl,
      }

      const res = await fetch('http://localhost:4000/api/remote-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Server error during ingest')

      noticeBox.className = 'notice success'
      noticeBox.innerHTML = `
        <strong>✓ Video Saved to StreamVault!</strong><br>
        Video is now permanently saved & transcoding in your catalog.<br>
        <a class="link-btn" href="${data.watchUrl}" target="_blank">Watch Video on StreamVault →</a>
      `
      btnImport.innerHTML = '<span>✓</span> Saved Permanently!'
    } catch (err) {
      noticeBox.className = 'notice error'
      noticeBox.innerHTML = `<strong>Import Failed:</strong> ${err.message}<br>Make sure StreamVault server is running on http://localhost:4000`
      btnImport.disabled = false
      btnImport.innerHTML = '<span>⚡</span> Retry Ingest'
    }
  })
})

function extractPageMedia() {
  let mediaUrl = ''
  let thumbUrl = ''
  let title = document.title || ''

  // 1. Inspect HTML5 video elements
  const vids = Array.from(document.querySelectorAll('video'))
  for (const v of vids) {
    if (v.currentSrc && !v.currentSrc.startsWith('blob:')) {
      mediaUrl = v.currentSrc
      if (v.poster) thumbUrl = v.poster
      break
    }
    if (v.src && !v.src.startsWith('blob:')) {
      mediaUrl = v.src
      if (v.poster) thumbUrl = v.poster
      break
    }
    const source = v.querySelector('source[src]')
    if (source && source.src) {
      mediaUrl = source.src
      if (v.poster) thumbUrl = v.poster
      break
    }
  }

  // 2. Fallback meta tags
  if (!thumbUrl) {
    const ogImg = document.querySelector('meta[property="og:image"]')?.content ||
                  document.querySelector('meta[name="twitter:image"]')?.content
    if (ogImg) thumbUrl = ogImg
  }

  const ogTitle = document.querySelector('meta[property="og:title"]')?.content
  if (ogTitle) title = ogTitle

  return { mediaUrl, thumbUrl, title }
}
