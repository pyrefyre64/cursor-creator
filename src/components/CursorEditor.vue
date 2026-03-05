<script setup>
import { computed, ref } from 'vue'
import { project, ui, setHotspot, setSizeLink, removeSizeLink, getSourcesForCursor, importFileForCursor, linkPoolImageToCursor, showToast } from '../store/project.js'
import { getCursorById } from '../data/cursorDatabase.js'
import { pickBestSource, hasScaleChoice } from '../lib/imageProcessor.js'
import HotspotCanvas from './HotspotCanvas.vue'
import ScaleCompareDialog from './ScaleCompareDialog.vue'
import AnimatedThumb from './AnimatedThumb.vue'

const cursor = computed(() => ui.selectedCursorId ? getCursorById(ui.selectedCursorId) : null)

const sizes = computed(() => [...project.config.sizes].sort((a, b) => a - b))

// All native sources for the selected cursor (primary + sizeLinks), sorted by size ascending
const allSources = computed(() => {
  if (!cursor.value) return []
  return getSourcesForCursor(cursor.value.id)
})

// Which source the hotspot canvas is currently editing (defaults to first/primary)
const activeSourceId = ref(null)
const activeSource = computed(() => {
  const sources = allSources.value
  if (!sources.length) return null
  return sources.find(s => s.imageId === activeSourceId.value) ?? sources[0]
})

function selectSource(src) {
  activeSourceId.value = src.imageId
}

function onHotspotChange(pos) {
  if (activeSource.value) setHotspot(activeSource.value.imageId, pos.x, pos.y)
}

// ── Add source via file picker ─────────────────────────────────────────────
const addSourceInput = ref(null)

async function onAddSourceFile(e) {
  const file = e.target.files?.[0]
  if (!file || !cursor.value) return
  e.target.value = ''
  try {
    await importFileForCursor(file, cursor.value.id)
    showToast('Source added', 'info')
  } catch (err) {
    showToast('Failed to add source: ' + err.message, 'error')
  }
}

// ── Remove a source image from this cursor ─────────────────────────────────
function removeSource(source) {
  if (!cursor.value) return
  const cursorId = cursor.value.id
  const links = project.sizeLinks[cursorId] ?? {}
  for (const [sizeStr, imgId] of Object.entries(links)) {
    if (imgId === source.imageId) {
      removeSizeLink(cursorId, sizeStr)
      return
    }
  }
  if (project.assignments[cursorId] === source.imageId) {
    // Promote the smallest remaining sizeLink to primary, if one exists
    const remaining = Object.entries(project.sizeLinks[cursorId] ?? {})
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    if (remaining.length) {
      const [sizeStr, newPrimaryId] = remaining[0]
      project.assignments[cursorId] = newPrimaryId
      removeSizeLink(cursorId, sizeStr)
    } else {
      project.assignments[cursorId] = null
    }
  }
}

// ── Export preview: which source + method for each output size ─────────────
function scalePrefFor(size) {
  return project.scalePrefs[cursor.value?.id]?.[String(size)] ?? null
}

function previewForSize(size) {
  if (!allSources.value.length) return null
  return pickBestSource(allSources.value, size, scalePrefFor(size))
}

// ── Scale comparison dialog ────────────────────────────────────────────────
const compareSize = ref(null)  // non-null when dialog is open

function openCompare(size) { compareSize.value = size }
function closeCompare()    { compareSize.value = null }

// ── Hotspot editing for individual sources ─────────────────────────────────
function onSourceHotspotX(source, e) {
  const v = parseInt(e.target.value)
  if (!isNaN(v)) setHotspot(source.imageId, v, source.hotspot.y)
}
function onSourceHotspotY(source, e) {
  const v = parseInt(e.target.value)
  if (!isNaN(v)) setHotspot(source.imageId, source.hotspot.x, v)
}

function thumbDisplaySize(nativeSize) {
  return Math.min(nativeSize, 64)
}

function animInfo(src) {
  const frames = project.images[src.imageId]?.frames
  if (!frames?.length) return null
  const total = frames.reduce((s, f) => s + f.delay, 0)
  return `${frames.length} frames · ${total}ms`
}

// ── Drop pool image onto sources list ──────────────────────────────────────
const sourcesDropOver = ref(false)

function onSourcesDragOver(e) {
  if (!ui.draggingImageId || !cursor.value) return
  e.preventDefault()
  sourcesDropOver.value = true
}

function onSourcesDragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) sourcesDropOver.value = false
}

function onSourcesDrop(e) {
  sourcesDropOver.value = false
  if (!cursor.value) return
  const imageId = e.dataTransfer.getData('text/plain') || ui.draggingImageId
  if (!imageId) return
  e.preventDefault()
  linkPoolImageToCursor(imageId, cursor.value.id)
}
</script>

