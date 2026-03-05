/**
 * Windows .ani file writer (RIFF/ACON format).
 *
 * Accepts an array of animation frames, each containing a multi-size CUR's
 * worth of pixel data. A single-element array produces a static cursor (one
 * frame ANI), which Windows treats identically to a .cur file while still
 * selecting the best DPI size from within the CUR.
 *
 * File layout:
 *   RIFF 'ACON'
 *     anih  (ANIHEADER, 36 bytes)
 *     rate  (optional — per-frame jiffies, written when delays vary)
 *     LIST 'fram'
 *       icon  (CUR-format data) × N
 */

import { buildCur } from './curWriter.js'

const AF_ICON = 0x01

/** Convert milliseconds to jiffies (1/60 s), minimum 1 */
function _msToJiffies(ms) {
  return Math.max(1, Math.round(ms * 60 / 1000))
}

/**
 * Build a Windows .ani file.
 *
 * @param {Array<{delay:number, sizeFrames:Array<{size:number,xhot:number,yhot:number,pixels:Uint8ClampedArray}>}>} animFrames
 *   Each element is one animation frame with a display delay (ms) and an array
 *   of per-DPI size variants (same data shape as buildCur expects).
 * @returns {Promise<Uint8Array>}
 */
export async function buildAni(animFrames) {
  const nFrames = animFrames.length

  // Build a CUR for every animation frame
  const curDatas = await Promise.all(animFrames.map(af => buildCur(af.sizeFrames)))

  // Decide whether we need a 'rate' chunk (per-frame delays differ)
  const jiffies = animFrames.map(af => _msToJiffies(af.delay))
  const uniformJiffy = jiffies[0]
  const needRateChunk = jiffies.some(j => j !== uniformJiffy)

  // Rate chunk: 4('rate') + 4(size) + nFrames*4
  const rateChunkSize = needRateChunk ? (8 + nFrames * 4) : 0

  // Icon sub-chunks inside LIST 'fram'
  //   each: 4('icon') + 4(dataLen) + data + optional pad byte
  const iconPads   = curDatas.map(d => d.length & 1)
  const iconTotals = curDatas.map((d, i) => 8 + d.length + iconPads[i])
  const totalIconBytes = iconTotals.reduce((s, n) => s + n, 0)

  // LIST 'fram' payload: 4('fram') + all icon sub-chunks
  const listPayload = 4 + totalIconBytes

  // anih chunk: 4('anih') + 4(36) + 36 bytes = 44
  // RIFF payload: 4('ACON') + 44 + rateChunkSize + 4('LIST') + 4(size) + listPayload
  const riffPayload = 4 + 44 + rateChunkSize + 8 + listPayload
  const totalSize   = 8 + riffPayload

  const buf   = new ArrayBuffer(totalSize)
  const view  = new DataView(buf)
  const bytes = new Uint8Array(buf)
  let pos = 0

  function write4cc(str) {
    for (let i = 0; i < 4; i++) bytes[pos++] = str.charCodeAt(i)
  }

  // RIFF header
  write4cc('RIFF')
  view.setUint32(pos, riffPayload, true); pos += 4
  write4cc('ACON')

  // anih chunk
  write4cc('anih')
  view.setUint32(pos, 36, true); pos += 4       // chunk size = ANIHEADER size
  view.setUint32(pos, 36, true); pos += 4       // cbSizeOf
  view.setUint32(pos, nFrames, true); pos += 4  // cFrames
  view.setUint32(pos, nFrames, true); pos += 4  // cSteps
  view.setUint32(pos, 0, true); pos += 4        // cx (0 = from image data)
  view.setUint32(pos, 0, true); pos += 4        // cy
  view.setUint32(pos, 0, true); pos += 4        // cBitCount
  view.setUint32(pos, 0, true); pos += 4        // cPlanes
  view.setUint32(pos, uniformJiffy, true); pos += 4   // JifRate (global; overridden by rate chunk)
  view.setUint32(pos, AF_ICON, true); pos += 4  // fl

  // rate chunk (only when per-frame delays vary)
  if (needRateChunk) {
    write4cc('rate')
    view.setUint32(pos, nFrames * 4, true); pos += 4
    for (const j of jiffies) {
      view.setUint32(pos, j, true); pos += 4
    }
  }

  // LIST 'fram'
  write4cc('LIST')
  view.setUint32(pos, listPayload, true); pos += 4
  write4cc('fram')

  // icon sub-chunks
  for (let i = 0; i < nFrames; i++) {
    const d = curDatas[i]
    write4cc('icon')
    view.setUint32(pos, d.length, true); pos += 4
    bytes.set(d, pos); pos += d.length
    if (iconPads[i]) bytes[pos++] = 0
  }

  return new Uint8Array(buf)
}
