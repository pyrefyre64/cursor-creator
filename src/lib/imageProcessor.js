/**
 * Canvas-based image processing utilities.
 * All functions work in the browser (no Node.js / server needed).
 */

/**
 * Load a data URL into an HTMLImageElement.
 * @param {string} dataUrl
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
}

/**
 * Get natural dimensions from a data URL.
 * @param {string} dataUrl
 * @returns {Promise<{width: number, height: number}>}
 */
export async function getImageDimensions(dataUrl) {
  const img = await loadImage(dataUrl)
  return { width: img.naturalWidth, height: img.naturalHeight }
}

/**
 * Resize an image (from HTMLImageElement) to a square of targetSize × targetSize.
 * Returns straight (non-premultiplied) RGBA pixel data.
 *
 * Uses nearest-neighbour when target is an exact integer multiple or divisor of
 * source dimensions (covers both upscale and downscale); otherwise bilinear.
 *
 * @param {HTMLImageElement} img
 * @param {number} targetSize
 * @param {{x:boolean,y:boolean}} [flip]
 * @param {number} [srcWidth]
 * @param {number} [srcHeight]
 * @returns {Uint8ClampedArray}
 */
export function resizeToPixels(img, targetSize, flip = { x: false, y: false }, srcWidth, srcHeight) {
  const sw = srcWidth  ?? img.naturalWidth
  const sh = srcHeight ?? img.naturalHeight
  const integerUpscale   = targetSize >= sw && targetSize >= sh &&
                           targetSize % sw === 0 && targetSize % sh === 0
  const integerDownscale = targetSize <= sw && targetSize <= sh &&
                           sw % targetSize === 0 && sh % targetSize === 0

  const canvas = document.createElement('canvas')
  canvas.width = targetSize
  canvas.height = targetSize
  const ctx = canvas.getContext('2d')
  if (integerUpscale || integerDownscale) ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, targetSize, targetSize)
  if (flip.x || flip.y) {
    ctx.save()
    ctx.translate(flip.x ? targetSize : 0, flip.y ? targetSize : 0)
    ctx.scale(flip.x ? -1 : 1, flip.y ? -1 : 1)
    ctx.drawImage(img, 0, 0, targetSize, targetSize)
    ctx.restore()
  } else {
    ctx.drawImage(img, 0, 0, targetSize, targetSize)
  }
  return ctx.getImageData(0, 0, targetSize, targetSize).data
}

/**
 * Pick the best native source from a list of available images for a target size.
 *
 * Priority:
 *   1. Exact pixel match (native — no scaling needed)
 *   2. Integer-scalable source (nearest-neighbour); sorts by smallest ratio,
 *      ties broken by preferring upscale (smaller source) unless scalePref === 'down'
 *   3. Nearest available size (bilinear)
 *
 * @param {Array<{data:string, hotspot:{x:number,y:number}, dims:{width:number,height:number}}>} sources
 * @param {number} targetSize
 * @param {'up'|'down'|null} [scalePref]  tie-break preference; null defaults to upscale
 * @returns {{ source: typeof sources[0], method: 'native'|'nearest-neighbor'|'bilinear' } | null}
 */
export function pickBestSource(sources, targetSize, scalePref = null) {
  if (!sources.length) return null

  // 1. Exact match
  const exact = sources.find(s => s.dims.width === targetSize && s.dims.height === targetSize)
  if (exact) return { source: exact, method: 'native' }

  // 2. Integer-scalable sources (square images only)
  const integerCandidates = sources.filter(s => {
    if (s.dims.width !== s.dims.height) return false
    const w = s.dims.width
    return (targetSize % w === 0) || (w % targetSize === 0)
  })

  if (integerCandidates.length) {
    const ratio = s => Math.max(s.dims.width, targetSize) / Math.min(s.dims.width, targetSize)
    integerCandidates.sort((a, b) => {
      const ra = ratio(a), rb = ratio(b)
      if (ra !== rb) return ra - rb
      // Equal ratio tie: prefer upscale (smaller source) unless user chose 'down'
      const aSmaller = a.dims.width < b.dims.width
      return scalePref === 'down' ? (aSmaller ? 1 : -1) : (aSmaller ? -1 : 1)
    })
    return { source: integerCandidates[0], method: 'nearest-neighbor' }
  }

  // 3. Nearest source — bilinear
  const nearest = sources.reduce((best, s) => {
    const da = Math.abs(s.dims.width - targetSize)
    const db = Math.abs(best.dims.width - targetSize)
    return da < db ? s : best
  })
  return { source: nearest, method: 'bilinear' }
}

/**
 * Returns true when both an upscale and downscale integer candidate exist for
 * targetSize, meaning the user has a meaningful choice of scaling direction.
 * @param {Array<{dims:{width:number,height:number}}>} sources
 * @param {number} targetSize
 */
