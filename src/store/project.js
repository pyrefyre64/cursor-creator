import { reactive } from 'vue'
import { detectCursorFromFilename } from '../data/cursorDatabase.js'
import { getHandlerForFile, getHandlerForFileMagic } from '../lib/formatRegistry.js'

const SCHEMA_VERSION = '2.0'

// ── Project state (persisted in saved JSON) ──────────────────────────────────

export const project = reactive({
  version: SCHEMA_VERSION,
  meta: { name: 'MyTheme', description: '' },
  /** @type {Record<string, ImageEntry>} */
  images: {},
  /** @type {Record<string, string|null>} cursorId → imageId (primary/fallback) */
  assignments: {},
  /** @type {Record<string, Record<string, string>>} cursorId → sizeStr → imageId */
  sizeLinks: {},
  /** @type {Record<string, {x:boolean,y:boolean}>} cursorId → flip state */
  flips: {},
  /** @type {Record<string, Record<string, 'up'|'down'>>} cursorId → sizeStr → scale direction */
  scalePrefs: {},
  config: { sizes: [24, 32, 48] },
})

// ── UI state (not persisted) ─────────────────────────────────────────────────

export const ui = reactive({
  /** Currently selected cursor id in the assignment grid */
  selectedCursorId: null,
  /** Image id being dragged from the pool */
  draggingImageId: null,
  /** Image id to scroll-to and highlight in the pool (cleared after handling) */
  focusImageId: null,
  /** Toast notification */
  toast: null,    // { message: string, type: 'info'|'error' }
  /** When true, assignment grid shows only the 15 Windows-mapped cursor roles */
  simpleMode: true,
  /**
   * Pending size-conflict resolutions from import.
   * Each entry: { cursorId, sizeStr, newId, existingId, inPrimary }
   * @type {Array<{cursorId:string, sizeStr:string, newId:string, existingId:string, inPrimary:boolean}>}
   */
  conflicts: [],
})

// ── Helpers ───────────────────────────────────────────────────────────────────

let _idCounter = 0

function _nextId() {
  _idCounter++
  return `img_${String(_idCounter).padStart(3, '0')}`
}

function _refreshIdCounter() {
  const keys = Object.keys(project.images)
  if (keys.length === 0) { _idCounter = 0; return }
  const nums = keys.map(k => parseInt(k.replace('img_', ''), 10)).filter(n => !isNaN(n))
  _idCounter = nums.length ? Math.max(...nums) : 0
}

// ── Image pool ────────────────────────────────────────────────────────────────

/**
 * Import a single File into the image pool using the format registry.
 * Returns the new image id.
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function importFile(file) {
  let handler = getHandlerForFile(file)
  if (!handler) handler = await getHandlerForFileMagic(file)
  if (!handler) throw new Error(`No format handler for: ${file.name}`)

  const parsed = await handler.parse(file)
  const id = _nextId()
  const basename = file.name.replace(/\.[^.]+$/, '')

  // File identity is the generated id — filename is display-only metadata
  project.images[id] = {
    id,
    filename: file.name,
    data: parsed.dataUrl,
    dims: { width: parsed.width, height: parsed.height },
    hotspot: parsed.hotspot ?? {
      x: Math.floor(parsed.width / 2),
      y: Math.floor(parsed.height / 2),
    },
    ...(parsed.frames?.length > 1 && {
      frames: parsed.frames.map(f => ({
        data: f.dataUrl,
        hotspot: f.hotspot ?? { x: Math.floor(f.width / 2), y: Math.floor(f.height / 2) },
        delay: f.delay,
      })),
    }),
  }

  const detectedRole = detectCursorFromFilename(basename)
  if (detectedRole) {
    const conflict = _routeToRole(id, detectedRole, parsed.width, parsed.height)
    if (conflict) return { id, conflict }
  }

  return { id }
}

/**
 * Route a newly-imported image to its detected cursor role.
 * Returns a conflict descriptor if a same-size source already exists, null otherwise.
 * @private
 */
function _routeToRole(id, cursorId, width, height) {
  if (!project.assignments[cursorId]) {
    project.assignments[cursorId] = id
    return null
  }
  if (width !== height) return null   // non-square: just pool, no link

  const sizeStr = String(width)
  const primaryId = project.assignments[cursorId]
  const primaryImg = project.images[primaryId]
  if (primaryImg && primaryImg.dims.width === width) {
    return { cursorId, sizeStr, newId: id, existingId: primaryId, inPrimary: true }
  }
  const existingLinkId = project.sizeLinks[cursorId]?.[sizeStr]
  if (existingLinkId && project.images[existingLinkId]) {
    return { cursorId, sizeStr, newId: id, existingId: existingLinkId, inPrimary: false }
  }
  if (!project.sizeLinks[cursorId]) project.sizeLinks[cursorId] = {}
  project.sizeLinks[cursorId][sizeStr] = id
  return null
}

