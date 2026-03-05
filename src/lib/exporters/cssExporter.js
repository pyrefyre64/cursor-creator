/**
 * Export the current project as a CSS cursor stylesheet.
 * Emits one declaration per assigned cursor role with a base64-embedded PNG
 * data URL and the correct hotspot coordinates.
 * Targets the largest configured size ≤ 32px (CSS cursors rarely need more).
 */

import { processImage, processOverride } from '../imageProcessor.js'
import { project } from '../../store/project.js'
import { CURSORS } from '../../data/cursorDatabase.js'

// Best-effort CSS cursor keyword fallbacks for each cursor role.
const CSS_FALLBACK = {
  left_ptr:        'default',
  right_ptr:       'default',
  hand2:           'pointer',
  watch:           'wait',
  left_ptr_watch:  'progress',
  progress:        'progress',
  help:            'help',
  crosshair:       'crosshair',
  xterm:           'text',
  'vertical-text': 'vertical-text',
  pencil:          'default',
  'not-allowed':   'not-allowed',
  'no-drop':       'no-drop',
  fleur:           'move',
  sb_up_arrow:     'default',
  grab:            'grab',
  grabbing:        'grabbing',
  'zoom-in':       'zoom-in',
  'zoom-out':      'zoom-out',
  cell:            'cell',
  'context-menu':  'context-menu',
  copy:            'copy',
  alias:           'alias',
  'dnd-move':      'move',
  'dnd-none':      'no-drop',
  'col-resize':    'col-resize',
  'row-resize':    'row-resize',
}

async function _pixelsToDataUrl(pixels, width, height) {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.putImageData(new ImageData(pixels, width, height), 0, 0)
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

function _slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function exportCssStylesheet() {
  const themeName = (project.meta.name || 'MyTheme').trim()
  const safeThemeName = themeName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')
  const sizes = [...project.config.sizes].sort((a, b) => a - b)

  if (sizes.length === 0) throw new Error('No output sizes selected.')

  // Prefer the largest size that is ≤ 32px; fall back to the smallest available.
  const cssSize = [...sizes].reverse().find(s => s <= 32) ?? sizes[0]

  const assignedEntries = Object.entries(project.assignments)
    .filter(([, id]) => id && project.images[id])
  if (assignedEntries.length === 0) throw new Error('No cursor images assigned.')

  const cursorById = Object.fromEntries(CURSORS.map(c => [c.id, c]))

  const lines = [
    `/* Cursor Creator — ${themeName}`,
    ` * CSS cursor stylesheet (${cssSize}px, PNG data embedded)`,
    ` * Adapt selectors as needed; declarations can also be used inline. */`,
    '',
  ]

  for (const [cursorId, imageId] of assignedEntries) {
    const imageEntry = project.images[imageId]
    const cursor = cursorById[cursorId]
    if (!imageEntry || !cursor) continue

    const flip = project.flips[cursorId] ?? { x: false, y: false }
    const override = imageEntry.sizeOverrides?.[String(cssSize)]

    let frame
    try {
      frame = override?.data
        ? await processOverride(override.data, cssSize, override.hotspot ?? null,
            imageEntry.hotspot ?? { x: 0, y: 0 },
            imageEntry.dims   ?? { width: cssSize, height: cssSize }, flip)
        : await processImage(imageEntry.data, cssSize,
            imageEntry.hotspot ?? { x: 0, y: 0 },
            imageEntry.dims   ?? { width: cssSize, height: cssSize }, flip)
    } catch (err) {
      console.warn(`Skipping ${cursorId} (css):`, err)
      continue
    }

    const dataUrl  = await _pixelsToDataUrl(frame.pixels, cssSize, cssSize)
    const fallback = CSS_FALLBACK[cursorId] ?? cursorId
    const cls      = _slug(cursor.label)

    lines.push(`/* ${cursor.label} */`)
    lines.push(`.cursor-${cls} { cursor: url("${dataUrl}") ${frame.hotspotX} ${frame.hotspotY}, ${fallback}; }`)
    lines.push('')
  }

  const bytes = new TextEncoder().encode(lines.join('\n'))
  _download(`${safeThemeName}.css`, bytes, 'text/css')
}

function _download(filename, data, mimeType) {
  const blob = new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
