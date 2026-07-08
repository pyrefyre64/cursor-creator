# KDE Cursor Maker — Developer Reference

## What This Is
A pure client-side web app (no backend) for building cursor themes from existing images.
Exports: KDE/X11 `.tar.gz`, Windows `.zip` (`.ani` + `install.inf`), raw PNG zip, CSS snippet.

## Stack
- **Vite + Vue 3** (`<script setup>` everywhere), vanilla JS modules
- **Build output**: single self-contained `index.html` via `vite-plugin-singlefile`
- **Image processing**: Browser Canvas API / OffscreenCanvas only
- **Xcursor writer**: pure JS (`src/lib/writers/xcursorWriter.js`)
- **Tar writer**: pure JS POSIX ustar format with symlink entries (`src/lib/writers/tarWriter.js`)
- **ANI/CUR writer**: pure JS (`src/lib/writers/aniWriter.js`)
- **APNG writer**: pure JS (`src/lib/writers/apngWriter.js`)
- **Compression**: `fflate`
- **Animation**: full round-trip support for Windows `.ani` (import + export) and Xcursor animated sequences

---

## Data Model (schema v2.0)

### `project.images`  `Record<imageId, ImageEntry>`
```js
{ id, filename, data /* base64 dataUrl */, dims: {width, height}, hotspot: {x, y} }
```
No `sizeOverrides` — that concept was removed. All images are equal pool members.

### `project.assignments`  `Record<cursorId, imageId|null>`
The "primary" source for each cursor role. Drives the thumbnail shown in the assignment grid. Also the fallback source for the exporter when no sizeLink covers a given output size.

### `project.sizeLinks`  `Record<cursorId, Record<sizeStr, imageId>>`
Additional native-size sources, keyed by pixel width string (always square images). Example:
```js
project.sizeLinks["watch"] = { "24": "img_003", "48": "img_007" }
```

### `project.flips`  `Record<cursorId, {x:boolean, y:boolean}>`

### `project.scalePrefs`  `Record<cursorId, Record<sizeStr, 'up'|'down'>>`
Per-output-size NN scaling direction preference set by the user via ScaleCompareDialog.

### `project.config`  `{ sizes: number[] }`
Output sizes to export (e.g., `[24, 32, 48]`).

### `ui` (not persisted)
```js
{
  selectedCursorId: string|null,   // drives CursorEditor
  draggingImageId:  string|null,   // set during pool drag
  focusImageId:     string|null,   // triggers ImagePool scroll+highlight
  toast:            {message, type}|null,
  simpleMode:       boolean,       // true = only 15 Windows roles shown
  conflicts:        ConflictDescriptor[],
}
```

---

## Source Priority for Export (per output size S)
Implemented in `pickBestSource()` in `src/lib/imageProcessor.js`:
1. Exact native match (`dims.width === S`)
2. Integer-scalable source — nearest-neighbour; sorts by smallest ratio, ties broken by preferring upscale (smaller source) unless `scalePref === 'down'`
3. Nearest available size — bilinear

`getSourcesForCursor(cursorId)` returns `[primary, ...sizeLinks]` sorted by width ascending.

---

## Key Store Functions (`src/store/project.js`)

| Function | Purpose |
|---|---|
| `importFile(file)` | Import one file, auto-detect role from filename, return `{id, conflict?}` |
| `importFiles(files)` | Batch import, collects conflicts into `ui.conflicts` |
| `importFileForCursor(file, cursorId)` | Import and link directly to a role (bypasses detection) |
| `linkPoolImageToCursor(imageId, cursorId)` | Link existing pool image to a role (smart routing) |
| `resolveSizeConflict(conflict, 'keep'\|'replace')` | Resolve a pending same-size conflict |
| `getSourcesForCursor(cursorId)` | Returns all sources (primary + sizeLinks) sorted by size |
| `setAssignment(cursorId, imageId)` | Direct primary assignment (used by AssignmentGrid internally) |
| `removeAssignment(cursorId)` | Clear primary; does NOT touch sizeLinks |
| `removeImage(imageId)` | Remove from pool + assignments; promotes smallest sizeLink to primary if primary was deleted |
| `setSizeLink(cursorId, size, imageId)` | Explicitly set a sizeLink |
| `removeSizeLink(cursorId, size)` | Remove a sizeLink |
| `setScalePref(cursorId, size, pref)` | Set/clear NN scaling direction preference |
| `setHotspot(imageId, x, y)` | Update hotspot on an image entry |
| `saveProject()` / `loadProject(jsonText)` | Serialize/deserialize; throws if version !== '2.0' |