/**
 * Import a file and directly link it to a specific cursor role,
 * bypassing filename-based auto-detection.
 * Pushes a conflict to ui.conflicts if a same-size source already exists.
 * @param {File} file
 * @param {string} cursorId
 * @returns {Promise<string>} the new image id
 */
export async function importFileForCursor(file, cursorId) {
  let handler = getHandlerForFile(file)
  if (!handler) handler = await getHandlerForFileMagic(file)
  if (!handler) throw new Error(`No format handler for: ${file.name}`)

  const parsed = await handler.parse(file)
  const id = _nextId()

  project.images[id] = {
    id,
    filename: file.name,
    data: parsed.dataUrl,
    dims: { width: parsed.width, height: parsed.height },
    hotspot: parsed.hotspot ?? {
      x: Math.floor(parsed.width / 2),
      y: Math.floor(parsed.height / 2),
    },
  }

  const conflict = _routeToRole(id, cursorId, parsed.width, parsed.height)
  if (conflict) ui.conflicts.push(conflict)
  return id
}

/**
 * Import multiple files, returning an object of { successes, errors }.
 * Same-size conflicts are pushed to ui.conflicts for the user to resolve.
 * @param {FileList|File[]} files
 * @returns {Promise<{successes: string[], errors: string[]}>}
 */
export async function importFiles(files) {
  const successes = []
  const errors = []
  for (const file of Array.from(files)) {
    try {
      const { id, conflict } = await importFile(file)
      successes.push(id)
      if (conflict) ui.conflicts.push(conflict)
    } catch (err) {
      errors.push(file.name)
      console.warn('Failed to import', file.name, err)
    }
  }
  return { successes, errors }
}

/**
 * Resolve a size conflict.
 * choice 'keep'    — new image stays in pool unlinked; existing source unchanged.
 * choice 'replace' — new image takes the existing source's slot.
 * @param {{cursorId:string, sizeStr:string, newId:string, existingId:string, inPrimary:boolean}} conflict
 * @param {'keep'|'replace'} choice
 */
export function resolveSizeConflict(conflict, choice) {
  if (choice === 'replace') {
    if (conflict.inPrimary) {
      project.assignments[conflict.cursorId] = conflict.newId
    } else {
      if (!project.sizeLinks[conflict.cursorId]) project.sizeLinks[conflict.cursorId] = {}
      project.sizeLinks[conflict.cursorId][conflict.sizeStr] = conflict.newId
    }
  }
  const idx = ui.conflicts.indexOf(conflict)
  if (idx !== -1) ui.conflicts.splice(idx, 1)
}

/**
 * Link an already-imported pool image to a cursor role (as primary or sizeLink).
 * Equivalent to dragging a pool image into the cursor editor's sources list.
 * Pushes a conflict to ui.conflicts if a same-size source already exists.
 * @param {string} imageId
 * @param {string} cursorId
 */
export function linkPoolImageToCursor(imageId, cursorId) {
  const img = project.images[imageId]
  if (!img) return
  const conflict = _routeToRole(imageId, cursorId, img.dims.width, img.dims.height)
  if (conflict) ui.conflicts.push(conflict)
}

/**
 * Remove an image from the pool (and any assignments / size links pointing to it).
 * @param {string} imageId
 */
export function removeImage(imageId) {
  delete project.images[imageId]
  for (const [cursorId, assigned] of Object.entries(project.assignments)) {
    if (assigned !== imageId) continue
    // Promote the smallest remaining sizeLink (excluding the deleted image) to primary
    const remaining = Object.entries(project.sizeLinks[cursorId] ?? {})
      .filter(([, id]) => id !== imageId)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    if (remaining.length) {
      const [sizeStr, newPrimaryId] = remaining[0]
      project.assignments[cursorId] = newPrimaryId
      delete project.sizeLinks[cursorId][sizeStr]
    } else {
      project.assignments[cursorId] = null
    }
  }
  for (const links of Object.values(project.sizeLinks)) {
    for (const [sizeStr, linkId] of Object.entries(links)) {
      if (linkId === imageId) delete links[sizeStr]
    }
  }
}

// ── Assignments ───────────────────────────────────────────────────────────────

/** @param {string} cursorId @param {string} imageId */
export function setAssignment(cursorId, imageId) {
  project.assignments[cursorId] = imageId
}

/** @param {string} cursorId */
export function removeAssignment(cursorId) {
  project.assignments[cursorId] = null
  delete project.flips[cursorId]
}

/**
 * Toggle a flip axis for a cursor slot.
 * @param {string} cursorId
 * @param {'x'|'y'} axis
 */
export function toggleFlip(cursorId, axis) {
  if (!project.flips[cursorId]) project.flips[cursorId] = { x: false, y: false }
  project.flips[cursorId][axis] = !project.flips[cursorId][axis]
}

