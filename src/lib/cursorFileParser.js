/**
 * Windows cursor (.cur) and animated cursor (.ani) file parser.
 *
 * Supports:
 *   .cur — Windows cursor (ICO-like format with hotspot)
 *   .ani — Windows animated cursor (RIFF/ACON; all frames extracted)
 *
 * Returns the largest available image from the first frame as a PNG data URL
 * plus hotspot. For animated cursors (>1 frames), also returns a `frames` array.
 */

/**
 * Parse a .cur or .ani file buffer.
 *
 * @param {ArrayBuffer} buffer
 * @param {string} filename
 * @returns {{
 *   dataUrl: string,
 *   hotspot: {x:number, y:number}|null,
 *   width: number,
 *   height: number,
 *   frames?: Array<{dataUrl:string, hotspot:{x:number,y:number}|null, width:number, height:number, delay:number}>
 * }}
 */
export function parseCursorFile(buffer, filename) {
  const data = new Uint8Array(buffer)
  const ext = filename.toLowerCase().split('.').pop()

  if (ext === 'ani') return _parseAni(data)
  if (ext === 'cur') return _parseCurBest(data)

  throw new Error(`Unsupported cursor format: .${ext}`)
}

// ── ANI parser ────────────────────────────────────────────────────────────────

function _parseAni(data) {
  if (data.length < 12) throw new Error('ANI file too small')
  if (_fourCC(data, 0) !== 'RIFF') throw new Error('Not a RIFF file')
  if (_fourCC(data, 8) !== 'ACON') throw new Error('Not an ACON file')

  const riffEnd = Math.min(8 + _u32(data, 4), data.length)
  let anih = null
  let rateChunk = null
  let seqChunk = null
  const iconChunks = []
  let pos = 12

  while (pos + 8 <= riffEnd) {
    const id = _fourCC(data, pos)
    const size = _u32(data, pos + 4)
    if (pos + 8 + size > data.length) break

    if (id === 'anih' && size >= 36) {
      // ANIHEADER fields (each a DWORD):
      //   +0  cbSize, +4  nFrames, +8  nSteps
      //   +12 iWidth, +16 iHeight, +20 iBitCount, +24 nPlanes
      //   +28 iDispRate (1/60th sec), +32 bfAttributes (flags)
      anih = {
        nFrames:  _u32(data, pos + 12),  // nFrames  (pos+8+4)
        cx:       _u32(data, pos + 20),  // iWidth   (pos+8+12)
        cy:       _u32(data, pos + 24),  // iHeight  (pos+8+16)
        iDispRate:_u32(data, pos + 36),  // iDispRate jiffies (pos+8+28)
        fl:       _u32(data, pos + 40),  // bfAttributes (pos+8+32)
      }
    } else if (id === 'rate' && size > 0) {
      // Per-step display rates (jiffies each, 1 jiffy = 1/60 s)
      rateChunk = []
      for (let ri = 0; ri < (size >> 2); ri++) {
        rateChunk.push(_u32(data, pos + 8 + ri * 4))
      }
    } else if (id === 'seq ' && size > 0) {
      // Playback sequence: maps step index → frame index (enables ping-pong etc.)
      seqChunk = []
      for (let si = 0; si < (size >> 2); si++) {
        seqChunk.push(_u32(data, pos + 8 + si * 4))
      }
    } else if (id === 'LIST' && pos + 12 <= riffEnd) {
      if (_fourCC(data, pos + 8) === 'fram') {
        let lpos = pos + 12
        const lend = pos + 8 + size
        while (lpos + 8 <= lend) {
          const lid = _fourCC(data, lpos)
          const lsz = _u32(data, lpos + 4)
          if (lid === 'icon') {
            iconChunks.push(data.subarray(lpos + 8, lpos + 8 + lsz))
          }
          lpos += 8 + lsz + (lsz & 1)
        }
      }
    }

    pos += 8 + size + (size & 1)
  }

  if (!iconChunks.length) throw new Error('No icon frames found in ANI file')

  // Expand the playback sequence.
  // If a seq chunk is present, nSteps may differ from nFrames (e.g. ping-pong:
  //   seq = [0,1,2,3,4,5,6,7,6,5,4,3,2,1] maps 14 steps onto 8 unique frames).
  // The rate chunk gives per-step delays; if absent, iDispRate applies to all steps.
  const globalJiffies = anih?.iDispRate || 30
  const nSteps = seqChunk?.length ?? iconChunks.length
  const afIcon = !anih || (anih.fl & 0x01) !== 0

  const parsedFrames = []
  const w = (!afIcon && anih?.cx) || 32
  const h = (!afIcon && anih?.cy) || 32

  for (let step = 0; step < nSteps; step++) {
    const frameIdx = seqChunk ? seqChunk[step] : step
    if (frameIdx >= iconChunks.length) continue
    const delay = Math.round((rateChunk?.[step] ?? globalJiffies) * 1000 / 60)
    const chunk = iconChunks[frameIdx]

    if (afIcon) {
      const images = _parseIcoCurAll(chunk)
      if (!images.length) throw new Error(`No decodable images in ANI frame ${frameIdx}`)
      const best = _pickBest(images)
      parsedFrames.push({ dataUrl: best.dataUrl, hotspot: best.hotspot, width: best.width, height: best.height, delay })
    } else {
      parsedFrames.push({ dataUrl: _parseBmpInIco(chunk, w, h), hotspot: null, width: w, height: h, delay })
    }
  }

  if (!parsedFrames.length) throw new Error('No frames produced from ANI file')
  const first = parsedFrames[0]
  return {
    dataUrl: first.dataUrl,
    hotspot: first.hotspot,
    width: first.width,
    height: first.height,
    ...(parsedFrames.length > 1 && { frames: parsedFrames }),
  }
}

