import { gzip } from 'fflate'
import { buildXcursor } from './xcursor.js'
import { TarWriter } from './tarWriter.js'
import { processImage, processOverride } from './imageProcessor.js'
import { project } from '../store/project.js'
import { getCursorById } from '../data/cursorDatabase.js'

/**
 * Export the current project as a KDE cursor theme .tar.gz file.
 * Triggers a browser download.
 *
 * @returns {Promise<void>}
 */
export async function exportTheme() {
  const themeName = (project.meta.name || 'MyTheme').trim().replace(/\s+/g, '_')
  const sizes = [...project.config.sizes].sort((a, b) => a - b)

  if (sizes.length === 0) throw new Error('No output sizes selected.')

  const assignedEntries = Object.entries(project.assignments).filter(([, id]) => id && project.images[id])
  if (assignedEntries.length === 0) throw new Error('No cursor images assigned.')

  const tar = new TarWriter()
  tar.addDirectory(themeName)
  tar.addDirectory(`${themeName}/cursors`)

  // index.theme
  const indexContent = [
    '[Icon Theme]',
    `Name=${project.meta.name || themeName}`,
    `Comment=${project.meta.description || ''}`,
    '',
  ].join('\n')
  tar.addFile(`${themeName}/index.theme`, new TextEncoder().encode(indexContent))

  // Track which alias names are already claimed (to avoid duplicate symlinks)
  const usedNames = new Set()

  for (const [cursorId, imageId] of assignedEntries) {
    const imageEntry = project.images[imageId]
    const cursor = getCursorById(cursorId)
    if (!cursor || !imageEntry) continue

    usedNames.add(cursorId)

    // Build one frame per output size
    const frames = []
    for (const size of sizes) {
      const override = imageEntry.sizeOverrides?.[String(size)]
      try {
        if (override?.data) {
          const frame = await processOverride(
            override.data,
            size,
            override.hotspot ?? null,
            imageEntry.hotspot ?? { x: 0, y: 0 },
            imageEntry.dims ?? { width: size, height: size },
          )
          frames.push(frame)
        } else {
          const frame = await processImage(
            imageEntry.data,
            size,
            imageEntry.hotspot ?? { x: 0, y: 0 },
            imageEntry.dims ?? { width: size, height: size },
          )
          frames.push(frame)
        }
      } catch (err) {
        console.warn(`Skipping size ${size} for ${cursorId}:`, err)
      }
    }

    if (!frames.length) continue

    const xcurData = buildXcursor(frames)
    tar.addFile(`${themeName}/cursors/${cursorId}`, xcurData)

    // Aliases as symlinks (skip any already used as a primary name)
    for (const alias of cursor.aliases) {
      if (!usedNames.has(alias)) {
        usedNames.add(alias)
        tar.addSymlink(`${themeName}/cursors/${alias}`, cursorId)
      }
    }
  }

  const tarBytes = tar.getBytes()

  // Compress
  const compressed = await new Promise((resolve, reject) => {
    gzip(tarBytes, { level: 6 }, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })

  _download(`${themeName}.tar.gz`, compressed, 'application/gzip')
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
