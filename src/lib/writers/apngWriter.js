/**
 * Animated PNG (APNG) writer.
 *
 * APNG extends PNG with three new chunk types:
 *   acTL — animation control (frame count, loop count)
 *   fcTL — frame control (size, position, delay, dispose/blend ops)
 *   fdAT — frame data (same zlib stream as IDAT, with 4-byte seq prefix)
 *
 * Frame 0 uses the standard IDAT chunk so the file degrades gracefully to a
 * static PNG in viewers that don't support APNG.
 *
 * Pixel data is sourced from OffscreenCanvas.convertToBlob() PNG output, so
 * all colour types, bit depths, and filter methods are handled automatically.
 */

// ── CRC-32 ────────────────────────────────────────────────────────────────────

const _crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    t[n] = c
  }
  return t
})()

function _crc32(buf, offset, len) {
  let c = 0xFFFFFFFF
  for (let i = offset; i < offset + len; i++) c = _crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

// ── PNG chunk helpers ─────────────────────────────────────────────────────────

/** Build a complete PNG chunk: 4(length) + 4(type) + N(data) + 4(CRC). */
function _chunk(type, data) {
  const out = new Uint8Array(12 + data.length)
  const dv  = new DataView(out.buffer)
  dv.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  dv.setUint32(8 + data.length, _crc32(out, 4, 4 + data.length))
  return out
}

/** Extract all chunks from a PNG byte array (skips 8-byte signature). */
function _parsePngChunks(bytes) {
  const chunks = []
  let pos = 8
  while (pos + 8 <= bytes.length) {
    const len  = new DataView(bytes.buffer, bytes.byteOffset + pos, 4).getUint32(0)
    const type = String.fromCharCode(bytes[pos+4], bytes[pos+5], bytes[pos+6], bytes[pos+7])
    chunks.push({ type, data: bytes.subarray(pos + 8, pos + 8 + len) })
    pos += 12 + len
  }
  return chunks
}

/** Convert pixel data (straight RGBA Uint8ClampedArray) to a PNG Uint8Array. */
async function _pixelsToPng(pixels, width, height) {
  const canvas = new OffscreenCanvas(width, height)
  canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0)
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  return new Uint8Array(await blob.arrayBuffer())
}

// ── Public API ────────────────────────────────────────────────────────────────

const PNG_SIG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

/**
 * Build an Animated PNG from an array of cursor frames.
 *
 * @param {Array<{pixels: Uint8ClampedArray, delay: number}>} frames
 *   `pixels` is straight (non-premultiplied) RGBA, `delay` is in milliseconds.
 * @param {number} width
 * @param {number} height
 * @returns {Promise<Uint8Array>}
 */
export async function buildApng(frames, width, height) {
  if (!frames.length) throw new Error('No frames provided')

  // Convert every frame's pixel data to PNG bytes
  const pngs = await Promise.all(frames.map(f => _pixelsToPng(f.pixels, width, height)))

  // Parse each PNG and extract the IHDR data + concatenated IDAT stream
  const parsed = pngs.map((png, fi) => {
    const chunks = _parsePngChunks(png)
    const ihdr   = chunks.find(c => c.type === 'IHDR')?.data
    if (!ihdr) throw new Error(`Frame ${fi}: missing IHDR`)

    const idatParts = chunks.filter(c => c.type === 'IDAT').map(c => c.data)
    const totalLen  = idatParts.reduce((s, d) => s + d.length, 0)
    const idat      = new Uint8Array(totalLen)
    let off = 0
    for (const d of idatParts) { idat.set(d, off); off += d.length }

    return { ihdr, idat, delay: frames[fi].delay }
  })

  let seq = 0  // shared sequence counter for fcTL + fdAT chunks
  const parts = [PNG_SIG]

  // IHDR — from frame 0
  parts.push(_chunk('IHDR', parsed[0].ihdr))

  // acTL — animation control
  const actl = new Uint8Array(8)
  const actlDv = new DataView(actl.buffer)
  actlDv.setUint32(0, frames.length)  // num_frames
  actlDv.setUint32(4, 0)              // num_plays: 0 = loop forever
  parts.push(_chunk('acTL', actl))

  for (let i = 0; i < parsed.length; i++) {
    const { idat, delay } = parsed[i]

    // fcTL — frame control
    const fctl   = new Uint8Array(26)
    const fctlDv = new DataView(fctl.buffer)
    fctlDv.setUint32( 0, seq++)    // sequence_number
    fctlDv.setUint32( 4, width)    // width
    fctlDv.setUint32( 8, height)   // height
    fctlDv.setUint32(12, 0)        // x_offset
    fctlDv.setUint32(16, 0)        // y_offset
    fctlDv.setUint16(20, delay)    // delay_num  (numerator, ms)
    fctlDv.setUint16(22, 1000)     // delay_den  (denominator, 1000 → ms precision)
    fctl[24] = 0                   // dispose_op: APNG_DISPOSE_OP_NONE
    fctl[25] = 0                   // blend_op:   APNG_BLEND_OP_SOURCE (replace)
    parts.push(_chunk('fcTL', fctl))

    if (i === 0) {
      // Frame 0: standard IDAT so the file is a valid static PNG showing frame 0
      parts.push(_chunk('IDAT', idat))
    } else {
      // Frames 1+: fdAT = 4-byte sequence number + IDAT data
      const fdat = new Uint8Array(4 + idat.length)
      new DataView(fdat.buffer).setUint32(0, seq++)
      fdat.set(idat, 4)
      parts.push(_chunk('fdAT', fdat))
    }
  }

  // IEND
  parts.push(_chunk('IEND', new Uint8Array(0)))

  // Concatenate all parts into a single buffer
  const total = parts.reduce((s, p) => s + p.length, 0)
  const out   = new Uint8Array(total)
  let off = 0
  for (const p of parts) { out.set(p, off); off += p.length }
  return out
}
