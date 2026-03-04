/**
 * Lightweight POSIX ustar tar reader.
 * Supports old-style GNU tar and POSIX ustar (prefix field for long paths).
 * Returns only regular file entries; directories and symlinks are skipped.
 */

const _dec = new TextDecoder('utf-8', { fatal: false })

function readStr(bytes, offset, length) {
  let end = offset
  while (end < offset + length && bytes[end] !== 0) end++
  return _dec.decode(bytes.subarray(offset, end))
}

function readOctal(bytes, offset, length) {
  const s = readStr(bytes, offset, length).trim()
  return s ? parseInt(s, 8) : 0
}

/**
 * Parse a tar archive.
 * @param {Uint8Array} data
 * @returns {Array<{name: string, data: Uint8Array}>}
 */
export function parseTar(data) {
  const entries = []
  let pos = 0

  while (pos + 512 <= data.length) {
    const hdr = data.subarray(pos, pos + 512)

    // Two consecutive all-zero blocks = end of archive
    if (!hdr.some(b => b !== 0)) break

    const typeflag = hdr[156]  // '0'/0x30 = regular file, 0x00 = old-style regular
    const size     = readOctal(hdr, 124, 12)
    let   name     = readStr(hdr, 0, 100)

    // POSIX ustar: prepend prefix if present
    const magic = readStr(hdr, 257, 6)
    if (magic.startsWith('ustar')) {
      const prefix = readStr(hdr, 345, 155)
      if (prefix) name = prefix + '/' + name
    }

    pos += 512  // advance past header

    const isRegular = typeflag === 0x30 || typeflag === 0x00  // '0' or NUL
    if (isRegular && size > 0) {
      entries.push({ name, data: data.slice(pos, pos + size) })
    }

    // Advance past data blocks (rounded up to 512-byte boundary)
    pos += Math.ceil(size / 512) * 512
  }

  return entries
}
