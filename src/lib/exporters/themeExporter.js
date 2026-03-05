import { gzip } from 'fflate'
import { buildXcursor } from '../writers/xcursor.js'
import { TarWriter } from '../writers/tarWriter.js'
import { processFromSources, processAnimFrame } from '../imageProcessor.js'
import { project, getSourcesForCursor } from '../../store/project.js'
import { getCursorById } from '../../data/cursorDatabase.js'

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

  const assignedEntries = Object.keys(project.assignments)
    .filter(cursorId => getSourcesForCursor(cursorId).length > 0)
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

  for (const cursorId of assignedEntries) {
    const cursor = getCursorById(cursorId)
    if (!cursor) continue

    usedNames.add(cursorId)

    const flip = project.flips[cursorId] ?? { x: false, y: false }
    const sources = getSourcesForCursor(cursorId)
    const primaryImg = project.images[project.assignments[cursorId]]
    const isAnimated = primaryImg?.frames?.length > 1

    let xcurChunks
    if (isAnimated) {
      // Animated: for each nominal size, emit one chunk per animation frame
      // (libXcursor cycles through equal-subtype chunks at each size)
      xcurChunks = []
      for (const size of sizes) {
        for (const frame of primaryImg.frames) {
          try {
            xcurChunks.push(await processAnimFrame(frame, primaryImg.dims, size, flip))
          } catch (err) {
            console.warn(`Skipping anim frame for size ${size}, cursor ${cursorId}:`, err)
          }
        }
      }
    } else {
      // Static: one chunk per output size
      xcurChunks = []
      for (const size of sizes) {
        try {
          const scalePref = project.scalePrefs[cursorId]?.[String(size)] ?? null
          xcurChunks.push(await processFromSources(sources, size, flip, scalePref))
        } catch (err) {
          console.warn(`Skipping size ${size} for ${cursorId}:`, err)
        }
      }
    }

    if (!xcurChunks.length) continue

    const xcurData = buildXcursor(xcurChunks)
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