// ── Hotspot ───────────────────────────────────────────────────────────────────

/** @param {string} imageId @param {number} x @param {number} y */
export function setHotspot(imageId, x, y) {
  const img = project.images[imageId]
  if (!img) return
  img.hotspot = { x, y }
  if (img.frames) img.frames.forEach(f => { f.hotspot = { x, y } })
}

// ── Size links ────────────────────────────────────────────────────────────────

/**
 * Explicitly set a size link: a specific image to use for a given cursor role
 * at a given native pixel size.
 * @param {string} cursorId
 * @param {string|number} size  pixel width (image must be square)
 * @param {string} imageId
 */
export function setSizeLink(cursorId, size, imageId) {
  if (!project.sizeLinks[cursorId]) project.sizeLinks[cursorId] = {}
  project.sizeLinks[cursorId][String(size)] = imageId
}

/**
 * Remove a size link for a cursor role.
 * @param {string} cursorId
 * @param {string|number} size
 */
export function removeSizeLink(cursorId, size) {
  if (!project.sizeLinks[cursorId]) return
  delete project.sizeLinks[cursorId][String(size)]
}

// ── Scale preferences ─────────────────────────────────────────────────────────

/**
 * Set (or clear) the NN scaling direction preference for a cursor at a specific output size.
 * @param {string} cursorId
 * @param {string|number} size
 * @param {'up'|'down'|null} pref  pass null to revert to auto (prefers upscale)
 */
export function setScalePref(cursorId, size, pref) {
  const s = String(size)
  if (pref === null) {
    delete project.scalePrefs[cursorId]?.[s]
  } else {
    if (!project.scalePrefs[cursorId]) project.scalePrefs[cursorId] = {}
    project.scalePrefs[cursorId][s] = pref
  }
}

/**
 * Collect all available native sources for a cursor role (assignment + size links),
 * sorted by native size ascending.
 * @param {string} cursorId
 * @returns {Array<{data:string, hotspot:{x:number,y:number}, dims:{width:number,height:number}, imageId:string}>}
 */
export function getSourcesForCursor(cursorId) {
  const sources = []
  const primaryId = project.assignments[cursorId]
  if (primaryId && project.images[primaryId]) {
    const img = project.images[primaryId]
    sources.push({ data: img.data, hotspot: img.hotspot, dims: img.dims, imageId: primaryId })
  }
  const links = project.sizeLinks[cursorId] ?? {}
  for (const [, imgId] of Object.entries(links)) {
    if (imgId && project.images[imgId]) {
      const img = project.images[imgId]
      sources.push({ data: img.data, hotspot: img.hotspot, dims: img.dims, imageId: imgId })
    }
  }
  sources.sort((a, b) => a.dims.width - b.dims.width)
  return sources
}

// ── Save / Load ───────────────────────────────────────────────────────────────

export function saveProject() {
  const json = JSON.stringify({
    version: SCHEMA_VERSION,
    meta: { ...project.meta },
    images: project.images,
    assignments: { ...project.assignments },
    sizeLinks: project.sizeLinks,
    flips: { ...project.flips },
    scalePrefs: project.scalePrefs,
    config: { ...project.config },
  }, null, 2)

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.meta.name || 'project'}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Load a project from a JSON string.
 * @param {string} jsonText
 */
export function loadProject(jsonText) {
  const data = JSON.parse(jsonText)

  if (data.version !== SCHEMA_VERSION) {
    throw new Error(`Unsupported project version "${data.version ?? '(none)'}". This build requires v${SCHEMA_VERSION}.`)
  }

  project.version = SCHEMA_VERSION
  project.meta = data.meta ?? { name: 'MyTheme', description: '' }
  project.images = data.images ?? {}
  project.assignments = data.assignments ?? {}
  project.sizeLinks = data.sizeLinks ?? {}
  project.flips = data.flips ?? {}
  project.scalePrefs = data.scalePrefs ?? {}
  project.config = data.config ?? { sizes: [24, 32, 48] }

  _refreshIdCounter()
  ui.selectedCursorId = null
  ui.conflicts = []
}

export function resetProject() {
  project.meta = { name: 'MyTheme', description: '' }
  project.images = {}
  project.assignments = {}
  project.sizeLinks = {}
  project.flips = {}
  project.scalePrefs = {}
  project.config = { sizes: [24, 32, 48] }
  _idCounter = 0
  ui.selectedCursorId = null
  ui.conflicts = []
}

// ── Toast ─────────────────────────────────────────────────────────────────────

let _toastTimer = null

export function showToast(message, type = 'info') {
  if (_toastTimer) clearTimeout(_toastTimer)
  ui.toast = { message, type }
  _toastTimer = setTimeout(() => { ui.toast = null }, 3500)
}
