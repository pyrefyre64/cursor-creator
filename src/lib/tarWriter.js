/**
 * Pure JS POSIX ustar tar writer.
 * Supports regular files, directories, and symbolic links.
 */

const ENC = new TextEncoder()

export class TarWriter {
  constructor() {
    this._chunks = []
  }

  addDirectory(name) {
    if (!name.endsWith('/')) name += '/'
    this._chunks.push(_makeHeader(name, '5', 0))
  }

  /** @param {string} name @param {Uint8Array} data */
  addFile(name, data) {
    this._chunks.push(_makeHeader(name, '0', data.length))
    // Pad data to 512-byte boundary
    const padded = new Uint8Array(Math.ceil(data.length / 512) * 512)
    padded.set(data)
    this._chunks.push(padded)
  }

  /** @param {string} name @param {string} target */
  addSymlink(name, target) {
    this._chunks.push(_makeHeader(name, '2', 0, target))
  }

  /** @returns {Uint8Array} */
  getBytes() {
    // End-of-archive: two zero 512-byte blocks
    this._chunks.push(new Uint8Array(1024))
    const total = this._chunks.reduce((s, c) => s + c.length, 0)
    const out = new Uint8Array(total)
    let off = 0
    for (const chunk of this._chunks) {
      out.set(chunk, off)
      off += chunk.length
    }
    return out
  }
}

/**
 * @param {string} name
 * @param {'0'|'2'|'5'} type  file=0, symlink=2, dir=5
 * @param {number} size
 * @param {string} [linkname]
 */
function _makeHeader(name, type, size, linkname = '') {
  const hdr = new Uint8Array(512)

  // ustar allows name up to 100 bytes, with overflow in prefix (155 bytes).
  // Simple approach: split at last '/' if name > 100 chars.
  let prefix = ''
  let shortName = name
  if (ENC.encode(name).length > 100) {
    const i = name.lastIndexOf('/', 154)
    if (i > 0) {
      prefix = name.slice(0, i)
      shortName = name.slice(i + 1)
    }
  }

  _writeStr(hdr, 0, 100, shortName)
  _writeOctal(hdr, 100, 8, 0o755)                              // mode
  _writeOctal(hdr, 108, 8, 0)                                  // uid
  _writeOctal(hdr, 116, 8, 0)                                  // gid
  _writeOctal(hdr, 124, 12, size)                              // size
  _writeOctal(hdr, 136, 12, Math.floor(Date.now() / 1000))    // mtime
  hdr[156] = type.charCodeAt(0)                                // typeflag
  if (linkname) _writeStr(hdr, 157, 100, linkname)
  _writeStr(hdr, 257, 6, 'ustar\0')                           // magic
  _writeStr(hdr, 263, 2, '00')                                 // version
  _writeStr(hdr, 265, 32, 'root')                              // uname
  _writeStr(hdr, 297, 32, 'root')                              // gname
  if (prefix) _writeStr(hdr, 345, 155, prefix)

  // Checksum: fill field with spaces, compute, then write
  hdr.fill(0x20, 148, 156)
  let sum = 0
  for (const b of hdr) sum += b
  _writeOctal(hdr, 148, 8, sum)

  return hdr
}

function _writeStr(hdr, off, maxLen, str) {
  const bytes = ENC.encode(str)
  const n = Math.min(bytes.length, maxLen)
  hdr.set(bytes.subarray(0, n), off)
}

function _writeOctal(hdr, off, len, val) {
  const s = val.toString(8).padStart(len - 1, '0') + '\0'
  _writeStr(hdr, off, len, s)
}
