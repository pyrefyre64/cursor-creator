<script setup>
import { computed, ref } from 'vue'
import { project, ui, setHotspot, setSizeOverride, removeSizeOverride, setOverrideHotspot, importFiles, showToast } from '../store/project.js'
import { getCursorById } from '../data/cursorDatabase.js'
import HotspotCanvas from './HotspotCanvas.vue'

const cursor = computed(() => ui.selectedCursorId ? getCursorById(ui.selectedCursorId) : null)
const imageId = computed(() => cursor.value ? (project.assignments[cursor.value.id] ?? null) : null)
const image = computed(() => imageId.value ? project.images[imageId.value] ?? null : null)

const sizes = computed(() => [...project.config.sizes].sort((a, b) => a - b))

function onHotspotChange(pos) {
  if (imageId.value) setHotspot(imageId.value, pos.x, pos.y)
}

// Per-size override file inputs (one ref per size, keyed by size)
const overrideInputs = ref({})

function getOverrideInputRef(size) {
  return (el) => { overrideInputs.value[size] = el }
}

async function onOverrideFile(e, size) {
  const file = e.target.files?.[0]
  if (!file || !imageId.value) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    setSizeOverride(imageId.value, size, ev.target.result, null)
    showToast(`Override set for ${size}px`, 'info')
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

function removeOverride(size) {
  if (imageId.value) removeSizeOverride(imageId.value, size)
}

function getOverride(size) {
  return image.value?.sizeOverrides?.[String(size)] ?? null
}

function isNativeSize(size) {
  const d = image.value?.dims
  return d && d.width === size && d.height === size
}

function isIntegerUpscale(size) {
  const d = image.value?.dims
  return d && size >= d.width && size >= d.height &&
         size % d.width === 0 && size % d.height === 0
}

function scaledHotspot(size) {
  const ov = getOverride(size)
  if (ov?.hotspot) return ov.hotspot
  if (!image.value?.hotspot || !image.value?.dims) return { x: 0, y: 0 }
  return {
    x: Math.round(image.value.hotspot.x * (size / image.value.dims.width)),
    y: Math.round(image.value.hotspot.y * (size / image.value.dims.height)),
  }
}

function onOverrideHotspotX(size, e) {
  const v = parseInt(e.target.value)
  if (!isNaN(v) && imageId.value) {
    const cur = getOverride(size)?.hotspot ?? scaledHotspot(size)
    setOverrideHotspot(imageId.value, size, v, cur.y)
  }
}
function onOverrideHotspotY(size, e) {
  const v = parseInt(e.target.value)
  if (!isNaN(v) && imageId.value) {
    const cur = getOverride(size)?.hotspot ?? scaledHotspot(size)
    setOverrideHotspot(imageId.value, size, cur.x, v)
  }
}
</script>

<template>
  <div class="cursor-editor">
    <!-- Empty state: no cursor selected -->
    <div v-if="!cursor" class="empty-state">
      <p>Select a cursor slot<br/>to edit it</p>
    </div>

    <!-- Cursor selected, no image assigned -->
    <template v-else-if="!image">
      <div class="editor-header">
        <span class="editor-title">{{ cursor.label }}</span>
        <code class="editor-id">{{ cursor.id }}</code>
      </div>
      <div class="empty-state">
        <p>No image assigned.<br/>Drag an image from the pool<br/>onto this cursor slot.</p>
      </div>
    </template>

    <!-- Cursor selected and image assigned -->
    <template v-else>
      <div class="editor-header">
        <span class="editor-title">{{ cursor.label }}</span>
        <code class="editor-id">{{ cursor.id }}</code>
      </div>

      <div class="editor-body">
        <!-- Master hotspot section -->
        <section class="section">
          <div class="section-label">Master Hotspot</div>
          <HotspotCanvas
            :data-url="image.data"
            :hotspot="image.hotspot"
            :dims="image.dims"
            @hotspot-change="onHotspotChange"
          />
          <div class="hotspot-coords">
            <span>X: <strong>{{ image.hotspot?.x ?? 0 }}</strong></span>
            <span>Y: <strong>{{ image.hotspot?.y ?? 0 }}</strong></span>
            <span class="dims-note">on {{ image.dims?.width }}×{{ image.dims?.height }}</span>
          </div>
        </section>

        <!-- Output sizes -->
        <section class="section">
          <div class="section-label">Output Sizes</div>

          <div class="sizes-list">
            <div v-for="size in sizes" :key="size" class="size-row">
              <div class="size-header">
                <span class="size-badge">{{ size }}px</span>
                <template v-if="!getOverride(size)">
                  <span v-if="isNativeSize(size)" class="size-source native">native</span>
                  <span v-else class="size-source">
                    scaled from {{ image.dims.width }}×{{ image.dims.height }}
                    <span :class="isIntegerUpscale(size) ? 'interp nearest' : 'interp'">· {{ isIntegerUpscale(size) ? 'nearest' : 'bilinear' }}</span>
                  </span>
                </template>
                <span v-else class="size-source override">override</span>
                <div class="size-hs">
                  hs: ({{ scaledHotspot(size).x }}, {{ scaledHotspot(size).y }})
                </div>
              </div>

              <div class="size-body">
                <!-- Thumbnail preview -->
                <div class="size-thumb-wrap">
                  <img
                    :src="getOverride(size)?.data ?? image.data"
                    class="size-thumb"
                    :style="{ width: size + 'px', height: size + 'px' }"
                  />
                </div>

                <!-- Override controls -->
                <div class="size-controls">
                  <template v-if="getOverride(size)">
                    <!-- Override hotspot inputs -->
                    <div class="hs-inputs">
                      <label>X
                        <input
                          type="number"
                          :value="scaledHotspot(size).x"
                          :min="0" :max="size - 1"
                          @change="onOverrideHotspotX(size, $event)"
                        />
                      </label>
                      <label>Y
                        <input
                          type="number"
                          :value="scaledHotspot(size).y"
                          :min="0" :max="size - 1"
                          @change="onOverrideHotspotY(size, $event)"
                        />
                      </label>
                    </div>
                    <button class="sm danger" @click="removeOverride(size)">Remove</button>
                  </template>
                  <template v-else>
                    <button class="sm" @click="overrideInputs[size]?.click()">
                      {{ isNativeSize(size) ? 'Override' : `Upload ${size}px` }}
                    </button>
                  </template>
                  <!-- Hidden file input -->
                  <input
                    :ref="getOverrideInputRef(size)"
                    type="file"
                    accept="image/*"
                    style="display:none"
                    @change="onOverrideFile($event, size)"
                  />
                </div>
              </div>
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
.editor-title {
  font-weight: 600;
  font-size: 14px;
}
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

.sizes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.size-row {
  border: 1px solid #31363b;
  border-radius: 5px;
  overflow: hidden;
}

.size-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #232629;
  font-size: 11px;
}
.size-badge {
  font-weight: 700;
  color: #eff0f1;
  font-family: monospace;
  min-width: 32px;
}
.size-source {
  color: #4d5760;
  font-size: 10px;
}
.size-source.native {
  color: #27ae60;
}
.size-source.override {
  color: #f0a050;
}
.interp { color: #4d5760; }
.interp.nearest { color: #6ec9f5; }
.size-hs {
  margin-left: auto;
  color: #7f8c8d;
  font-size: 10px;
  font-family: monospace;
}

.size-body {
  display: flex;
  gap: 8px;
  padding: 8px;
  align-items: flex-start;
}
.size-thumb-wrap {
  background: repeating-conic-gradient(#555 0% 25%, #888 0% 50%) 0 0 / 8px 8px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  min-height: 48px;
  flex-shrink: 0;
}
.size-thumb {
  image-rendering: pixelated;
  display: block;
}

.size-controls {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: center;
}

.hs-inputs {
  display: flex;
  gap: 8px;
}
.hs-inputs label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #aab;
}
.hs-inputs input {
  width: 52px;
  padding: 2px 5px;
  font-size: 11px;
}

.aliases-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
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
