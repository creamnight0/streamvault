/* Utility to resolve and normalize stream links, video URLs, and web video links. */

export function isDirectMedia(url) {
  if (!url) return false
  if (url.startsWith('/media/')) return true
  return /\.(mp4|webm|mov|mkv|m3u8|ts|mpd|ogg)(\?|$)/i.test(url) || url.includes('/hls/')
}

export function resolveStreamUrl(raw) {
  let u = (raw || '').trim()
  if (!u) return { error: 'Please enter a video or stream URL.' }

  // Extract src if an iframe tag was pasted
  const iframeSrc = u.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i)
  if (iframeSrc) u = iframeSrc[1]

  if (!/^https?:\/\//i.test(u) && !u.startsWith('/')) {
    u = 'https://' + u
  }

  try {
    const parsed = new URL(u, window?.location?.origin || 'http://localhost')

    // PimpBunny (Auto-resolved and streamed via StreamVault live token proxy)
    if (parsed.hostname.includes('pimpbunny.com')) {
      return { url: u, isDirect: false }
    }

    // Pornhub (converts view_video.php?viewkey=... to clean embed player)
    if (parsed.hostname.includes('pornhub.com')) {
      const viewkey = parsed.searchParams.get('viewkey')
      if (viewkey) return { url: `https://www.pornhub.com/embed/${viewkey}`, isDirect: false }
      const embedMatch = u.match(/pornhub\.com\/embed\/([a-zA-Z0-9_-]+)/i)
      if (embedMatch) return { url: `https://www.pornhub.com/embed/${embedMatch[1]}`, isDirect: false }
    }

    // YouTube
    if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
      const v = parsed.searchParams.get('v')
      if (v) return { url: `https://www.youtube.com/embed/${v}`, isDirect: false }
      const shortMatch = u.match(/youtu\.be\/([a-zA-Z0-9_-]+)/i)
      if (shortMatch) return { url: `https://www.youtube.com/embed/${shortMatch[1]}`, isDirect: false }
    }

    // Vimeo
    if (parsed.hostname.includes('vimeo.com')) {
      const vimeoMatch = u.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i)
      if (vimeoMatch) return { url: `https://player.vimeo.com/video/${vimeoMatch[1]}`, isDirect: false }
    }

    // Xvideos
    if (parsed.hostname.includes('xvideos.com')) {
      const embedMatch = u.match(/xvideos\.com\/embedframe\/([a-zA-Z0-9_-]+)/i)
      if (embedMatch && embedMatch[1] !== 'embedframe') return { url: `https://www.xvideos.com/embedframe/${embedMatch[1]}`, isDirect: false }
      const vidMatch = u.match(/xvideos\.com\/video\.?([a-zA-Z0-9_-]+)/i) || u.match(/xvideos\.com\/video([0-9]+)/i)
      if (vidMatch) return { url: `https://www.xvideos.com/embedframe/${vidMatch[1]}`, isDirect: false }
      return { url: u, isDirect: false }
    }

    // Dailymotion
    if (parsed.hostname.includes('dailymotion.com') || parsed.hostname.includes('dai.ly')) {
      const dmMatch = u.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/i) || u.match(/dai\.ly\/([a-zA-Z0-9]+)/i)
      if (dmMatch) return { url: `https://www.dailymotion.com/embed/video/${dmMatch[1]}`, isDirect: false }
    }

    // SpankBang
    if (parsed.hostname.includes('spankbang.com')) {
      const sbMatch = u.match(/spankbang\.com\/([a-zA-Z0-9]+)\/(?:video|embed)/i)
      if (sbMatch) return { url: `https://spankbang.com/${sbMatch[1]}/embed/`, isDirect: false }
    }

    // RedTube
    if (parsed.hostname.includes('redtube.com')) {
      const rtMatch = u.match(/redtube\.com\/([0-9]+)/i)
      if (rtMatch) return { url: `https://embed.redtube.com/?id=${rtMatch[1]}`, isDirect: false }
    }

    // YouPorn
    if (parsed.hostname.includes('youporn.com')) {
      const ypMatch = u.match(/youporn\.com\/watch\/([0-9]+)/i)
      if (ypMatch) return { url: `https://www.youporn.com/embed/${ypMatch[1]}/`, isDirect: false }
    }

    return {
      url: u,
      isDirect: isDirectMedia(u),
    }
  } catch {
    return { error: 'Please enter a valid URL.' }
  }
}
