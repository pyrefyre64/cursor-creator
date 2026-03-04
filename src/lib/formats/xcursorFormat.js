/**
 * Format handler for Linux/X11 Xcursor files.
 *
 * These files are typically extensionless (e.g. `arrow`, `left_ptr`).
 * Detection is via magic bytes "Xcur" = [0x58, 0x63, 0x75, 0x72].
 *
 * Imports the largest available frame size. For animated cursors,
 * the first frame of that size is used.
 */

const IMAGE_TYPE = 0xfffd0002

export const xcursorFormatHandler = {
  name: 'Xcursor',
  magic: [0x58, 0x63, 0x75, 0x72],

  /** @param {File} file */
  async parse(file) {
    const buffer = await file.arrayBuffer()
    return parseXcursor(buffer)
  },
}

/**
 * @param {ArrayBuffer} buffer
 * @returns {Promise<{dataUrl:string, hotspot:{x:number,y:number}, width:number, height:number}>}
 */
function parseXcursor(buffer) {
  const view = new DataView(buffer)

  // Validate magic "Xcur"
  if (view.getUint8(0) !== 0x58 || view.getUint8(1) !== 0x63 ||
      view.getUint8(2) !== 0x75 || view.getUint8(3) !== 0x72) {
    throw new Error('Not a valid Xcursor file')
  }

  const headerSize = view.getUint32(4, true)
  const ntoc = view.getUint32(12, true)

  // Collect IMAGE TOC entries
  const imageChunks = []
  let tocPos = headerSize
  for (let i = 0; i < ntoc; i++) {
    const type     = view.getUint32(tocPos,     true)
    const subtype  = view.getUint32(tocPos + 4, true)
    const position = view.getUint32(tocPos + 8, true)
    tocPos += 12
    if (type === IMAGE_TYPE) imageChunks.push({ nominalSize: subtype, position })
  }

  if (!imageChunks.length) throw new Error('No image chunks in Xcursor file')

  // Pick the largest nominal size, first frame
  const maxSize = Math.max(...imageChunks.map(c => c.nominalSize))
  const chunk = imageChunks.find(c => c.nominalSize === maxSize)

  return readImageChunk(view, chunk.position)
}

/**
 * @param {DataView} view
 * @param {number} pos  byte offset of the chunk
 * @returns {Promise<{dataUrl:string, hotspot:{x:number,y:number}, width:number, height:number}>}
 */
async function readImageChunk(view, pos) {
  const chunkHeaderSize = view.getUint32(pos, true)  // usually 36
  // type @ pos+4, subtype @ pos+8, version @ pos+12
  const width  = view.getUint32(pos + 16, true)
  const height = view.getUint32(pos + 20, true)
  const xhot   = view.getUint32(pos + 24, true)
  const yhot   = view.getUint32(pos + 28, true)
  // delay @ pos+32 (ignored for static cursors)

  const pixelStart = pos + chunkHeaderSize
  const n = width * height

  // Convert premultiplied ARGB LE → straight RGBA for ImageData
  const rgba = new Uint8ClampedArray(n * 4)
  for (let i = 0; i < n; i++) {
    const argb = view.getUint32(pixelStart + i * 4, true)
    const a  = (argb >>> 24) & 0xff
    const pr = (argb >>> 16) & 0xff
    const pg = (argb >>>  8) & 0xff
    const pb =  argb         & 0xff
    if (a === 0) {
      // fully transparent — leave as zero
    } else if (a === 255) {
      rgba[i * 4]     = pr
      rgba[i * 4 + 1] = pg
      rgba[i * 4 + 2] = pb
      rgba[i * 4 + 3] = 255
    } else {
      rgba[i * 4]     = Math.min(255, (pr * 255 / a + 0.5) | 0)
      rgba[i * 4 + 1] = Math.min(255, (pg * 255 / a + 0.5) | 0)
      rgba[i * 4 + 2] = Math.min(255, (pb * 255 / a + 0.5) | 0)
      rgba[i * 4 + 3] = a
    }
  }

  // Render to OffscreenCanvas → PNG data URL
  const canvas = new OffscreenCanvas(width, height)
  canvas.getContext('2d').putImageData(new ImageData(rgba, width, height), 0, 0)
  const blob = await canvas.convertToBlob({ type: 'image/png' })

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

  return { dataUrl, hotspot: { x: xhot, y: yhot }, width, height }
}
