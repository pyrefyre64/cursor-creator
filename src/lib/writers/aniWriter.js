/**
 * Windows .ani file writer (RIFF/ACON format).
 *
 * Produces a single-frame animated cursor whose one frame is a multi-size
 * .cur file. Windows uses this exactly as a static cursor while still
 * selecting the best size for the current DPI.
 *
 * File layout:
 *   RIFF 'ACON'
 *     anih  (ANIHEADER, 36 bytes)
 *     LIST 'fram'
 *       icon  (CUR-format data for the single frame)
 */

import { buildCur } from './curWriter.js'

const AF_ICON = 0x01

/**
 * @param {Array<{size:number, xhot:number, yhot:number, pixels:Uint8ClampedArray}>} frames
 * @returns {Promise<Uint8Array>}
 */
export async function buildAni(frames) {
  const curData = await buildCur(frames)

  // RIFF chunks must be word-aligned; pad CUR data if length is odd
  const iconPad         = curData.length % 2
  // icon sub-chunk:   4('icon') + 4(size) + data + pad
  const iconChunkTotal  = 8 + curData.length + iconPad
  // LIST payload:     4('fram') + icon chunk
  const listPayload     = 4 + iconChunkTotal
  // anih chunk:       4('anih') + 4(size) + 36 = 44
  // RIFF payload:     4('ACON') + 44 + 4('LIST') + 4(size) + listPayload
  const riffPayload     = 4 + 44 + 8 + listPayload
  const totalSize       = 8 + riffPayload   // 4('RIFF') + 4(size) + payload

  const buf   = new ArrayBuffer(totalSize)
  const view  = new DataView(buf)
  const bytes = new Uint8Array(buf)

  function write4cc(str) {
    for (let i = 0; i < 4; i++) bytes[pos++] = str.charCodeAt(i)
  }

  let pos = 0

  // RIFF header
  write4cc('RIFF')
  view.setUint32(pos, riffPayload, true); pos += 4
  write4cc('ACON')

  // anih chunk
  write4cc('anih')
  view.setUint32(pos, 36, true); pos += 4   // chunk size = ANIHEADER size
  view.setUint32(pos, 36, true); pos += 4   // cbSizeOf
  view.setUint32(pos,  1, true); pos += 4   // cFrames  = 1
  view.setUint32(pos,  1, true); pos += 4   // cSteps   = 1
  view.setUint32(pos,  0, true); pos += 4   // cx (0 = from image data)
  view.setUint32(pos,  0, true); pos += 4   // cy
  view.setUint32(pos,  0, true); pos += 4   // cBitCount
  view.setUint32(pos,  0, true); pos += 4   // cPlanes
  view.setUint32(pos, 30, true); pos += 4   // JifRate (irrelevant for single-frame)
  view.setUint32(pos, AF_ICON, true); pos += 4  // fl

  // LIST 'fram'
  write4cc('LIST')
  view.setUint32(pos, listPayload, true); pos += 4
  write4cc('fram')

  // icon sub-chunk
  write4cc('icon')
  view.setUint32(pos, curData.length, true); pos += 4
  bytes.set(curData, pos); pos += curData.length
  if (iconPad) bytes[pos++] = 0

  return new Uint8Array(buf)
}
