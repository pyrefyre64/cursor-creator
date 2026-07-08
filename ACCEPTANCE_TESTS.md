# Acceptance Tests

Manual QA checklist. Each item should be verified by hand in a browser running the dev server (`npm run dev`) or the built `dist/index.html`. Check off items as they pass.

---

## 1. App Launch

- [ ] Page loads without console errors
- [ ] Three-panel layout is visible: Image Pool (left), Assignment Grid (centre), Cursor Editor (right)
- [ ] Project Bar is visible at the top with "KDE Cursor Maker" heading
- [ ] Theme name field shows placeholder "MyTheme"
- [ ] Size toggles 24 / 32 / 48 are active by default; 64 and 96 are inactive
- [ ] Cursor Editor right panel shows "Select a cursor slot to edit it"
- [ ] Assignment Grid centre panel shows all 14 category headings
- [ ] Assignment count reads "0 / 37 assigned"

---

## 2. Image Pool — Import

### 2a. Standard images via button
- [ ] Clicking **Import** opens a file picker
- [ ] Selecting a PNG file adds it to the Image Pool
- [ ] The thumbnail renders correctly in the pool
- [ ] The filename and dimensions (e.g. `32×32`) are shown below the thumbnail

### 2b. Standard images via drag-and-drop
- [ ] Dragging a PNG/JPEG/WebP file from the file manager and dropping onto the Image Pool adds it
- [ ] Multiple files dropped at once all appear in the pool

### 2c. Windows `.cur` files
- [ ] A `.cur` file can be selected via the Import button
- [ ] It appears in the pool with a PNG thumbnail extracted from the cursor
- [ ] The filename is preserved (e.g. `Arrow.cur`)
- [ ] Dimensions reflect the cursor's actual pixel size (e.g. `32×32`)

### 2d. Windows `.ani` files
- [ ] A `.ani` file can be selected via the Import button
- [ ] The first (largest) frame is extracted and shown as a thumbnail
- [ ] The filename is preserved

### 2e. Auto-detection on import
- [ ] Importing a file named `left_ptr.png` automatically assigns it to the **Normal Select** slot
- [ ] Importing a file named `arrow.png` automatically assigns it to **Normal Select** (if not already taken)
- [ ] Importing `IBeam.cur` automatically assigns it to **Text Select**
- [ ] Importing `hand2.png` automatically assigns it to **Link Select**
- [ ] A file with an unrecognised name (e.g. `my_cursor.png`) is added to the pool but not auto-assigned
- [ ] Auto-detection does not overwrite an already-assigned slot

### 2f. Unsupported files
- [ ] Dropping a `.txt` or `.mp3` file onto the pool does nothing (no error crash; optionally a toast)

### 2g. Remove image
- [ ] Clicking ✕ on a pool thumbnail removes it from the pool
- [ ] If that image was assigned, the assignment is cleared (slot returns to unassigned state)

---

## 3. Assignment Grid

- [ ] All 14 category headings are visible (Pointer, Link & Selection, Status, Help, Precision, Text, Handwriting, Unavailable, Resize, Move & Scroll, Drag & Drop, Zoom, Grab, Miscellaneous)
- [ ] All 37 cursor slots are visible, each showing its human label and `id` in monospace
- [ ] Unassigned slots show a dashed placeholder square

### 3a. Drag-and-drop assignment
- [ ] Dragging an image from the pool and dropping it onto a cursor slot assigns it
- [ ] The slot thumbnail updates immediately
- [ ] The slot's `id` text turns blue to indicate it is assigned
- [ ] The assignment count in the header increments

### 3b. Slot selection
- [ ] Clicking an unassigned slot highlights it with a blue border and opens the Cursor Editor showing the "No image assigned" state
- [ ] Clicking an assigned slot highlights it and opens the full Cursor Editor for that image
- [ ] Only one slot can be selected at a time

### 3c. Clear assignment
- [ ] The ✕ button on an assigned slot removes the assignment
- [ ] The slot returns to the dashed placeholder state
- [ ] The assignment count decrements

---

## 4. Cursor Editor

### 4a. States
- [ ] No slot selected → "Select a cursor slot to edit it"
- [ ] Slot selected, not assigned → cursor label + id shown, "No image assigned" message
- [ ] Slot selected, assigned → full editor shown (hotspot canvas + output sizes + aliases)

### 4b. Header
- [ ] The cursor's human-readable label is shown in larger text
- [ ] The cursor's primary id (e.g. `left_ptr`) is shown in a blue monospace chip

### 4c. Hotspot canvas
- [ ] The master image is displayed at a magnified zoom (up to 8×) with a checkerboard background indicating transparency
- [ ] A red crosshair is drawn at the current hotspot position
- [ ] Clicking anywhere on the canvas moves the hotspot to that pixel
- [ ] The X and Y coordinate display below the canvas updates immediately after clicking
- [ ] Hotspot coordinates cannot exceed the image dimensions (clamped to bounds)
- [ ] `.cur` / `.ani` imports show the embedded hotspot pre-set on the canvas

### 4d. Output sizes — source labels
- [ ] A size row whose output px matches the master's exact dimensions shows **"native"** in green
- [ ] A size row that will require scaling shows **"scaled from W×H"** in grey, where W×H are the master dimensions
- [ ] A size row with an override loaded shows **"override"** in amber

