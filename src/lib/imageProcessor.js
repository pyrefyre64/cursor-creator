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
 * @param {HTMLImageElement} img
 * @param {number} targetSize
 * @param {{x:boolean,y:boolean}} [flip]
 * @returns {Uint8ClampedArray}
 */
export function resizeToPixels(img, targetSize, flip = { x: false, y: false }) {
  const canvas = document.createElement('canvas')
  canvas.width = targetSize
  canvas.height = targetSize
  const ctx = canvas.getContext('2d')
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
 * Process a master image for one output size, scaling the hotspot proportionally.
 *
 * @param {string} dataUrl        - master image data URL
 * @param {number} targetSize     - desired output size in pixels
 * @param {{x:number,y:number}} hotspot - hotspot in master image coordinates
 * @param {{width:number,height:number}} masterDims
 * @param {{x:boolean,y:boolean}} [flip]
 * @returns {Promise<{size:number, xhot:number, yhot:number, pixels:Uint8ClampedArray}>}
 */
export async function processImage(dataUrl, targetSize, hotspot, masterDims, flip = { x: false, y: false }) {
  const img = await loadImage(dataUrl)
  const pixels = resizeToPixels(img, targetSize, flip)

  let xhot = Math.round(hotspot.x * (targetSize / masterDims.width))
  let yhot = Math.round(hotspot.y * (targetSize / masterDims.height))
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
 * Process an override image for one output size.
 * The override hotspot (if provided) is already in output-size coordinates.
 * Falls back to scaled master hotspot if no override hotspot.
 *
 * @param {string} overrideDataUrl
 * @param {number} targetSize
 * @param {{x:number,y:number}|null} overrideHotspot  - in output coords (null = use scaled master)
 * @param {{x:number,y:number}} masterHotspot          - in master coords
 * @param {{width:number,height:number}} masterDims
 * @param {{x:boolean,y:boolean}} [flip]
 * @returns {Promise<{size:number, xhot:number, yhot:number, pixels:Uint8ClampedArray}>}
 */
export async function processOverride(overrideDataUrl, targetSize, overrideHotspot, masterHotspot, masterDims, flip = { x: false, y: false }) {
  const img = await loadImage(overrideDataUrl)
  const pixels = resizeToPixels(img, targetSize, flip)

  let xhot, yhot
  if (overrideHotspot) {
    xhot = overrideHotspot.x
    yhot = overrideHotspot.y
  } else {
    xhot = Math.round(masterHotspot.x * (targetSize / masterDims.width))
    yhot = Math.round(masterHotspot.y * (targetSize / masterDims.height))
  }
  if (flip.x) xhot = targetSize - 1 - xhot
  if (flip.y) yhot = targetSize - 1 - yhot

  return {
    size: targetSize,
    xhot: Math.max(0, Math.min(xhot, targetSize - 1)),
    yhot: Math.max(0, Math.min(yhot, targetSize - 1)),
    pixels,
  }
}
