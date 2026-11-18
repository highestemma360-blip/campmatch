export interface ClientImagePrecheck {
  ok: boolean
  reason?: string
}

/**
 * Fast browser-side pre-check before uploading bytes to the backend OpenCV YuNet & NSFW guard.
 * Catches oversized files, tiny dimensions, blank white, pitch black, and solid-color images instantly.
 */
export async function precheckProfileImage(file: File): Promise<ClientImagePrecheck> {
  if (!file.type.startsWith('image/')) {
    return { ok: false, reason: 'Unsupported file format. Choose a JPG, PNG, or WebP photo.' }
  }
  if (file.size > 8 * 1024 * 1024) {
    return { ok: false, reason: 'Photo is larger than 8 MB. Choose a smaller file.' }
  }

  const bitmapUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Unreadable image'))
      el.src = bitmapUrl
    })

    if (img.naturalWidth < 240 || img.naturalHeight < 240) {
      return { ok: false, reason: 'Image resolution is too small (minimum 240x240px).' }
    }

    const ratio = Math.max(img.naturalWidth, img.naturalHeight) / Math.max(1, Math.min(img.naturalWidth, img.naturalHeight))
    if (ratio > 3.2) {
      return { ok: false, reason: 'Extreme banner or panoramic crops are not accepted.' }
    }

    const sampleW = 160
    const sampleH = 160
    const canvas = document.createElement('canvas')
    canvas.width = sampleW
    canvas.height = sampleH
    const ctx = canvas.getContext('2d')
    if (!ctx) return { ok: true }

    ctx.drawImage(img, 0, 0, sampleW, sampleH)
    const { data } = ctx.getImageData(0, 0, sampleW, sampleH)
    const total = sampleW * sampleH

    let sum = 0
    let sumSq = 0
    let whiteCount = 0
    let blackCount = 0

    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      sum += lum
      sumSq += lum * lum
      if (lum >= 246) whiteCount++
      if (lum <= 10) blackCount++
    }

    const mean = sum / total
    const variance = Math.max(0, sumSq / total - mean * mean)
    const std = Math.sqrt(variance)

    if (mean >= 241 || whiteCount / total >= 0.86) {
      return { ok: false, reason: 'Blank or mostly white image detected. Upload a real photo of yourself.' }
    }
    if (mean <= 13 || blackCount / total >= 0.88) {
      return { ok: false, reason: 'Pitch-dark or black image detected. Upload a well-lit photo of yourself.' }
    }
    if (std < 12.0) {
      return { ok: false, reason: 'Solid-color or blank image detected. Upload a clear photo of yourself.' }
    }

    return { ok: true }
  } catch {
    return { ok: false, reason: 'Could not read image file.' }
  } finally {
    URL.revokeObjectURL(bitmapUrl)
  }
}
