# KDE Cursor Maker

A pure client-side web app for building KDE/X11 cursor themes from your own images. No account, no server, no uploads — everything runs in the browser.

**Output:** a `.tar.gz` archive installable directly via *KDE Plasma Settings → Cursors → Install from file…*

---

## Features

- Import standard images (PNG, JPEG, WebP, GIF, …) or Windows cursor files (`.cur`, `.ani`)
- Automatic cursor role detection from filenames (e.g. `left_ptr.png`, `IBeam.cur`)
- Visual hotspot editor — click on a magnified pixel canvas to place the hotspot
- Per-size image overrides — supply a hand-crafted image for any specific output size
- Proportional hotspot scaling across all output sizes
- 37 cursor roles across 14 categories, covering the full Windows → X11 mapping and common KDE/GTK extras
- All aliases written as symlinks in the theme (e.g. `default → left_ptr`)
- Save/load project as a self-contained `.json` file (images embedded as base64)
- Export as a single self-contained `index.html` (no CDN dependencies at runtime)

---

## Using the App

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  Project Bar  (theme name · sizes · save / load / export) │
├─────────────┬──────────────────────────┬─────────────────┤
│ Image Pool  │   Assignment Grid        │  Cursor Editor  │
│ (left)      │   (centre)               │  (right)        │
└─────────────┴──────────────────────────┴─────────────────┘
```

### Step-by-step workflow

1. **Set your theme name** in the Project Bar (top-left). This becomes the directory name inside the archive, so avoid spaces if possible.

2. **Import images** — click **Import** in the Image Pool (left panel) or drag files directly onto it. Accepted formats: any browser-readable image, plus `.cur` and `.ani` Windows cursor files.
   - Files with recognisable names (e.g. `hand2.png`, `arrow.cur`) are assigned to the matching cursor role automatically.

3. **Assign images to cursor roles** — drag a thumbnail from the Image Pool and drop it onto a slot in the Assignment Grid (centre), or click a slot first to select it and then drag onto it.

4. **Set the hotspot** — click any assigned slot to open the Cursor Editor (right). Click anywhere on the zoomed pixel canvas to place the hotspot. The red crosshair shows the current position. Coordinates are stored in master-image pixels and scaled proportionally to every output size.

5. **Choose output sizes** — toggle the size buttons in the Project Bar (24 / 32 / 48 / 64 / 96 px). All selected sizes are written into each `.cursor` file.

6. **Per-size overrides (optional)** — in the Cursor Editor's *Output Sizes* section, click **Upload Xpx** (or **Override** for sizes that match the master exactly) to supply a hand-crafted image for that size. Overrides can have their own independent hotspot via the X/Y inputs that appear.
   - The size row shows:
     - **native** (green) — master dimensions exactly match this size, no scaling
     - **scaled from W×H** — will be resized from the master
     - **override** (amber) — a custom image is loaded for this size

7. **Save your work** — click **Save Project** to download a `.json` file. Reload it later with **Load Project**.

8. **Export** — click **Export .tar.gz**. Install the downloaded archive in KDE Plasma via *System Settings → Cursors → Install from file…*

---

## Building & Developing

### Requirements

- **Node.js ≥ 18** (tested on v22). npm 9+ recommended (comes with Node 18+).

### Quick start

```bash
git clone <repo-url>
cd kde_cursor_maker
npm install
npm run dev        # dev server at http://localhost:5173
```

### Build

```bash
npm run build      # outputs dist/index.html (single self-contained file)
npm run preview    # serve the built file locally
```

The build produces a **single `dist/index.html`** with all JS and CSS inlined (via `vite-plugin-singlefile`). This file can be opened directly in a browser — no web server needed.

### Dependencies

| Package | Purpose |
|---|---|
| `vue` | Reactive UI framework |
| `fflate` | Pure-JS gzip compression for the `.tar.gz` export |
| `vite` + `@vitejs/plugin-vue` | Build toolchain |
| `vite-plugin-singlefile` | Inline all assets into one HTML file |

---

## Project Structure

```
src/
├── main.js                  # Entry point — registers format handlers, mounts app
├── global.css               # Base styles (Breeze Dark colour scheme)
├── App.vue                  # Root component: three-panel layout + toast
│
├── data/
│   └── cursorDatabase.js    # All cursor roles, categories, aliases, auto-detect patterns
│
├── store/
│   └── project.js           # Global reactive state (project data + UI state)
│                            # importFile(), saveProject(), loadProject(), showToast(), …
│
├── lib/
│   ├── formatRegistry.js    # Format handler plugin registry
│   ├── formats/
│   │   ├── imageFormat.js   # Handler: standard browser images (image/*)
│   │   └── cursorFormat.js  # Handler: .cur / .ani (delegates to cursorFileParser)
│   ├── cursorFileParser.js  # Windows cursor/animated cursor binary parser
│   ├── xcursor.js           # Xcursor binary format writer
│   ├── tarWriter.js         # POSIX ustar tar writer (files, dirs, symlinks)
│   ├── imageProcessor.js    # Canvas-based resize + hotspot scaling
│   └── themeExporter.js     # Export pipeline: images → xcursor → tar → gzip → download
│
└── components/
    ├── ProjectBar.vue        # Top bar: theme name, size toggles, save/load/export
    ├── ImagePool.vue         # Left panel: imported images, drag source
    ├── AssignmentGrid.vue    # Centre panel: all cursor slots grouped by category
    ├── CursorSlot.vue        # Single cursor role row (drop target, thumbnail, clear)
    ├── CursorEditor.vue      # Right panel: hotspot editor + per-size overrides
    └── HotspotCanvas.vue     # Zoomed pixel canvas with clickable crosshair
```

### Where to look when extending

**Adding a new importable file format** (e.g. `.xcursor`, Photoshop `.psd`):

1. Write a handler in `src/lib/formats/yourFormat.js`:
   ```js
   export const yourFormatHandler = {
     name: 'Your Format',
     extensions: ['xyz'],
     async parse(file) {
       // return { dataUrl, hotspot: {x,y}|null, width, height }
     },
   }
   ```
2. Register it in `src/main.js`:
   ```js
   import { yourFormatHandler } from './lib/formats/yourFormat.js'
   registerFormatHandler(yourFormatHandler)
   ```
   The file input `accept` string and drop-zone filter update automatically.

**Adding or editing cursor roles** — edit `src/data/cursorDatabase.js`. Each entry has `id`, `label`, `category`, `aliases` (written as symlinks), and `detect` (regex array for auto-assignment from filenames). Add new categories to the `CATEGORIES` array at the top.

**Changing the export format** — `src/lib/themeExporter.js` orchestrates the full pipeline. `src/lib/xcursor.js` owns the binary Xcursor format; `src/lib/tarWriter.js` owns the tar structure.

**Changing the hotspot canvas behaviour** — `src/components/HotspotCanvas.vue` is self-contained. It receives `dataUrl`, `hotspot`, and `dims` as props and emits `hotspot-change`.

**Project file schema** — defined implicitly by `src/store/project.js`. The `version` field at the top level is intended for future migration logic in `loadProject()`.
