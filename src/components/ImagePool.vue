<script setup>
import { computed, ref } from 'vue'
import { project, ui, importFiles, removeImage, showToast } from '../store/project.js'
import { getHandlerForFile, getAcceptString } from '../lib/formatRegistry.js'
import { importArchive, isArchiveFile } from '../lib/archiveImporter.js'

const acceptString  = getAcceptString()
const archiveAccept = '.zip,.tar,.tgz'

const fileInput   = ref(null)
const folderInput = ref(null)
const archiveInput = ref(null)

const images = computed(() => Object.values(project.images))

const assignedIds = computed(() => new Set(Object.values(project.assignments).filter(Boolean)))

function isAssigned(imageId) {
  return assignedIds.value.has(imageId)
}

function assignedToAll(imageId) {
  return Object.entries(project.assignments)
    .filter(([, v]) => v === imageId)
    .map(([k]) => k)
}

async function _confirmBulk(count) {
  return window.confirm(`This will import ${count} files. Continue?`)
}

async function _handleArchive(file) {
  try {
    const { successes, errors } = await importArchive(file, _confirmBulk)
    const msg = `Imported ${successes.length} file(s) from ${file.name}`
    if (errors.length) showToast(`${msg} (${errors.length} failed)`, 'error')
    else showToast(msg, 'info')
  } catch (err) {
    showToast('Archive import failed: ' + err.message, 'error')
    console.error(err)
  }
}

async function onFilesSelected(e) {
  const files = Array.from(e.target.files ?? [])
  e.target.value = ''
  if (!files.length) return

  const archives = files.filter(isArchiveFile)
  const regular  = files.filter(f => !isArchiveFile(f))

  for (const arc of archives) await _handleArchive(arc)
  if (regular.length) {
    const { errors } = await importFiles(regular)
    if (errors.length) showToast(`Failed to load: ${errors.join(', ')}`, 'error')
  }
}

async function onArchiveSelected(e) {
  const files = Array.from(e.target.files ?? [])
  e.target.value = ''
  for (const arc of files) await _handleArchive(arc)
}

async function onFolderSelected(e) {
  const files = Array.from(e.target.files ?? [])
  e.target.value = ''
  if (!files.length) return

  if (files.length > 50) {
    const ok = await _confirmBulk(files.length)
    if (!ok) return
  }

  const { errors } = await importFiles(files)
  if (errors.length) showToast(`Folder import: ${errors.length} file(s) not recognised`, 'error')
  else showToast(`Imported ${files.length} file(s) from folder`, 'info')
}

function onDropArea(e) {
  e.preventDefault()
  const all = Array.from(e.dataTransfer.files)

  const archives = all.filter(isArchiveFile)
  const regular  = all.filter(f =>
    !isArchiveFile(f) && (getHandlerForFile(f) !== null || (!f.name.includes('.') && !f.type))
  )

  for (const arc of archives) _handleArchive(arc)
  if (regular.length) importFiles(regular)
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
      <div class="import-actions">
        <button class="sm primary" @click="fileInput.click()">Import</button>
        <button class="sm" @click="folderInput.click()" title="Import all images from a folder">Folder</button>
        <button class="sm" @click="archiveInput.click()" title="Import from .zip or .tar.gz archive">Archive</button>
      </div>
    </div>

    <input ref="fileInput"   type="file" multiple :accept="`${acceptString},${archiveAccept}`" style="display:none" @change="onFilesSelected" />
    <input ref="folderInput" type="file" multiple webkitdirectory style="display:none" @change="onFolderSelected" />
    <input ref="archiveInput" type="file" multiple :accept="archiveAccept" style="display:none" @change="onArchiveSelected" />

    <div v-if="images.length === 0" class="empty-state">
      <p>Drop images, folders, or archives here<br/>or use the buttons above</p>
    </div>

    <div class="image-list">
      <div
        v-for="img in images"
        :key="img.id"
        class="image-item"
        :class="{ 'is-assigned': isAssigned(img.id), dragging: ui.draggingImageId === img.id }"
        draggable="true"
        @dragstart="onDragStart($event, img.id)"
        @dragend="onDragEnd"
      >
        <img :src="img.data" class="item-thumb" :title="img.filename" />
        <div class="item-info">
          <span class="item-name" :title="img.filename">{{ img.filename }}</span>
          <span class="item-dims">{{ img.dims.width }}×{{ img.dims.height }}</span>
          <button
            v-for="role in assignedToAll(img.id)"
            :key="role"
            class="item-assigned role-link"
            @click.stop="onRoleClick(role)"
          >→ {{ role }}</button>
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
  gap: 6px;
}

.import-actions {
  display: flex;
  gap: 4px;
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
