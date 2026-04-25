// Helpers para identificar e renderizar vídeos do YouTube, Vimeo e Instagram
// a partir de URLs públicas coladas no admin.

export type VideoEmbed = {
  platform: 'youtube' | 'vimeo' | 'instagram' | 'unknown'
  id: string | null
  embedUrl: string | null
  thumbnailUrl: string | null
}

export function parseVideoUrl(rawUrl: string | null | undefined): VideoEmbed {
  const empty: VideoEmbed = {
    platform: 'unknown',
    id: null,
    embedUrl: null,
    thumbnailUrl: null,
  }
  if (!rawUrl) return empty
  let url: URL
  try {
    url = new URL(rawUrl.trim())
  } catch {
    return empty
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase()

  // YouTube
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    let id = url.searchParams.get('v')
    if (!id && url.pathname.startsWith('/shorts/')) {
      id = url.pathname.split('/')[2] ?? null
    }
    if (!id && url.pathname.startsWith('/embed/')) {
      id = url.pathname.split('/')[2] ?? null
    }
    if (!id) return empty
    return {
      platform: 'youtube',
      id,
      embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    }
  }
  if (host === 'youtu.be') {
    const id = url.pathname.replace(/^\//, '').split('/')[0] || null
    if (!id) return empty
    return {
      platform: 'youtube',
      id,
      embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    }
  }

  // Vimeo
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const parts = url.pathname.split('/').filter(Boolean)
    const id = parts.find((p) => /^\d+$/.test(p)) ?? null
    if (!id) return empty
    return {
      platform: 'vimeo',
      id,
      embedUrl: `https://player.vimeo.com/video/${id}?autoplay=1`,
      thumbnailUrl: null, // Vimeo exige API pra thumbnail; deixa o admin colar manual.
    }
  }

  // Instagram (posts, reels, IGTV)
  if (host === 'instagram.com' || host === 'instagr.am') {
    const parts = url.pathname.split('/').filter(Boolean)
    // Aceita /p/{id}, /reel/{id}, /reels/{id}, /tv/{id}
    const typeIdx = parts.findIndex((p) =>
      ['p', 'reel', 'reels', 'tv'].includes(p)
    )
    if (typeIdx === -1) return empty
    const type = parts[typeIdx] === 'reels' ? 'reel' : parts[typeIdx]
    const id = parts[typeIdx + 1] ?? null
    if (!id) return empty
    return {
      platform: 'instagram',
      id,
      embedUrl: `https://www.instagram.com/${type}/${id}/embed`,
      thumbnailUrl: null, // Instagram não expõe thumbnail pública estável; admin pode colar custom.
    }
  }

  return empty
}