### Import routing logic (`_routeToRole`)
Private function called by importFile and linkPoolImageToCursor:
- No primary assigned → set as primary
- Non-square image with existing primary → lands in pool unlinked
- Square image, size matches primary → returns conflict descriptor (`inPrimary: true`)
- Square image, size matches existing sizeLink → returns conflict descriptor (`inPrimary: false`)
- Otherwise → adds as sizeLink

---

## Component Map

### `ImagePool.vue`
- Left panel. Shows images in two collapsible sections: **Assigned** / **Unassigned**
- Each image shows role-link badges (clickable → scrolls assignment grid to slot)
- Watches `ui.focusImageId` → opens section, scrolls, highlights the target image (1.4s)
- Drop zone for files from the OS (not from the pool itself)

### `AssignmentGrid.vue`
- Centre panel. Categories + cursor slots. Simple/Full mode toggle (15 Windows roles vs all X11 roles).

### `CursorSlot.vue`
- Individual slot in the grid. Shows thumbnail, label, cursor ID, and native size pills.
- **Size pills** are clickable buttons → set `ui.focusImageId` to scroll ImagePool to that file.
- **Drop (from pool)**: smart routing via `linkPoolImageToCursor` — adds as sizeLink if new size, conflict dialog if same size already exists, no-op if same imageId already linked.
- ✕ button calls `removeAssignment` (clears primary only, sizeLinks remain).

### `CursorEditor.vue`
- Right panel. Shows hotspot canvas + native sources list + export preview.
- **Native sources section**: drag target from pool (dashed blue outline on hover). Drop calls `linkPoolImageToCursor`.
- **Remove source**: removes sizeLink, or if primary, promotes smallest sizeLink to primary.
- **Export preview**: shows `from Xpx / method / hotspot` for each output size. ⇅ button opens ScaleCompareDialog when both upscale and downscale integer candidates exist.
- **+ Add button**: file picker → `importFileForCursor`.

### `ConflictDialog.vue`
- Modal overlay shown when `ui.conflicts.length > 0`. One `TwoImageChoice` per conflict (existing vs new). Batch "Keep all" / "Use all new" buttons.

### `ScaleCompareDialog.vue`
- Modal for choosing NN scaling direction. Async-renders both options via `processFromSources`. Choice stored in `project.scalePrefs`.

### `TwoImageChoice.vue`
- Generic reusable side-by-side image comparison component. Used by both ConflictDialog and ScaleCompareDialog.

### `HotspotCanvas.vue`
- Interactive canvas for editing hotspot position at zoomed-in view.

### `ProjectBar.vue`
- Top bar: theme name input, save/load project JSON, export buttons for all 4 formats.

---

## Image Processing (`src/lib/imageProcessor.js`)

Key exports:
- `pickBestSource(sources, targetSize, scalePref?)` — picks optimal source, returns `{source, method}`
- `hasScaleChoice(sources, targetSize)` — true when both upscale and downscale integer candidates exist
- `processFromSources(sources, targetSize, flip?, scalePref?)` — full pipeline: pick → load → resize → scale hotspot → return `{size, xhot, yhot, pixels}`
- `pixelsToObjectUrl(pixels, w, h)` — renders to a revocable blob URL (caller must revoke)
- `resizeToPixels(img, targetSize, flip, srcW, srcH)` — NN for integer scales (up and down), bilinear otherwise

---

## Format Registry (`src/lib/formatRegistry.js`)
Handlers registered for: PNG, JPEG, WEBP, BMP, CUR, ANI, XCURSOR (magic-detected). Each handler has `{ parse(file) → {dataUrl, width, height, hotspot?} }`.

---

## Export Pipeline
All 4 exporters follow the same pattern:
```js
for cursorId of assignedCursorIds:
  sources = getSourcesForCursor(cursorId)
  flip    = project.flips[cursorId] ?? {x:false,y:false}
  for size of sizes:
    scalePref = project.scalePrefs[cursorId]?.[String(size)] ?? null
    frame = await processFromSources(sources, size, flip, scalePref)
    // → build format-specific output
```

---

## Conflict Descriptor Shape
```js
{ cursorId: string, sizeStr: string, newId: string, existingId: string, inPrimary: boolean }
```
`inPrimary` = true means the conflict is with `project.assignments[cursorId]`; false means it's with a sizeLink entry.
