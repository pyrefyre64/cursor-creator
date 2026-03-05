> ⚠️ **Warning: AI slop ahead.**
> Because you deserve to know.

---

# Cursor Creator

A pure client-side web app for building KDE/X11 and Windows cursor themes from your own images. No account, no server, no uploads — everything runs in the browser.

**Output formats:**
- **KDE/X11** — `.tar.gz` archive installable directly via *KDE Plasma Settings → Cursors → Install from file…*
- **Windows** — `.zip` containing `.cur`/`.ani` files + `install.inf`
- **PNG zip** — raw PNGs at all configured sizes (static: one per size; animated: numbered frames)
- **CSS** — stylesheet with base64-embedded cursor data URLs and hotspot coordinates

---

## Features

- Import standard images (PNG, JPEG, WebP, BMP, SVG) or cursor files (`.cur`, `.ani`, Xcursor)
- Import archives (`.zip`, `.tar.gz`, `.tgz`, `.tar`) — contents are processed through the normal import pipeline
- Full animated cursor support — `.ani` files with `seq` and `rate` chunks (including ping-pong sequences) import and export with correct per-frame delays
- Automatic cursor role detection from filenames (e.g. `left_ptr.png`, `IBeam.cur`)
- Multiple native-size sources per cursor — supply a hand-crafted image for any specific output size; all sizes export natively without unnecessary upscaling
- Nearest-neighbour scaling with per-size direction preference (upscale vs downscale) when both options are integer multiples — side-by-side comparison dialog to choose
- Visual hotspot editor — click on a magnified pixel canvas to place the hotspot; coordinates scale proportionally across all output sizes
- Simple / Full mode toggle — 15 common Windows roles or the full set of 37 X11/KDE roles
- All aliases written as symlinks in the KDE theme (e.g. `default → left_ptr`)
- Save/load project as a self-contained `.json` file (images embedded as base64)
- Exports a single self-contained `index.html` with no CDN dependencies

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

1. **Set your theme name** in the Project Bar. This becomes the directory name inside the archive.

2. **Import images** — click **Import** in the Image Pool or drag files/archives directly onto it. Accepted: any browser-readable image, `.cur`, `.ani`, Xcursor files, and `.zip`/`.tar.gz`/`.tar` archives.
   - Files with recognisable names (e.g. `hand2.png`, `arrow.cur`) are assigned to the matching cursor role automatically.

3. **Assign images to cursor roles** — drag a thumbnail from the Image Pool and drop it onto a slot in the Assignment Grid. Images are routed automatically: a new size becomes an additional native source for that role; the same size triggers a conflict dialog so you can keep or replace the existing one.

4. **Set the hotspot** — click any assigned slot to open the Cursor Editor. Click anywhere on the zoomed pixel canvas to place the hotspot.

5. **Choose output sizes** — toggle the size buttons in the Project Bar (24 / 32 / 48 / 64 / 96 px).

6. **Per-size sources (optional)** — drag additional images from the pool onto the Cursor Editor's sources list, or use **+ Add** to open a file picker linked directly to the selected role. The export preview shows which source and method (native / scaled-up / scaled-down / bilinear) will be used for each output size. Use the ⇅ button when both NN upscale and downscale candidates exist to compare them side-by-side.

7. **Save your work** — click **Save Project** to download a `.json` file. Reload it later with **Load Project**.

8. **Export** — choose an export format from the Project Bar.

---

## Building & Developing

### Requirements

- **Node.js ≥ 18** (tested on v22). npm 9+ recommended.

### Quick start

```bash
git clone <repo-url>
cd cursor_creator
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
| `fflate` | Pure-JS gzip + zip (de)compression |
| `vite` + `@vitejs/plugin-vue` | Build toolchain |
| `vite-plugin-singlefile` | Inline all assets into one HTML file |

---

## Project Structure

```
src/
├── main.js                      # Entry point — registers format handlers, mounts app
├── global.css                   # Base styles (Breeze Dark colour scheme)
├── App.vue                      # Root component: three-panel layout + toast
│
├── data/
│   └── cursorDatabase.js        # Cursor roles, categories, aliases, auto-detect patterns
│
├── store/
│   └── project.js               # Global reactive state; importFile(), saveProject(), …
│
├── lib/
│   ├── formatRegistry.js        # Format handler plugin registry
│   ├── imageProcessor.js        # Canvas-based resize, hotspot scaling, pixelsToPng
│   │
│   ├── formats/                 # Thin registry adapters (identification + parse entry point)
│   │   ├── imageFormat.js       # Standard browser images (image/*)
│   │   ├── windowsCursorFormat.js  # .cur / .ani
│   │   └── xcursorFormat.js     # Xcursor (magic-detected)
│   │
│   ├── parsers/                 # Pure binary decoders (no store access, no side effects)
│   │   ├── windowsCursorParser.js  # Windows CUR/ANI parser (seq, rate, ping-pong)
│   │   ├── xcursorParser.js     # Xcursor binary parser
│   │   └── tarReader.js         # POSIX ustar TAR reader
│   │
│   ├── importers/
│   │   └── archiveImporter.js   # zip/tar.gz/tar → importFiles() pipeline
│   │
│   ├── writers/                 # Format serialisers (bytes in, bytes out)
│   │   ├── xcursorWriter.js     # Xcursor binary format
│   │   ├── tarWriter.js         # POSIX ustar tar (files, dirs, symlinks)
│   │   ├── aniWriter.js         # Windows ANI (animated cursor)
│   │   ├── curWriter.js         # Windows CUR (static cursor)
│   │   └── apngWriter.js        # Animated PNG
│   │
│   └── exporters/               # Export pipelines (project state → download)
│       ├── themeExporter.js     # KDE/X11 tar.gz
│       ├── windowsExporter.js   # Windows zip (.cur/.ani + install.inf)
│       ├── pngExporter.js       # PNG zip
│       ├── apngExporter.js      # APNG zip
│       ├── cssExporter.js       # CSS stylesheet
│       └── exportUtils.js       # Shared download() helper
│
└── components/
    ├── ProjectBar.vue           # Top bar: theme name, size toggles, save/load/export
    ├── ImagePool.vue            # Left panel: imported images, drag source
    ├── AssignmentGrid.vue       # Centre panel: cursor slots grouped by category
    ├── CursorSlot.vue           # Single cursor role slot (drop target, size pills)
    ├── CursorEditor.vue         # Right panel: hotspot editor + sources + preview
    ├── HotspotCanvas.vue        # Zoomed pixel canvas with clickable crosshair
    ├── AnimatedThumb.vue        # Animated preview thumbnail for multi-frame images
    ├── ConflictDialog.vue       # Same-size import conflict resolution
    ├── ScaleCompareDialog.vue   # Side-by-side NN scale direction chooser
    └── TwoImageChoice.vue       # Generic reusable side-by-side comparison
```