<template>
  <div class="cursor-editor">
    <!-- Empty state: no cursor selected -->
    <div v-if="!cursor" class="empty-state">
      <p>Select a cursor slot<br/>to edit it</p>
    </div>

    <!-- Cursor selected, no sources -->
    <template v-else-if="!allSources.length">
      <div class="editor-header">
        <span class="editor-title">{{ cursor.label }}</span>
        <code class="editor-id">{{ cursor.id }}</code>
      </div>
      <div class="empty-state">
        <p>No image assigned.<br/>Drag an image from the pool<br/>onto this cursor slot.</p>
      </div>
    </template>

    <!-- Cursor selected and image(s) assigned -->
    <template v-else>
      <div class="editor-header">
        <span class="editor-title">{{ cursor.label }}</span>
        <code class="editor-id">{{ cursor.id }}</code>
      </div>

      <div class="editor-body">

        <!-- Hotspot canvas — edits whichever source row is active -->
        <section class="section" v-if="activeSource">
          <div class="section-label">
            Hotspot
            <span class="hs-editing-tag">{{ activeSource.dims.width }}×{{ activeSource.dims.height }}</span>
          </div>
          <div class="canvas-well">
            <HotspotCanvas
              :key="activeSource.imageId"
              :data-url="activeSource.data"
              :hotspot="activeSource.hotspot"
              :dims="activeSource.dims"
              @hotspot-change="onHotspotChange"
            />
          </div>
          <div class="hotspot-coords">
            <span>X: <strong>{{ activeSource.hotspot?.x ?? 0 }}</strong></span>
            <span>Y: <strong>{{ activeSource.hotspot?.y ?? 0 }}</strong></span>
            <span class="dims-note">on {{ activeSource.dims?.width }}×{{ activeSource.dims?.height }}</span>
          </div>
        </section>

        <!-- Native sources list -->
        <section
          class="section"
          :class="{ 'sources-drop-over': sourcesDropOver }"
          @dragover="onSourcesDragOver"
          @dragleave="onSourcesDragLeave"
          @drop="onSourcesDrop"
        >
          <div class="section-label">
            Native sources
            <button class="add-source-btn" @click="addSourceInput?.click()">+ Add</button>
          </div>
          <input
            ref="addSourceInput"
            type="file"
            accept="image/*,.cur,.ani"
            style="display:none"
            @change="onAddSourceFile"
          />

          <div class="sources-list">
            <div
              v-for="src in allSources"
              :key="src.imageId"
              class="source-row"
              :class="{ active: src.imageId === activeSource?.imageId }"
              @click="selectSource(src)"
            >
              <div class="source-thumb-wrap">
                <AnimatedThumb
                  v-if="project.images[src.imageId]?.frames?.length > 1"
                  :frames="project.images[src.imageId].frames"
                  :dims="src.dims"
                  :size="thumbDisplaySize(src.dims.width)"
                  class="source-thumb"
                />
                <img
                  v-else
                  :src="src.data"
                  class="source-thumb"
                  :style="{ width: thumbDisplaySize(src.dims.width) + 'px', height: thumbDisplaySize(src.dims.height) + 'px' }"
                />
              </div>
              <div class="source-info">
                <div class="source-meta">
                  <span class="source-size-badge">{{ src.dims.width }}×{{ src.dims.height }}</span>
                  <span v-if="animInfo(src)" class="source-anim-info">{{ animInfo(src) }}</span>
                </div>
                <div class="source-hs-row">
                  <label>X <input type="number" :value="src.hotspot.x" :min="0" :max="src.dims.width - 1" @change="onSourceHotspotX(src, $event)" /></label>
                  <label>Y <input type="number" :value="src.hotspot.y" :min="0" :max="src.dims.height - 1" @change="onSourceHotspotY(src, $event)" /></label>
                </div>
              </div>
              <button class="sm danger source-remove" @click="removeSource(src)">✕</button>
            </div>
          </div>
        </section>

        <!-- Export preview -->
        <section class="section">
          <div class="section-label">Export preview</div>
          <div class="sizes-list">
            <div v-for="size in sizes" :key="size" class="size-row">
              <span class="size-badge">{{ size }}px</span>
              <template v-if="previewForSize(size)">
                <span
                  class="size-source"
                  :class="previewForSize(size).source.dims.width === size ? 'native' : ''"
                >from {{ previewForSize(size).source.dims.width }}px</span>
                <span class="interp" :class="{ nearest: previewForSize(size).method === 'nearest-neighbor' }">
                  · {{ previewForSize(size).method }}
                </span>
                <span class="size-hs">
                  hs: ({{
                    Math.round(previewForSize(size).source.hotspot.x * (size / previewForSize(size).source.dims.width))
                  }}, {{
                    Math.round(previewForSize(size).source.hotspot.y * (size / previewForSize(size).source.dims.height))
                  }})
                </span>
                <button
                  v-if="hasScaleChoice(allSources, size)"
                  class="compare-btn"
                  :class="{ 'has-pref': scalePrefFor(size) !== null }"
                  @click.stop="openCompare(size)"
                  title="Compare upscale vs downscale"
                >⇅</button>
              </template>
              <span v-else class="size-source">no source</span>
            </div>
          </div>
        </section>

        <!-- Aliases info -->
        <section class="section" v-if="cursor.aliases.length">
          <div class="section-label">Aliases (written as symlinks)</div>
          <div class="aliases-list">
            <code v-for="a in cursor.aliases" :key="a" class="alias-tag">{{ a }}</code>
          </div>
        </section>

      </div>
    </template>

    <!-- Scale comparison dialog (teleports over the overlay) -->
    <ScaleCompareDialog
      v-if="compareSize !== null && cursor && allSources.length"
      :cursor-id="cursor.id"
      :target-size="compareSize"
      :sources="allSources"
      :flip="project.flips[cursor.id] ?? { x: false, y: false }"
      @close="closeCompare"
    />
  </div>
