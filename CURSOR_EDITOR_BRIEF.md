# Cursor Pixel Editor — Project Brief

This document captures everything useful from **Cursor Creator** to inform the design and build of a companion cursor pixel art editor. The goal of the new site is to let users draw cursor images (static and animated) in a purpose-built tool, then export them in a format that Cursor Creator can ingest directly.

---

## What Cursor Creator already handles (do NOT duplicate)

- Multi-format export: KDE/X11 `.tar.gz`, Windows `.ani`/`.cur` + `.inf`, PNG zip, APNG zip, CSS
- Cursor role assignment (mapping images to X11/Windows role names)
- Size-link management (multiple native-size sources per role)
- Nearest-neighbour vs bilinear scaling decisions
- Hotspot scaling across output sizes
- Symlink aliases in the KDE theme archive
- Conflict resolution when two images share a role+size slot
- Save/load project as JSON

---

## Integration target: how to export so Cursor Creator imports cleanly

Cursor Creator accepts:
- Individual image files dragged onto the Image Pool or Assignment Grid
- A **flat `.zip`** archive (any directory structure is stripped to basename at import)

**Ideal export from the new editor:** a flat `.zip` containing PNGs named after cursor role IDs.

```
left_ptr.png          → auto-assigned to Normal Select
xterm.png             → auto-assigned to Text Select
watch.png             → auto-assigned to Busy
watch_0001.png        → frame 1 of animated Busy (name pattern: <role>_NNNN)
watch_0002.png
...
```

Cursor Creator's filename detection will auto-assign most of these on import. For animated cursors, import the numbered frames; they land in the pool and can be assigned as a sequence.

**Hotspot** cannot currently be embedded in PNG metadata and read back by Cursor Creator — the user sets it interactively after import. Document this in the editor's UI ("Hotspot is set in Cursor Creator after import").

---

## Cursor role database

All 37 roles. The new editor should offer these as named canvas presets.

| ID | Label | Category | Hotspot hint | CSS cursor | Win role | Key aliases |
|---|---|---|---|---|---|---|
| `left_ptr` | Normal Select | pointer | top-left | `default` | Arrow | default, arrow |
| `right_ptr` | Right Pointer | pointer | top-right | — | — | right_arrow |
| `hand2` | Link Select | link | finger-tip | `pointer` | Hand | pointer, hand, hand1 |
| `watch` | Busy | status | center | `wait` | Wait | wait, clock |
| `left_ptr_watch` | Working in Background | status | top-left | `progress` | AppStarting | — |
| `progress` | Progress | status | top-left | `progress` | — | half-busy |
| `help` | Help Select | help | top-left | `help` | Help | question_arrow |
| `crosshair` | Precision Select | precision | center | `crosshair` | Crosshair | cross, plus, tcross |
| `xterm` | Text Select | text | center | `text` | IBeam | text, ibeam |
| `vertical-text` | Vertical Text | text | center | `vertical-text` | — | vertical_text |
| `pencil` | Handwriting | handwriting | top-left | — | NWPen | — |
| `not-allowed` | Unavailable | unavailable | center | `not-allowed` | No | crossed_circle, forbidden |
| `no-drop` | No Drop | unavailable | center | `no-drop` | — | dnd-no-drop |
| `ew-resize` | Horizontal Resize | resize | center | `ew-resize` | SizeWE | sb_h_double_arrow, size_hor |
| `col-resize` | Column Resize | resize | center | `col-resize` | — | — |
| `ns-resize` | Vertical Resize | resize | center | `ns-resize` | SizeNS | sb_v_double_arrow, size_ver |
| `row-resize` | Row Resize | resize | center | `row-resize` | — | — |
| `nwse-resize` | Diagonal Resize ↖↘ | resize | center | `nwse-resize` | SizeNWSE | size_fdiag, bd_double_arrow |
| `nesw-resize` | Diagonal Resize ↗↙ | resize | center | `nesw-resize` | SizeNESW | size_bdiag, fd_double_arrow |
| `n-resize` | North Resize | resize | center | `n-resize` | — | top_side |
| `s-resize` | South Resize | resize | center | `s-resize` | — | bottom_side |
| `e-resize` | East Resize | resize | center | `e-resize` | — | right_side |
| `w-resize` | West Resize | resize | center | `w-resize` | — | left_side |
| `ne-resize` | Northeast Resize | resize | center | `ne-resize` | — | top_right_corner |
| `nw-resize` | Northwest Resize | resize | center | `nw-resize` | — | top_left_corner |
| `se-resize` | Southeast Resize | resize | center | `se-resize` | — | bottom_right_corner |
| `sw-resize` | Southwest Resize | resize | center | `sw-resize` | — | bottom_left_corner |
| `fleur` | Move | move | center | `move` | SizeAll | move, all-scroll, size_all |
| `sb_up_arrow` | Alternate Select | move | top-center | — | UpArrow | up_arrow, center_ptr |
| `copy` | Copy | dnd | top-left | `copy` | — | dnd-copy |
| `alias` | Link / Alias | dnd | top-left | `alias` | — | dnd-link |
| `dnd-move` | DnD Move | dnd | top-left | `move` | — | — |
| `dnd-none` | DnD None | dnd | top-left | `no-drop` | — | — |
| `zoom-in` | Zoom In | zoom | center | `zoom-in` | — | zoom_in |
| `zoom-out` | Zoom Out | zoom | center | `zoom-out` | — | zoom_out |
| `grab` | Grab | grab | center | `grab` | — | openhand |
| `grabbing` | Grabbing | grab | center | `grabbing` | — | closedhand |
| `cell` | Cell Selection | misc | center | `cell` | — | — |
| `context-menu` | Context Menu | misc | top-left | `context-menu` | — | context_menu |
| `X_cursor` | X Root Cursor | misc | center | — | — | x-cursor |

