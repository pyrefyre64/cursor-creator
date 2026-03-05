/**
 * Export the current project as a zip of raw PNG files.
 * Organised as {cursorId}_{size}.png — useful for further editing
 * or use in tools outside this workflow.
 */

import { zipSync } from 'fflate'
import { processImage, processOverride } from '../imageProcessor.js'
import { project } from '../../store/project.js'

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

  const assignedEntries = Object.entries(project.assignments)
    .filter(([, id]) => id && project.images[id])
  if (assignedEntries.length === 0) throw new Error('No cursor images assigned.')

  const zipFiles = {}

  for (const [cursorId, imageId] of assignedEntries) {
    const imageEntry = project.images[imageId]
    if (!imageEntry) continue

    const flip = project.flips[cursorId] ?? { x: false, y: false }

    for (const size of sizes) {
      const override = imageEntry.sizeOverrides?.[String(size)]
      try {
        const frame = override?.data
          ? await processOverride(override.data, size, override.hotspot ?? null,
              imageEntry.hotspot ?? { x: 0, y: 0 },
              imageEntry.dims   ?? { width: size, height: size }, flip)
          : await processImage(imageEntry.data, size,
              imageEntry.hotspot ?? { x: 0, y: 0 },
              imageEntry.dims   ?? { width: size, height: size }, flip)

        zipFiles[`${cursorId}_${size}.png`] = await _pixelsToPng(frame.pixels, size, size)
      } catch (err) {
        console.warn(`Skipping size ${size} for ${cursorId} (png):`, err)
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
