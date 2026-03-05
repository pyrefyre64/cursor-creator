/**
 * Export the current project as a Windows cursor zip.
 *
 * Each assigned cursor slot becomes one .ani file named after its
 * Windows-conventional label (e.g. "Normal Select.ani").
 * An install.inf is included so the zip can be right-click → Install on Windows.
 */

import { zipSync } from 'fflate'
import { buildAni } from '../writers/aniWriter.js'
import { processFromSources } from '../imageProcessor.js'
import { project, getSourcesForCursor } from '../../store/project.js'
import { CURSORS } from '../../data/cursorDatabase.js'

// Fixed order required by HKCU\Control Panel\Cursors registry values.
const WIN_ROLE_ORDER = [
  'Arrow', 'Help', 'AppStarting', 'Wait', 'Crosshair', 'IBeam',
  'NWPen', 'No', 'SizeNS', 'SizeWE', 'SizeNWSE', 'SizeNESW',
  'SizeAll', 'UpArrow', 'Hand',
]

function _filename(cursor) {
  // Windows cursors use the human-readable label; others fall back to id.
  return cursor.winRole ? `${cursor.label}.ani` : `${cursor.id}.ani`
}

/**
 * Build an install.inf for right-click → Install on Windows.
 * @param {string} themeName  raw theme name (may contain spaces)
 * @param {Record<string,string>} filesByCursorId  cursorId → filename in zip
 */
function _buildInf(themeName, filesByCursorId) {
  const cursorDir = `Cursors\\${themeName}`

  // Map winRole → filename for assigned Windows cursors.
  const roleToFile = {}
  for (const cursor of CURSORS) {
    if (cursor.winRole && filesByCursorId[cursor.id]) {
      roleToFile[cursor.winRole] = filesByCursorId[cursor.id]
    }
  }

  // 15-slot scheme value in registry order; empty string for unassigned.
  const schemeValue = WIN_ROLE_ORDER
    .map(role => roleToFile[role] ? `%10%\\${cursorDir}\\${roleToFile[role]}` : '')
    .join(',')

  const copyList = Object.values(filesByCursorId).map(f => `"${f}"`).join('\r\n')

  return [
    '[Version]',
    'signature="$CHICAGO$"',
    '',
    '[DefaultInstall]',
    'CopyFiles = Scheme.Cur',
    'AddReg    = Scheme.Reg',
    '',
    '[DestinationDirs]',
    `Scheme.Cur = 10,"${cursorDir}"`,
    '',
    '[Scheme.Reg]',
    `HKCU,"Control Panel\\Cursors\\Schemes","${themeName}",0x00010000,"${schemeValue}"`,
    '',
    '[Scheme.Cur]',
    copyList,
    '',
  ].join('\r\n')
}

export async function exportWindowsCursors() {
  const themeName = (project.meta.name || 'MyTheme').trim()
  const sizes = [...project.config.sizes].sort((a, b) => a - b)

  if (sizes.length === 0) throw new Error('No output sizes selected.')

  const assignedCursorIds = Object.keys(project.assignments)
    .filter(cursorId => getSourcesForCursor(cursorId).length > 0)
  if (assignedCursorIds.length === 0) throw new Error('No cursor images assigned.')

  const cursorById = Object.fromEntries(CURSORS.map(c => [c.id, c]))
  const zipFiles = {}
  const filesByCursorId = {}

  for (const cursorId of assignedCursorIds) {
    const cursor = cursorById[cursorId]
    if (!cursor) continue

    const filename = _filename(cursor)
    const flip = project.flips[cursorId] ?? { x: false, y: false }
    const sources = getSourcesForCursor(cursorId)

    const frames = []
    for (const size of sizes) {
      try {
        const scalePref = project.scalePrefs[cursorId]?.[String(size)] ?? null
        frames.push(await processFromSources(sources, size, flip, scalePref))
      } catch (err) {
        console.warn(`Skipping size ${size} for ${cursorId} (windows):`, err)
      }
    }

    if (!frames.length) continue
    zipFiles[filename] = await buildAni(frames)
    filesByCursorId[cursorId] = filename
  }

  if (!Object.keys(zipFiles).length) throw new Error('No cursors could be processed.')

  zipFiles['install.inf'] = new TextEncoder().encode(_buildInf(themeName, filesByCursorId))

  const safeThemeName = themeName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')
  _download(`${safeThemeName}_windows.zip`, zipSync(zipFiles), 'application/zip')
}

function _download(filename, data, mimeType) {
  const blob = new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
