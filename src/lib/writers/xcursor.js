/**
 * Xcursor binary format writer.
 *
 * File layout:
 *   FileHeader (16 bytes)
 *   TOC entries (12 bytes each)
 *   Image chunks (36 + size*size*4 bytes each)
 *
 * Pixel format: premultiplied ARGB, little-endian uint32 per pixel.
 */

const IMAGE_TYPE = 0xfffd0002
const FILE_VERSION = 0x00010000  // 65536
const CHUNK_HEADER_SIZE = 36     // 16 (chunk hdr) + 20 (image fields)
const FILE_HEADER_SIZE = 16
const TOC_ENTRY_SIZE = 12

/**
 * Build an Xcursor binary file.
 *
 * For animated cursors, pass multiple entries sharing the same `size` value —
 * libXcursor will cycle through them using each entry's `delay` (ms).
 * The stable sort preserves frame order within each nominal size.
 *
 * @param {Array<{size:number, xhot:number, yhot:number, pixels:Uint8ClampedArray, delay?:number}>} frames
 *   pixels is straight (non-premultiplied) RGBA from canvas ImageData.
 * @returns {Uint8Array}
 */
export function buildXcursor(frames) {
  if (!frames.length) throw new Error('No frames provided')

  const sorted = [...frames].sort((a, b) => a.size - b.size)
  const ntoc = sorted.length

  // Calculate byte offsets for each chunk
  let offset = FILE_HEADER_SIZE + ntoc * TOC_ENTRY_SIZE
  const offsets = sorted.map(f => {
    const o = offset
    offset += CHUNK_HEADER_SIZE + f.size * f.size * 4
    return o
  })

  const buf = new ArrayBuffer(offset)
  const view = new DataView(buf)
  let pos = 0

  // File header
  view.setUint32(pos, 0x72756358, true); pos += 4  // magic "Xcur"
  view.setUint32(pos, FILE_HEADER_SIZE, true); pos += 4
  view.setUint32(pos, FILE_VERSION, true); pos += 4
  view.setUint32(pos, ntoc, true); pos += 4

  // TOC
  for (let i = 0; i < sorted.length; i++) {
    view.setUint32(pos, IMAGE_TYPE, true); pos += 4
    view.setUint32(pos, sorted[i].size, true); pos += 4   // subtype = nominal size
    view.setUint32(pos, offsets[i], true); pos += 4
  }

  // Image chunks
  for (let i = 0; i < sorted.length; i++) {
    const { size, xhot, yhot, pixels, delay } = sorted[i]

    // Chunk header (36 bytes)
    view.setUint32(pos, CHUNK_HEADER_SIZE, true); pos += 4
    view.setUint32(pos, IMAGE_TYPE, true); pos += 4
    view.setUint32(pos, size, true); pos += 4      // subtype
    view.setUint32(pos, 1, true); pos += 4          // version
    // Image fields
    view.setUint32(pos, size, true); pos += 4       // width
    view.setUint32(pos, size, true); pos += 4       // height
    view.setUint32(pos, Math.max(0, Math.min(xhot, size - 1)), true); pos += 4
    view.setUint32(pos, Math.max(0, Math.min(yhot, size - 1)), true); pos += 4
    view.setUint32(pos, delay ?? 50, true); pos += 4    // delay (ms); >1 chunk per size = animation

    // Pixel data: convert straight RGBA → premultiplied ARGB little-endian
    const n = size * size
    for (let p = 0; p < n; p++) {
      const ri = p * 4
      const r = pixels[ri]
      const g = pixels[ri + 1]
      const b = pixels[ri + 2]
      const a = pixels[ri + 3]
      const pr = a === 255 ? r : (r * a / 255 + 0.5) | 0
      const pg = a === 255 ? g : (g * a / 255 + 0.5) | 0
      const pb = a === 255 ? b : (b * a / 255 + 0.5) | 0
      // Pack as LE uint32: (a<<24)|(pr<<16)|(pg<<8)|pb
      view.setUint32(pos, ((a << 24) | (pr << 16) | (pg << 8) | pb) >>> 0, true)
      pos += 4
    }
  }

  return new Uint8Array(buf)
}