### 4e. Output sizes — thumbnails
- [ ] Each size row shows a thumbnail of the image (master or override) rendered at the stated output size
- [ ] The thumbnail background is a checkerboard (transparency indicator)

### 4f. Per-size overrides
- [ ] Clicking **Upload Xpx** (or **Override** for native sizes) opens a file picker
- [ ] Selecting an image file sets it as the override for that size
- [ ] The size row's label immediately changes to "override" (amber)
- [ ] The thumbnail updates to show the override image
- [ ] X/Y hotspot number inputs appear for the override
- [ ] Changing X/Y inputs updates the hotspot for that size only
- [ ] Clicking **Remove** deletes the override; the row reverts to master/scaled state
- [ ] A toast notification appears briefly after uploading an override

### 4g. Aliases section
- [ ] The aliases list is shown at the bottom of the editor for cursors that have them
- [ ] Aliases are displayed as monospace tags

---

## 5. Project Bar

### 5a. Theme name
- [ ] Typing in the theme name field updates `project.meta.name` (visible immediately on the page title area)
- [ ] Blank name falls back to "MyTheme" during export

### 5b. Output size toggles
- [ ] Clicking an active size button deactivates it (no longer highlighted blue)
- [ ] Clicking an inactive size button activates it
- [ ] Cannot deactivate the last remaining size (at least one must stay active)
- [ ] Active sizes are reflected in the Cursor Editor's output size rows

### 5c. Save Project
- [ ] Clicking **Save Project** triggers a `.json` download named after the theme
- [ ] The downloaded JSON contains: `version`, `meta`, `images` (with base64 data), `assignments`, `config`
- [ ] Image data URLs are embedded (file is self-contained)

### 5d. Load Project
- [ ] Clicking **Load Project** opens a `.json` file picker
- [ ] Loading a previously saved project restores all images, assignments, hotspots, size overrides, theme name, and selected sizes
- [ ] A "Project loaded" toast appears
- [ ] Loading a malformed/non-JSON file shows an error toast and does not crash

### 5e. Export
- [ ] Clicking **Export .tar.gz** with no cursors assigned shows an error toast ("No cursor images assigned")
- [ ] Clicking **Export .tar.gz** with no sizes selected shows an error toast
- [ ] With at least one assignment, a `.tar.gz` download is triggered
- [ ] The button label changes to "Exporting…" during the operation and reverts when done

---

## 6. Exported Archive Contents

Extract the downloaded `.tar.gz` and verify its contents (`tar -tzf ThemeName.tar.gz`).

- [ ] Top-level directory is named after the theme (spaces replaced with underscores)
- [ ] `ThemeName/index.theme` exists and contains:
  ```ini
  [Icon Theme]
  Name=ThemeName
  Comment=
  ```
- [ ] `ThemeName/cursors/` directory exists
- [ ] Each assigned cursor role has a corresponding binary file (e.g. `ThemeName/cursors/left_ptr`)
- [ ] Alias names appear as symlinks pointing to the primary file (e.g. `default -> left_ptr`, `arrow -> left_ptr`)
- [ ] No duplicate symlink names (aliases that share a name with a primary cursor are skipped)

### 6a. Xcursor file validity
Use `xcursorgen` or `identify` / the `file` command to inspect a cursor binary.

- [ ] `file ThemeName/cursors/left_ptr` reports it as an Xcursor file
- [ ] Opening the file in a hex editor shows the magic bytes `58 63 75 72` at offset 0
- [ ] Number of TOC entries matches the number of active output sizes
- [ ] For a 32×32 master exported at 32px, the xcursor image chunk has width=32, height=32

### 6b. KDE installation
- [ ] The `.tar.gz` can be installed via *KDE Plasma Settings → Cursors → Install from file…* without errors
- [ ] The installed theme appears in the cursor list with the correct name
- [ ] Selecting the theme applies the cursors in the desktop environment

---

## 7. Hotspot Scaling

- [ ] Set hotspot at (8, 8) on a 32×32 master. Export at 24px → xcursor hotspot is (6, 6)
- [ ] Set hotspot at (0, 0) on any master → hotspot is (0, 0) at all sizes
- [ ] Set hotspot at (width-1, height-1) → hotspot is clamped within bounds at all sizes
- [ ] A size override with no explicit hotspot inherits the scaled master hotspot
- [ ] A size override with an explicit hotspot (X/Y inputs) uses that value independently

---

## 8. Edge Cases

- [ ] Importing the same filename twice adds two separate pool entries (no silent overwrite)
- [ ] Assigning the same image to two different cursor slots is allowed
- [ ] Exporting a theme where one cursor has all sizes skipped (e.g. all override images fail to load) does not crash — that cursor is simply omitted
- [ ] Theme name containing spaces exports as `Theme_Name.tar.gz` (spaces → underscores)
- [ ] A `.ani` file whose frames are raw DIBs (AF_ICON not set) still imports without crashing (hotspot defaults to centre)
- [ ] A `.cur` file with multiple image sizes in the directory imports the largest one
- [ ] A `.cur` file containing a PNG-format image (modern Vista+ cursor) imports correctly with alpha transparency
- [ ] A 32bpp `.cur` with all-zero alpha channel (old XP style) falls back to AND-mask transparency

---

## 9. Build Artefact

- [ ] `npm run build` completes without errors
- [ ] `dist/index.html` is a single self-contained file (no external script/link tags referencing local paths)
- [ ] Opening `dist/index.html` directly from the filesystem (no server) works fully in Chromium and Firefox