</template>

<style scoped>
.cursor-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #2a2e32;
  overflow: hidden;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #4d5760;
  font-size: 12px;
  line-height: 1.7;
  padding: 20px;
}

.editor-header {
  padding: 10px 12px 8px;
  border-bottom: 1px solid #3d4347;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.editor-title { font-weight: 600; font-size: 14px; }
.editor-id {
  font-size: 11px;
  color: #3daee9;
  background: #1b1e20;
  padding: 1px 5px;
  border-radius: 3px;
  align-self: flex-start;
}

.editor-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section {}
.section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #7f8c8d;
  margin-bottom: 8px;
  border-bottom: 1px solid #31363b;
  padding-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-source-btn {
  margin-left: auto;
  padding: 1px 7px;
  font-size: 10px;
  background: #31363b;
  color: #eff0f1;
  border: 1px solid #4d5760;
  border-radius: 3px;
  cursor: pointer;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}
.add-source-btn:hover { background: #3d4347; }

.canvas-well {
  height: 256px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hotspot-coords {
  display: flex;
  gap: 10px;
  font-size: 11px;
  margin-top: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.hotspot-coords strong { color: #3daee9; }
.dims-note { color: #4d5760; font-size: 10px; }

/* ── Native sources ─────────────────────────────────────── */
.sources-drop-over .sources-list {
  outline: 2px dashed #3daee9;
  outline-offset: 2px;
  border-radius: 5px;
}

.sources-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.source-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #232629;
  border: 1px solid #31363b;
  border-radius: 5px;
  padding: 6px 8px;
}
.source-thumb-wrap {
  background: repeating-conic-gradient(#555 0% 25%, #888 0% 50%) 0 0 / 8px 8px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
  flex-shrink: 0;
}
.source-thumb { image-rendering: pixelated; display: block; }
.source-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.source-meta { display: flex; align-items: center; gap: 6px; }
.source-size-badge { font-family: monospace; font-size: 11px; font-weight: 700; color: #eff0f1; }
.source-anim-info { font-size: 10px; color: #f39c12; font-family: monospace; }
.source-hs-row { display: flex; gap: 8px; }
.source-hs-row label { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #aab; }
.source-hs-row input { width: 50px; padding: 2px 4px; font-size: 11px; }
.source-remove { flex-shrink: 0; align-self: flex-start; }
.source-row { cursor: pointer; }
.source-row.active { border-color: #3daee9; background: #1d3a4a; }
.source-row.active .source-size-badge { color: #3daee9; }

.hs-editing-tag {
  font-size: 10px;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: #3daee9;
  font-family: monospace;
}

/* ── Export preview ─────────────────────────────────────── */
.sizes-list { display: flex; flex-direction: column; gap: 4px; }
.size-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border-radius: 3px;
  font-size: 11px;
  background: #232629;
}
.size-badge { font-weight: 700; color: #eff0f1; font-family: monospace; min-width: 32px; }
.size-source { color: #4d5760; font-size: 10px; }
.size-source.native { color: #27ae60; }
.interp { color: #4d5760; font-size: 10px; }
.interp.nearest { color: #6ec9f5; }
.size-hs { margin-left: auto; color: #7f8c8d; font-size: 10px; font-family: monospace; }

.compare-btn {
  flex-shrink: 0;
  background: transparent;
  border: 1px solid #3d4347;
  color: #7f8c8d;
  padding: 0 5px;
  font-size: 11px;
  border-radius: 3px;
  line-height: 1.6;
}
.compare-btn:hover { border-color: #3daee9; color: #3daee9; }
.compare-btn.has-pref { border-color: #3daee933; color: #3daee9; }

/* ── Aliases ────────────────────────────────────────────── */
.aliases-list { display: flex; flex-wrap: wrap; gap: 4px; }
.alias-tag {
  font-size: 10px;
  background: #232629;
  border: 1px solid #3d4347;
  border-radius: 3px;
  padding: 1px 5px;
  color: #7f8c8d;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
