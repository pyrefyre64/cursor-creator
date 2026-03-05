/**
 * Windows .cur file writer.
 *
 * A .cur file is an ICO-format container (type=2) where each directory entry
 * stores a hotspot instead of planes/colors. Each image is stored as a PNG.
 *
 * File layout:
 *   ICONDIRHEADER  (6 bytes)
 *   N × ICONDIRENTRY (16 bytes each)
 *   N × PNG image data
 */

/**
 * Convert straight RGBA pixel data to a PNG Uint8Array via OffscreenCanvas.
 * @param {Uint8ClampedArray} pixels
 * @param {number} width
 * @param {number} height
 * @returns {Promise<Uint8Array>}
 */
async function pixelsToPng(pixels, width, height) {
  const canvas = new OffscreenCanvas(width, height)
  canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0)
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  return new Uint8Array(await blob.arrayBuffer())
}

/**
 * Build a Windows .cur file from an array of cursor frames.
 *
 * @param {Array<{size:number, xhot:number, yhot:number, pixels:Uint8ClampedArray}>} frames
 * @returns {Promise<Uint8Array>}
 */
export async function buildCur(frames) {
  const pngs = await Promise.all(frames.map(f => pixelsToPng(f.pixels, f.size, f.size)))

  const HEADER_SIZE = 6
  const ENTRY_SIZE  = 16
  const dirBytes = HEADER_SIZE + frames.length * ENTRY_SIZE
  const totalSize = dirBytes + pngs.reduce((s, p) => s + p.length, 0)

  const buf   = new ArrayBuffer(totalSize)
  const view  = new DataView(buf)
  const bytes = new Uint8Array(buf)
  let pos = 0

  // ICONDIRHEADER
  view.setUint16(pos, 0, true); pos += 2  // reserved
  view.setUint16(pos, 2, true); pos += 2  // type: 2 = cursor
  view.setUint16(pos, frames.length, true); pos += 2

  // Directory entries — calculate data offsets
  let dataPos = dirBytes
  for (let i = 0; i < frames.length; i++) {
    const { size, xhot, yhot } = frames[i]
    const png = pngs[i]
    bytes[pos++] = size >= 256 ? 0 : size  // bWidth  (0 means 256)
    bytes[pos++] = size >= 256 ? 0 : size  // bHeight
    bytes[pos++] = 0                        // bColorCount
    bytes[pos++] = 0                        // bReserved
    view.setUint16(pos, xhot, true); pos += 2   // wXHotspot
    view.setUint16(pos, yhot, true); pos += 2   // wYHotspot
    view.setUint32(pos, png.length, true); pos += 4   // dwBytesInRes
    view.setUint32(pos, dataPos, true); pos += 4      // dwImageOffset
    dataPos += png.length
  }

  // Image data
  for (const png of pngs) {
    bytes.set(png, pos)
    pos += png.length
  }

  return new Uint8Array(buf)
}
