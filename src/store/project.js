import { reactive } from 'vue'
import { detectCursorFromFilename } from '../data/cursorDatabase.js'
import { getHandlerForFile, getHandlerForFileMagic } from '../lib/formatRegistry.js'

// ── Project state (persisted in saved JSON) ──────────────────────────────────

export const project = reactive({
  version: '1.0',
  meta: { name: 'MyTheme', description: '' },
  /** @type {Record<string, ImageEntry>} */
  images: {},
  /** @type {Record<string, string|null>} cursorId → imageId */
  assignments: {},
  /** @type {Record<string, {x:boolean,y:boolean}>} cursorId → flip state */
  flips: {},
  config: { sizes: [24, 32, 48] },
})

// ── UI state (not persisted) ─────────────────────────────────────────────────

export const ui = reactive({
  /** Currently selected cursor id in the assignment grid */
  selectedCursorId: null,
  /** Image id being dragged from the pool */
  draggingImageId: null,
  /** Toast notification */
  toast: null,    // { message: string, type: 'info'|'error' }
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

  project.images[id] = {
    id,
    filename: file.name,
    data: parsed.dataUrl,
    dims: { width: parsed.width, height: parsed.height },
    hotspot: parsed.hotspot ?? {
      x: Math.floor(parsed.width / 2),
      y: Math.floor(parsed.height / 2),
    },
    sizeOverrides: {},
  }

  // Auto-detect and assign if slot is free
  const detectedRole = detectCursorFromFilename(basename)
  if (detectedRole && !project.assignments[detectedRole]) {
    project.assignments[detectedRole] = id
  }

  return id
}

/**
 * Import multiple files, returning an object of { successes, errors }.
 * @param {FileList|File[]} files
 * @returns {Promise<{successes: string[], errors: string[]}>}
 */
export async function importFiles(files) {
  const successes = []
  const errors = []
  for (const file of Array.from(files)) {
    try {
      const id = await importFile(file)
      successes.push(id)
    } catch (err) {
      errors.push(file.name)
      console.warn('Failed to import', file.name, err)
    }
  }
  return { successes, errors }
}

/**
 * Remove an image from the pool (and any assignments pointing to it).
 * @param {string} imageId
 */
export function removeImage(imageId) {
  delete project.images[imageId]
  for (const [cursorId, assigned] of Object.entries(project.assignments)) {
    if (assigned === imageId) project.assignments[cursorId] = null
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
  if (!project.images[imageId]) return
  project.images[imageId].hotspot = { x, y }
}

// ── Size overrides ────────────────────────────────────────────────────────────

/**
 * @param {string} imageId
 * @param {number} size
 * @param {string} dataUrl
 * @param {{x:number,y:number}|null} [hotspot]
 */
export function setSizeOverride(imageId, size, dataUrl, hotspot = null) {
  if (!project.images[imageId]) return
  project.images[imageId].sizeOverrides[String(size)] = { data: dataUrl, hotspot }
}

/** @param {string} imageId @param {number} size */
export function removeSizeOverride(imageId, size) {
  if (!project.images[imageId]) return
  delete project.images[imageId].sizeOverrides[String(size)]
}

/** @param {string} imageId @param {number} size @param {number} x @param {number} y */
export function setOverrideHotspot(imageId, size, x, y) {
  const ov = project.images[imageId]?.sizeOverrides[String(size)]
  if (ov) ov.hotspot = { x, y }
}

// ── Save / Load ───────────────────────────────────────────────────────────────

export function saveProject() {
  const json = JSON.stringify({
    version: project.version,
    meta: { ...project.meta },
    images: project.images,
    assignments: { ...project.assignments },
    flips: { ...project.flips },
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

  project.version = data.version ?? '1.0'
  project.meta = data.meta ?? { name: 'MyTheme', description: '' }
  project.images = data.images ?? {}
  project.assignments = data.assignments ?? {}
  project.flips = data.flips ?? {}
  project.config = data.config ?? { sizes: [24, 32, 48] }

  _refreshIdCounter()
  ui.selectedCursorId = null
}

export function resetProject() {
  project.meta = { name: 'MyTheme', description: '' }
  project.images = {}
  project.assignments = {}
  project.flips = {}
  project.config = { sizes: [24, 32, 48] }
  _idCounter = 0
  ui.selectedCursorId = null
}

// ── Toast ─────────────────────────────────────────────────────────────────────

let _toastTimer = null

export function showToast(message, type = 'info') {
  if (_toastTimer) clearTimeout(_toastTimer)
  ui.toast = { message, type }
  _toastTimer = setTimeout(() => { ui.toast = null }, 3500)
}

