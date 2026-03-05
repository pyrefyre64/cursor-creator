<script setup>
import { computed, ref } from 'vue'
import { project, ui, importFiles, removeImage, showToast } from '../store/project.js'
import { getHandlerForFile, getAcceptString } from '../lib/formatRegistry.js'

const acceptString = getAcceptString()

const fileInput = ref(null)

const images = computed(() => Object.values(project.images))

// All role badges for an image: both direct assignments and size links
const badgeMap = computed(() => {
  const map = {}
  const add = (imgId, cursorId, sizeStr) => {
    if (!map[imgId]) map[imgId] = []
    map[imgId].push({ cursorId, sizeStr })
  }
  for (const [cursorId, imgId] of Object.entries(project.assignments)) {
    if (!imgId || !project.images[imgId]) continue
    add(imgId, cursorId, String(project.images[imgId].dims.width))
  }
  for (const [cursorId, links] of Object.entries(project.sizeLinks)) {
    for (const [sizeStr, imgId] of Object.entries(links)) {
      if (!imgId) continue
      add(imgId, cursorId, sizeStr)
    }
  }
  return map
})

function badgesFor(imageId) {
  return badgeMap.value[imageId] ?? []
}

function isLinked(imageId) {
  return badgesFor(imageId).length > 0
}

async function onFilesSelected(e) {
  const files = e.target.files
  if (!files?.length) return
  const { errors } = await importFiles(files)
  if (errors.length) showToast(`Failed to load: ${errors.join(', ')}`, 'error')
  fileInput.value.value = ''
}

function onDropArea(e) {
  e.preventDefault()
  // Allow extensionless files with no MIME type through — magic detection runs at import time
  const files = Array.from(e.dataTransfer.files).filter(f =>
    getHandlerForFile(f) !== null || (!f.name.includes('.') && !f.type)
  )
  if (files.length) importFiles(files)
}

function onDragOver(e) { e.preventDefault() }

function onDragStart(e, imageId) {
  e.dataTransfer.setData('text/plain', imageId)
  e.dataTransfer.effectAllowed = 'copy'
  ui.draggingImageId = imageId
}

function onDragEnd() {
  ui.draggingImageId = null
}

function onRemove(imageId) {
  removeImage(imageId)
}

function onRoleClick(role) {
  ui.selectedCursorId = role
  document.getElementById(`slot-${role}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}
</script>

<template>
  <div class="image-pool" @dragover="onDragOver" @drop="onDropArea">
    <div class="pool-header">
      <span class="pool-title">Image Pool</span>
      <button class="sm primary" @click="fileInput.click()">Import</button>
    </div>

    <input ref="fileInput" type="file" multiple :accept="acceptString" style="display:none" @change="onFilesSelected" />

    <div v-if="images.length === 0" class="empty-state">
      <p>Drop images here<br/>or click Import</p>
    </div>

    <div class="image-list">
      <div
        v-for="img in images"
        :key="img.id"
        class="image-item"
        :class="{ 'is-assigned': isLinked(img.id), dragging: ui.draggingImageId === img.id }"
        draggable="true"
        @dragstart="onDragStart($event, img.id)"
        @dragend="onDragEnd"
      >
        <img :src="img.data" class="item-thumb" :title="img.filename" />
        <div class="item-info">
          <span class="item-name" :title="img.filename">{{ img.filename }}</span>
          <span class="item-dims">{{ img.dims.width }}×{{ img.dims.height }}</span>
          <button
            v-for="b in badgesFor(img.id)"
            :key="b.cursorId + b.sizeStr"
            class="item-assigned role-link"
            @click.stop="onRoleClick(b.cursorId)"
          >→ {{ b.cursorId }} {{ b.sizeStr }}px</button>
        </div>
        <button class="sm remove-btn" @click="onRemove(img.id)" title="Remove image">✕</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-pool {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid #3d4347;
  background: #2a2e32;
}

.pool-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid #3d4347;
  flex-shrink: 0;
}
.pool-title {
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #aab;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #4d5760;
  font-size: 12px;
  line-height: 1.6;
  padding: 16px;
}

.image-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.image-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 5px 6px;
  border-radius: 4px;
  cursor: grab;
  border: 1px solid transparent;
  transition: background 0.1s;
}
.image-item:hover { background: #31363b; }
.image-item.is-assigned { border-color: #3daee933; }
.image-item.dragging { opacity: 0.5; }

.item-thumb {
  width: 28px;
  height: 28px;
  object-fit: contain;
  image-rendering: pixelated;
  flex-shrink: 0;
  border-radius: 2px;
  background: repeating-conic-gradient(#555 0% 25%, #888 0% 50%) 0 0 / 8px 8px;
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.item-name {
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-dims {
  font-size: 10px;
  color: #7f8c8d;
  font-family: monospace;
}
.item-assigned {
  font-size: 10px;
  color: #3daee9;
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.role-link {
  background: transparent;
  border: none;
  padding: 0;
  text-align: left;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.role-link:hover { color: #6ec9f5; }

.remove-btn {
  flex-shrink: 0;
  background: transparent;
  color: #4d5760;
  padding: 2px 5px;
  font-size: 10px;
}
.remove-btn:hover { background: #da4453; color: #fff; }
</style>