// ── CUR parser ────────────────────────────────────────────────────────────────

function _parseCurBest(data) {
  const images = _parseIcoCurAll(data)
  if (!images.length) throw new Error('No images found in CUR file')
  return _pickBest(images)
}

/**
 * Parse all image entries from an ICO or CUR file.
 * Returns array of { dataUrl, hotspot, width, height }.
 */
function _parseIcoCurAll(data) {
  if (data.length < 6) return []

  const reserved = _u16(data, 0)
  const type     = _u16(data, 2)   // 1=ICO, 2=CUR
  const count    = _u16(data, 4)

  if (reserved !== 0 || (type !== 1 && type !== 2) || count === 0 || count > 256) return []

  const isCur = type === 2
  const images = []

  for (let i = 0; i < count; i++) {
    const off = 6 + i * 16
    if (off + 16 > data.length) break

    // Directory entry:
    //   +0  width  (0 = 256)
    //   +1  height (0 = 256)
    //   +2  colorCount
    //   +3  reserved
    //   +4  xHotspot (CUR) or planes (ICO)
    //   +6  yHotspot (CUR) or bitCount (ICO)
    //   +8  bytesInRes (4)
    //   +12 imageOffset (4)
    const declaredW = data[off]     || 256
    const declaredH = data[off + 1] || 256
    const xhot      = isCur ? _u16(data, off + 4) : 0
    const yhot      = isCur ? _u16(data, off + 6) : 0
    const iSize     = _u32(data, off + 8)
    const iOff      = _u32(data, off + 12)

    if (iOff + iSize > data.length || iSize < 4) continue

    const imgData = data.subarray(iOff, iOff + iSize)

    try {
      let dataUrl, actualW = declaredW, actualH = declaredH

      if (_isPng(imgData)) {
        dataUrl = _pngToDataUrl(imgData)
        // Read actual dimensions from PNG IHDR (bytes 16-23)
        if (imgData.length >= 24) {
          actualW = _u32(imgData, 16)
          actualH = _u32(imgData, 20)
        }
      } else {
        dataUrl = _parseBmpInIco(imgData, declaredW, declaredH)
      }

      images.push({ dataUrl, hotspot: { x: xhot, y: yhot }, width: actualW, height: actualH })
    } catch (err) {
      console.warn(`Skipping cursor image entry (${declaredW}×${declaredH}):`, err.message)
    }
  }

  return images
}

