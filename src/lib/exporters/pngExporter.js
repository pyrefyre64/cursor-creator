/**
 * Export the current project as a zip of raw PNG files.
 * Organised as {cursorId}_{size}.png — useful for further editing
 * or use in tools outside this workflow.
 */

import { zipSync } from 'fflate'
import { processFromSources, processAnimFrame } from '../imageProcessor.js'
import { project, getSourcesForCursor } from '../../store/project.js'

async function _pixelsToPng(pixels, width, height) {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.putImageData(new ImageData(pixels, width, height), 0, 0)
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  return new Uint8Array(await blob.arrayBuffer())
}

export async function exportPngZip() {
  const themeName = (project.meta.name || 'MyTheme').trim()
  const safeThemeName = themeName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')
  const sizes = [...project.config.sizes].sort((a, b) => a - b)

  if (sizes.length === 0) throw new Error('No output sizes selected.')

  const assignedCursorIds = Object.keys(project.assignments)
    .filter(cursorId => getSourcesForCursor(cursorId).length > 0)
  if (assignedCursorIds.length === 0) throw new Error('No cursor images assigned.')

  const zipFiles = {}

  for (const cursorId of assignedCursorIds) {
    const flip = project.flips[cursorId] ?? { x: false, y: false }
    const sources = getSourcesForCursor(cursorId)

    const primaryImg = project.images[project.assignments[cursorId]]
    const isAnimated = primaryImg?.frames?.length > 1

    if (isAnimated) {
      for (let fi = 0; fi < primaryImg.frames.length; fi++) {
        const frame = primaryImg.frames[fi]
        const tag = String(fi).padStart(2, '0')
        for (const size of sizes) {
          try {
            const result = await processAnimFrame(frame, primaryImg.dims, size, flip)
            zipFiles[`${cursorId}_${size}_f${tag}.png`] = await _pixelsToPng(result.pixels, size, size)
          } catch (err) {
            console.warn(`Skipping frame ${fi} size ${size} for ${cursorId} (png):`, err)
          }
        }
      }
    } else {
      for (const size of sizes) {
        try {
          const scalePref = project.scalePrefs[cursorId]?.[String(size)] ?? null
          const result = await processFromSources(sources, size, flip, scalePref)
          zipFiles[`${cursorId}_${size}.png`] = await _pixelsToPng(result.pixels, size, size)
        } catch (err) {
          console.warn(`Skipping size ${size} for ${cursorId} (png):`, err)
        }
      }
    }
  }

  if (!Object.keys(zipFiles).length) throw new Error('No cursors could be processed.')

  _download(`${safeThemeName}_cursors.zip`, zipSync(zipFiles), 'application/zip')
}

function _download(filename, data, mimeType) {
  const blob = new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
