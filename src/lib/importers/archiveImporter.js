/**
 * Archive importer: extracts .zip, .tar.gz / .tgz, and .tar files and feeds
 * their contents through the normal importFiles() pipeline.
 *
 * Security limits:
 *   - Path traversal: entries with '..' segments or absolute paths are rejected.
 *   - Decompressed size cap: 200 MB (catches zip-bomb-style archives).
 *   - Bulk warning: caller-supplied confirmBulk() is awaited when count > 50.
 *   - No nested archive recursion: archives found inside archives are skipped.
 */

import { gunzipSync, unzipSync } from 'fflate'
import { parseTar } from './tarReader.js'
import { importFiles } from '../../store/project.js'

const MAX_DECOMPRESSED   = 200 * 1024 * 1024  // 200 MB
const BULK_WARN_THRESHOLD = 50

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Reject paths with traversal components or absolute roots. */
function isSafePath(name) {
  if (!name || name.startsWith('/') || name.startsWith('\\')) return false
  return !name.replace(/\\/g, '/').split('/').some(p => p === '..')
}

/** Skip nested archives to prevent recursion. */
function isNestedArchive(name) {
  const n = name.toLowerCase()
  return n.endsWith('.zip') || n.endsWith('.tar') || n.endsWith('.tar.gz') || n.endsWith('.tgz') || n.endsWith('.gz')
}

const _MIME_MAP = {
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  svg:  'image/svg+xml',
  cur:  'image/vnd.microsoft.icon',
}

/** Create a File object from a raw bytes entry. Basename only (no path). */
function makeFile(name, data) {
  const basename = name.replace(/\\/g, '/').split('/').pop() || name
  const ext  = basename.split('.').pop()?.toLowerCase() ?? ''
  const type = _MIME_MAP[ext] ?? ''
  return new File([data], basename, type ? { type } : {})
}

/** Filter, optionally confirm, then import a flat array of {name, data} entries. */
async function _dispatchEntries(entries, confirmBulk) {
  const safe = entries.filter(
    e => isSafePath(e.name) && !isNestedArchive(e.name) && e.data.length > 0
  )
  if (safe.length > BULK_WARN_THRESHOLD) {
    const ok = await confirmBulk(safe.length)
    if (!ok) return { successes: [], errors: [] }
  }
  return importFiles(safe.map(e => makeFile(e.name, e.data)))
}

// ── Format handlers ────────────────────────────────────────────────────────────

async function _importZip(raw, confirmBulk) {
  let files
  try {
    files = unzipSync(raw)
  } catch (err) {
    throw new Error('Failed to read ZIP: ' + err.message)
  }
  const entries = Object.entries(files)
    .filter(([name]) => !name.endsWith('/'))
    .map(([name, bytes]) => ({ name, data: bytes }))
  return _dispatchEntries(entries, confirmBulk)
}

async function _importTar(raw, confirmBulk) {
  return _dispatchEntries(parseTar(raw), confirmBulk)
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Import a .zip, .tar.gz / .tgz, or .tar archive File.
 *
 * @param {File} file
 * @param {(count: number) => Promise<boolean>} confirmBulk
 *   Called when the archive contains more than 50 importable files.
 *   Should resolve true to proceed or false to cancel.
 * @returns {Promise<{successes: string[], errors: string[]}>}
 */
export async function importArchive(file, confirmBulk) {
  const lower = file.name.toLowerCase()
  const raw   = new Uint8Array(await file.arrayBuffer())

  if (lower.endsWith('.zip')) {
    return _importZip(raw, confirmBulk)
  }

  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
    let decomp
    try {
      decomp = gunzipSync(raw)
    } catch (err) {
      throw new Error('Failed to decompress: ' + err.message)
    }
    if (decomp.length > MAX_DECOMPRESSED) {
      throw new Error(`Decompressed archive exceeds the 200 MB safety limit.`)
    }
    return _importTar(decomp, confirmBulk)
  }

  if (lower.endsWith('.tar')) {
    if (raw.length > MAX_DECOMPRESSED) {
      throw new Error(`Archive exceeds the 200 MB safety limit.`)
    }
    return _importTar(raw, confirmBulk)
  }

  throw new Error(`Unsupported archive format: ${file.name}`)
}

/**
 * Returns true if the file looks like a supported archive.
 * @param {File} file
 * @returns {boolean}
 */
export function isArchiveFile(file) {
  const n = file.name.toLowerCase()
  return n.endsWith('.zip') || n.endsWith('.tar.gz') || n.endsWith('.tgz') || n.endsWith('.tar')
}
