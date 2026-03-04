/**
 * Format handler plugin registry.
 *
 * A format handler is a plain object matching this interface:
 *
 *   {
 *     name: string          — human-readable name (e.g. "Windows Cursor")
 *     extensions?: string[] — file extensions WITHOUT dot (e.g. ['cur', 'ani'])
 *     mimeTypes?: string[]  — MIME type prefixes (e.g. ['image/'])
 *
 *     async parse(file: File): Promise<ParsedImage>
 *   }
 *
 *   ParsedImage: {
 *     dataUrl: string               — PNG/JPEG/etc. data URL for display & processing
 *     hotspot: {x,y} | null        — embedded hotspot (null = use center default)
 *     width: number                 — actual pixel width
 *     height: number                — actual pixel height
 *   }
 *
 * Register handlers in priority order (first extension-match wins).
 * Register via registerFormatHandler() before mounting the app.
 */

/** @type {Array<object>} */
const _handlers = []

/**
 * Register a format handler plugin.
 * @param {object} handler
 */
export function registerFormatHandler(handler) {
  _handlers.push(handler)
}

/**
 * Find the appropriate handler for a given File.
 * Extension matching takes precedence over MIME type matching.
 *
 * @param {File} file
 * @returns {object|null}
 */
export function getHandlerForFile(file) {
  const ext = file.name.toLowerCase().split('.').pop()

  const byExt = _handlers.find(h => h.extensions?.includes(ext))
  if (byExt) return byExt

  const byMime = _handlers.find(h => h.mimeTypes?.some(m => file.type.startsWith(m)))
  return byMime ?? null
}

/**
 * Build the `accept` string for <input type="file">.
 * Combines all MIME type prefixes and file extensions from registered handlers.
 *
 * @returns {string}  e.g. "image/*,.cur,.ani"
 */
export function getAcceptString() {
  const mimes = _handlers.flatMap(h => h.mimeTypes ?? [])
  const exts  = _handlers.flatMap(h => (h.extensions ?? []).map(e => `.${e}`))
  return [...new Set([...mimes, ...exts])].join(',')
}