export function hasScaleChoice(sources, targetSize) {
  const candidates = sources.filter(s => {
    if (s.dims.width !== s.dims.height) return false
    const w = s.dims.width
    return w !== targetSize && ((targetSize % w === 0) || (w % targetSize === 0))
  })
  return candidates.some(s => s.dims.width < targetSize) &&
         candidates.some(s => s.dims.width > targetSize)
}

/**
 * Process the best available source for one output size.
 * Hotspot is scaled proportionally from the chosen source's native coordinates.
 *
 * @param {Array<{data:string, hotspot:{x:number,y:number}, dims:{width:number,height:number}}>} sources
 * @param {number} targetSize
 * @param {{x:boolean,y:boolean}} [flip]
 * @returns {Promise<{size:number, xhot:number, yhot:number, pixels:Uint8ClampedArray}>}
 */
/**
 * Render pixel data to a blob URL (caller must revoke when done).
 * @param {Uint8ClampedArray} pixels
 * @param {number} width
 * @param {number} height
 * @returns {Promise<string>} object URL
 */
export async function pixelsToObjectUrl(pixels, width, height) {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.putImageData(new ImageData(pixels, width, height), 0, 0)
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  return URL.createObjectURL(blob)
}

/**
 * @param {Array<{data:string, hotspot:{x:number,y:number}, dims:{width:number,height:number}}>} sources
 * @param {number} targetSize
 * @param {{x:boolean,y:boolean}} [flip]
 * @param {'up'|'down'|null} [scalePref]
 * @returns {Promise<{size:number, xhot:number, yhot:number, pixels:Uint8ClampedArray}>}
 */
export async function processFromSources(sources, targetSize, flip = { x: false, y: false }, scalePref = null) {
  const picked = pickBestSource(sources, targetSize, scalePref)
  if (!picked) throw new Error(`No sources available for size ${targetSize}`)

  const { source } = picked
  const img = await loadImage(source.data)
  const pixels = resizeToPixels(img, targetSize, flip, source.dims.width, source.dims.height)

  let xhot = Math.round(source.hotspot.x * (targetSize / source.dims.width))
  let yhot = Math.round(source.hotspot.y * (targetSize / source.dims.height))
  if (flip.x) xhot = targetSize - 1 - xhot
  if (flip.y) yhot = targetSize - 1 - yhot

  return {
    size: targetSize,
    xhot: Math.max(0, Math.min(xhot, targetSize - 1)),
    yhot: Math.max(0, Math.min(yhot, targetSize - 1)),
    pixels,
  }
}

/**
 * Process one animation frame to a target output size.
 * Mirrors processFromSources but operates on a single pre-parsed frame object.
 *
 * @param {{data:string, hotspot:{x:number,y:number}, delay:number}} frame
 * @param {{width:number, height:number}} dims  — source dimensions (shared by all frames)
 * @param {number} targetSize
 * @param {{x:boolean,y:boolean}} [flip]
 * @returns {Promise<{size:number, xhot:number, yhot:number, pixels:Uint8ClampedArray, delay:number}>}
 */
export async function processAnimFrame(frame, dims, targetSize, flip = { x: false, y: false }) {
  const img = await loadImage(frame.data)
  const pixels = resizeToPixels(img, targetSize, flip, dims.width, dims.height)

  let xhot = Math.round(frame.hotspot.x * (targetSize / dims.width))
  let yhot = Math.round(frame.hotspot.y * (targetSize / dims.height))
  if (flip.x) xhot = targetSize - 1 - xhot
  if (flip.y) yhot = targetSize - 1 - yhot

  return {
    size: targetSize,
    xhot: Math.max(0, Math.min(xhot, targetSize - 1)),
    yhot: Math.max(0, Math.min(yhot, targetSize - 1)),
    pixels,
    delay: frame.delay,
  }
}

// ── Legacy helpers (kept for any remaining internal uses) ─────────────────────

/** @deprecated Use processFromSources instead */
export async function processImage(dataUrl, targetSize, hotspot, masterDims, flip = { x: false, y: false }) {
  return processFromSources(
    [{ data: dataUrl, hotspot, dims: masterDims }],
    targetSize,
    flip,
  )
}

/** @deprecated Use processFromSources instead */
export async function processOverride(overrideDataUrl, targetSize, overrideHotspot, masterHotspot, masterDims, flip = { x: false, y: false }) {
  const hotspot = overrideHotspot ?? {
    x: Math.round(masterHotspot.x * (targetSize / masterDims.width)),
    y: Math.round(masterHotspot.y * (targetSize / masterDims.height)),
  }
  return processFromSources(
    [{ data: overrideDataUrl, hotspot, dims: { width: targetSize, height: targetSize } }],
    targetSize,
    flip,
  )
}