// ── BMP DIB decoder ───────────────────────────────────────────────────────────

/**
 * Decode a BMP DIB as embedded in an ICO/CUR file.
 * The DIB has XOR pixel data followed by a 1-bit AND mask.
 * The biHeight in the header is 2× the actual pixel height.
 *
 * @param {Uint8Array} data
 * @param {number} width  - from ICO directory (actual width)
 * @param {number} height - from ICO directory (actual height, NOT doubled)
 * @returns {string} PNG data URL
 */
function _parseBmpInIco(data, width, height) {
  if (data.length < 12) throw new Error('BMP data too small')

  const biSize     = _u32(data, 0)
  const biBitCount = _u16(data, 14)
  const biClrUsed  = biSize >= 40 ? _u32(data, 36) : 0

  if (biBitCount === 0) throw new Error('Invalid biBitCount = 0')

  const paletteCount = biBitCount <= 8 ? (biClrUsed || (1 << biBitCount)) : 0
  // Palette entries are 4 bytes each in BITMAPINFOHEADER (RGBQUAD: B G R reserved)
  const headerSize = biSize + paletteCount * 4

  // Row strides rounded up to 4-byte boundaries
  const xorRowBytes = ((width * biBitCount + 31) >> 5) << 2
  const andRowBytes = ((width + 31) >> 5) << 2

  const xorOffset = headerSize
  const andOffset = xorOffset + xorRowBytes * height
  const andAvail  = andOffset + andRowBytes * height <= data.length

  const rgba = new Uint8ClampedArray(width * height * 4)

  // Helper: read AND-mask alpha for pixel (x, srcY)
  const andAlpha = (srcY, x) => {
    if (!andAvail) return 255
    const byte = data[andOffset + srcY * andRowBytes + (x >> 3)]
    return ((byte >> (7 - (x & 7))) & 1) ? 0 : 255
  }

  if (biBitCount === 32) {
    let hasAlpha = false
    for (let y = 0; y < height; y++) {
      const srcY = height - 1 - y  // bottom-up
      for (let x = 0; x < width; x++) {
        const src = xorOffset + srcY * xorRowBytes + x * 4
        const dst = (y * width + x) * 4
        rgba[dst    ] = data[src + 2]  // R (BMP: BGRA)
        rgba[dst + 1] = data[src + 1]  // G
        rgba[dst + 2] = data[src    ]  // B
        rgba[dst + 3] = data[src + 3]  // A
        if (data[src + 3] > 0) hasAlpha = true
      }
    }
    // Old XP-era cursors: 32bpp but all-zero alpha — fall back to AND mask
    if (!hasAlpha && andAvail) {
      for (let y = 0; y < height; y++) {
        const srcY = height - 1 - y
        for (let x = 0; x < width; x++) {
          rgba[(y * width + x) * 4 + 3] = andAlpha(srcY, x)
        }
      }
    }

  } else if (biBitCount === 24) {
    for (let y = 0; y < height; y++) {
      const srcY = height - 1 - y
      for (let x = 0; x < width; x++) {
        const src = xorOffset + srcY * xorRowBytes + x * 3
        const dst = (y * width + x) * 4
        rgba[dst    ] = data[src + 2]
        rgba[dst + 1] = data[src + 1]
        rgba[dst + 2] = data[src    ]
        rgba[dst + 3] = andAlpha(srcY, x)
      }
    }

  } else if (biBitCount === 16) {
    // 5-5-5 (BI_RGB 16-bit default)
    for (let y = 0; y < height; y++) {
      const srcY = height - 1 - y
      for (let x = 0; x < width; x++) {
        const o   = xorOffset + srcY * xorRowBytes + x * 2
        const pix = data[o] | (data[o + 1] << 8)
        const dst = (y * width + x) * 4
        rgba[dst    ] = ((pix >> 10) & 0x1f) * 255 / 31 | 0
        rgba[dst + 1] = ((pix >>  5) & 0x1f) * 255 / 31 | 0
        rgba[dst + 2] = ( pix        & 0x1f) * 255 / 31 | 0
        rgba[dst + 3] = andAlpha(srcY, x)
      }
    }

  } else if (biBitCount === 8) {
    const pal = _readPalette(data, biSize, paletteCount)
    for (let y = 0; y < height; y++) {
      const srcY = height - 1 - y
      for (let x = 0; x < width; x++) {
        const c   = pal[data[xorOffset + srcY * xorRowBytes + x]] || [0, 0, 0]
        const dst = (y * width + x) * 4
        rgba[dst] = c[0]; rgba[dst + 1] = c[1]; rgba[dst + 2] = c[2]
        rgba[dst + 3] = andAlpha(srcY, x)
      }
    }

  } else if (biBitCount === 4) {
    const pal = _readPalette(data, biSize, paletteCount)
    for (let y = 0; y < height; y++) {
      const srcY = height - 1 - y
      for (let x = 0; x < width; x++) {
        const byte = data[xorOffset + srcY * xorRowBytes + (x >> 1)]
        const idx  = (x & 1) === 0 ? (byte >> 4) : (byte & 0xf)
        const c    = pal[idx] || [0, 0, 0]
        const dst  = (y * width + x) * 4
        rgba[dst] = c[0]; rgba[dst + 1] = c[1]; rgba[dst + 2] = c[2]
        rgba[dst + 3] = andAlpha(srcY, x)
      }
    }

  } else if (biBitCount === 1) {
    const pal = _readPalette(data, biSize, Math.min(paletteCount, 2))
    for (let y = 0; y < height; y++) {
      const srcY = height - 1 - y
      for (let x = 0; x < width; x++) {
        const bit = (data[xorOffset + srcY * xorRowBytes + (x >> 3)] >> (7 - (x & 7))) & 1
        const c   = pal[bit] || (bit ? [255, 255, 255] : [0, 0, 0])
        const dst = (y * width + x) * 4
        rgba[dst] = c[0]; rgba[dst + 1] = c[1]; rgba[dst + 2] = c[2]
        rgba[dst + 3] = andAlpha(srcY, x)
      }
    }

  } else {
    throw new Error(`Unsupported biBitCount: ${biBitCount}`)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').putImageData(new ImageData(rgba, width, height), 0, 0)
  return canvas.toDataURL('image/png')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Read BMP RGBQUAD palette: B G R reserved → [R, G, B] */
function _readPalette(data, biSize, count) {
  const pal = []
  for (let i = 0; i < count; i++) {
    const off = biSize + i * 4
    pal.push([data[off + 2], data[off + 1], data[off]])
  }
  return pal
}

function _pickBest(images) {
  return images.reduce((a, b) => (b.width * b.height > a.width * a.height) ? b : a)
}

function _isPng(data) {
  return data.length >= 4 &&
    data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47
}

/** Convert raw PNG bytes → base64 data URL without blowing the call stack */
function _pngToDataUrl(data) {
  const CHUNK = 8192
  let str = ''
  for (let i = 0; i < data.length; i += CHUNK) {
    str += String.fromCharCode.apply(null, data.subarray(i, Math.min(i + CHUNK, data.length)))
  }
  return 'data:image/png;base64,' + btoa(str)
}

function _fourCC(data, off) {
  return String.fromCharCode(data[off], data[off + 1], data[off + 2], data[off + 3])
}

function _u32(data, off) {
  return (data[off] | (data[off + 1] << 8) | (data[off + 2] << 16) | (data[off + 3] << 24)) >>> 0
}

function _u16(data, off) {
  return data[off] | (data[off + 1] << 8)
}