**15 Windows roles (Simple Mode set):** Arrow, Hand, Wait, AppStarting, Help, Crosshair, IBeam, No, SizeWE, SizeNS, SizeNWSE, SizeNESW, SizeAll, UpArrow, NWPen

---

## Image conventions

### Canvas sizes
Standard cursor sizes: **24, 32, 48, 64, 96** px (always square).
Recommended default canvas: **32×32**. Allow switching between sizes as separate frames/layers.

### Pixel format
- RGBA (straight alpha, not premultiplied)
- Transparent background is standard for cursors
- Export as PNG with full alpha

### Hotspot
- Single (x, y) coordinate, 0-indexed from top-left
- Per-image, not per-size (Cursor Creator scales it proportionally)
- Hint per role: `top-left` (≈ 1,1), `center` (≈ size/2, size/2), `finger-tip` (≈ 5,1 for 32px), `top-right`, `top-center`
- Store as custom PNG metadata chunk (`tEXt` chunk: `hotspot_x`, `hotspot_y`) — Cursor Creator doesn't read this yet but it's useful for round-trips within the editor itself

### Animation
- Each frame is a separate same-size canvas
- Frame delay in milliseconds (Cursor Creator uses jiffies: 1 jiffy = ~16.7 ms at 60fps; common values: 50ms, 100ms, 200ms)
- Export animated cursors as numbered PNGs: `watch_0001.png`, `watch_0002.png`, ...

---

## Suggested feature set (minimum viable)

### Drawing tools
- Pencil (1px, hard edge) — most important
- Eraser
- Flood fill
- Color picker / eyedropper
- Rectangular selection + move

### Canvas
- Zoomed view (8×–32× zoom) with pixel grid overlay
- Checkerboard background for transparency
- Crosshair cursor position indicator
- Canvas size switcher (24 / 32 / 48 / 64 / 96)

### Color
- Foreground + background color swatches
- RGBA color picker
- Small palette (8–16 swatches, saveable per session)
- Opacity slider per tool

### Hotspot
- Visual crosshair overlaid on canvas, draggable
- Snaps to pixel grid
- Shown as coordinate (x, y)

### Animation
- Frame strip at the bottom (add, remove, duplicate, reorder frames)
- Per-frame delay input (ms)
- Preview playback in canvas

### Undo/redo
- Linear history, minimum 50 steps
- Per-frame

### Role awareness
- Dropdown to tag the current drawing with a cursor role ID
- Sets the export filename automatically
- Shows the CSS cursor keyword and hotspot hint for the selected role
- Preview: renders a live demo area where the cursor changes to the exported image on hover (via `cursor: url(...)`)

### Export
- **Primary:** flat `.zip` of PNGs named by role ID — feeds directly into Cursor Creator
- **Secondary:** single PNG download of current canvas

---

## Stack (what worked well in Cursor Creator)

| Concern | Choice | Notes |
|---|---|---|
| Framework | Vite + Vue 3 (`<script setup>`) | Fast dev, easy reactivity |
| Build output | `vite-plugin-singlefile` | Single self-contained `index.html`, no CDN needed, hostable on GitHub Pages |
| Compression/zip | `fflate` | Pure JS, no WASM, works in browser with no backend |
| Image processing | Browser Canvas API / OffscreenCanvas | No dependencies, full RGBA pixel access |
| State | Vue `reactive()` | Sufficient for tool state, no need for Pinia/Vuex at this scale |

### Canvas API patterns
```js
// Draw to offscreen canvas, read pixels
const canvas = new OffscreenCanvas(size, size)
const ctx = canvas.getContext('2d')
// ... draw ...
const imageData = ctx.getImageData(0, 0, size, size)
// imageData.data is Uint8ClampedArray, RGBA stride

// Export canvas to PNG blob
const blob = await canvas.convertToBlob({ type: 'image/png' })
```

### Zip export with fflate
```js
import { zipSync, strToU8 } from 'fflate'

const files = {}
for (const [filename, uint8arr] of entries) {
  files[filename] = uint8arr
}
const zipped = zipSync(files)
const blob = new Blob([zipped], { type: 'application/zip' })
// trigger download via URL.createObjectURL(blob)
```

---

## Architecture notes from Cursor Creator

- **No backend, no uploads.** Everything is Canvas API + pure JS. This is the right call for a tool like this — instant load, works offline, no privacy concerns.
- **Single `index.html` output** via `vite-plugin-singlefile` makes GitHub Pages deployment trivial and means the file itself is distributable.
- **Reactive state separation:** keep drawing state (current tool, color, canvas pixels, frame list) separate from export/project state. In Vue, `reactive()` objects work well; avoid making pixel arrays reactive (too large) — store them as plain refs updated manually.
- **OffscreenCanvas for heavy work:** main canvas is a regular `<canvas>` the user sees; compositing and export processing use OffscreenCanvas off the main thread if needed.
- **Undo stack:** store `ImageData` snapshots (or diffs for memory efficiency). Capturing on every mouseup/pointerup rather than every stroke keeps the stack manageable.
- **Zoom implementation:** draw the logical canvas scaled up onto a display canvas. Track a `zoom` factor and a `pan` offset. Map pointer events back to logical pixel coordinates via `Math.floor((clientX - rect.left) / zoom)`.

---

## What to link to / mention in the editor UI

- Cursor Creator live site: `https://pyrefyre64.github.io/cursor-creator/`
- Explain the workflow: draw here → export zip → drop zip into Cursor Creator → assign roles → export theme
- Link to Cursor Creator's GitHub for reference
