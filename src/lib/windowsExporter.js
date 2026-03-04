/**
 * Export the current project as a zip of Windows .ani cursor files.
 * Each assigned cursor slot becomes one .ani file (single-frame, multi-size).
 * Triggers a browser download of ThemeName_windows.zip.
 */

import { zipSync } from 'fflate'
import { buildAni } from './aniWriter.js'
import { processImage, processOverride } from './imageProcessor.js'
import { project } from '../store/project.js'

export async function exportWindowsCursors() {
  const themeName = (project.meta.name || 'MyTheme').trim().replace(/\s+/g, '_')
  const sizes = [...project.config.sizes].sort((a, b) => a - b)

  if (sizes.length === 0) throw new Error('No output sizes selected.')

  const assignedEntries = Object.entries(project.assignments).filter(([, id]) => id && project.images[id])
  if (assignedEntries.length === 0) throw new Error('No cursor images assigned.')

  const zipFiles = {}

  for (const [cursorId, imageId] of assignedEntries) {
    const imageEntry = project.images[imageId]
    if (!imageEntry) continue

    const flip = project.flips[cursorId] ?? { x: false, y: false }

    const frames = []
    for (const size of sizes) {
      const override = imageEntry.sizeOverrides?.[String(size)]
      try {
        if (override?.data) {
          frames.push(await processOverride(
            override.data, size,
            override.hotspot ?? null,
            imageEntry.hotspot ?? { x: 0, y: 0 },
            imageEntry.dims ?? { width: size, height: size },
            flip,
          ))
        } else {
          frames.push(await processImage(
            imageEntry.data, size,
            imageEntry.hotspot ?? { x: 0, y: 0 },
            imageEntry.dims ?? { width: size, height: size },
            flip,
          ))
        }
      } catch (err) {
        console.warn(`Skipping size ${size} for ${cursorId} (windows):`, err)
      }
    }

    if (!frames.length) continue

    zipFiles[`${cursorId}.ani`] = await buildAni(frames)
  }

  if (!Object.keys(zipFiles).length) throw new Error('No cursors could be processed.')

  const zipped = zipSync(zipFiles)
  _download(`${themeName}_windows.zip`, zipped, 'application/zip')
}

function _download(filename, data, mimeType) {
  const blob = new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
