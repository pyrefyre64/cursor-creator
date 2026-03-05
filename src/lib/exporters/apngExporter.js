/**
 * Export cursor animations as Animated PNG (.png) files in a zip.
 *
 * Static cursors are included as regular (single-frame) PNG files when
 * `animatedOnly` is false.
 *
 * File naming: {cursorId}_{size}.png  (APNG or static PNG, same extension)
 */

import { zipSync } from 'fflate'
import { buildApng } from '../writers/apngWriter.js'
import { processFromSources, processAnimFrame } from '../imageProcessor.js'
import { project, getSourcesForCursor } from '../../store/project.js'

async function _pixelsToPng(pixels, width, height) {
  const canvas = new OffscreenCanvas(width, height)
  canvas.getContext('2d').putImageData(new ImageData(pixels, width, height), 0, 0)
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  return new Uint8Array(await blob.arrayBuffer())
}

/**
 * Export cursors as (animated) PNG files in a zip.
 *
 * @param {boolean} animatedOnly  When true, skip static cursors entirely.
 * @returns {Promise<void>}
 */
export async function exportApngZip(animatedOnly = false) {
  const themeName     = (project.meta.name || 'MyTheme').trim()
  const safeThemeName = themeName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')
  const sizes         = [...project.config.sizes].sort((a, b) => a - b)

  if (sizes.length === 0) throw new Error('No output sizes selected.')

  const assignedCursorIds = Object.keys(project.assignments)
    .filter(cursorId => getSourcesForCursor(cursorId).length > 0)
  if (assignedCursorIds.length === 0) throw new Error('No cursor images assigned.')

  const zipFiles = {}

  for (const cursorId of assignedCursorIds) {
    const flip       = project.flips[cursorId] ?? { x: false, y: false }
    const sources    = getSourcesForCursor(cursorId)
    const primaryImg = project.images[project.assignments[cursorId]]
    const isAnimated = primaryImg?.frames?.length > 1

    if (!isAnimated && animatedOnly) continue

    for (const size of sizes) {
      const filename = `${cursorId}_${size}.png`
      try {
        if (isAnimated) {
          // Build one APNG per output size from all animation frames
          const apngFrames = []
          for (const frame of primaryImg.frames) {
            const result = await processAnimFrame(frame, primaryImg.dims, size, flip)
            apngFrames.push({ pixels: result.pixels, delay: frame.delay })
          }
          zipFiles[filename] = await buildApng(apngFrames, size, size)
        } else {
          // Static cursor: regular PNG
          const scalePref = project.scalePrefs[cursorId]?.[String(size)] ?? null
          const result    = await processFromSources(sources, size, flip, scalePref)
          zipFiles[filename] = await _pixelsToPng(result.pixels, size, size)
        }
      } catch (err) {
        console.warn(`Skipping ${cursorId} at ${size}px (apng):`, err)
      }
    }
  }

  if (!Object.keys(zipFiles).length) {
    throw new Error(animatedOnly ? 'No animated cursors found.' : 'No cursors could be processed.')
  }

  const suffix = animatedOnly ? '_apng_anim' : '_apng'
  _download(`${safeThemeName}${suffix}.zip`, zipSync(zipFiles), 'application/zip')
}

function _download(filename, data, mimeType) {
  const blob = new Blob([data], { type: mimeType })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
