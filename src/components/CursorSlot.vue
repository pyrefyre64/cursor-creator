<script setup>
import { computed } from 'vue'
import { ui, setAssignment, removeAssignment } from '../store/project.js'

const props = defineProps({
  cursor: { type: Object, required: true },
  /** Assigned ImageEntry or null */
  image: { type: Object, default: null },
})

const isSelected = computed(() => ui.selectedCursorId === props.cursor.id)

function onClick() {
  ui.selectedCursorId = props.cursor.id
}

function onDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'copy'
}

function onDrop(e) {
  e.preventDefault()
  const imageId = e.dataTransfer.getData('text/plain')
  if (imageId) {
    setAssignment(props.cursor.id, imageId)
    ui.selectedCursorId = props.cursor.id
  }
}

function onClearClick(e) {
  e.stopPropagation()
  removeAssignment(props.cursor.id)
  if (ui.selectedCursorId === props.cursor.id) ui.selectedCursorId = null
}
</script>

<template>
  <div
    class="cursor-slot"
    :class="{ selected: isSelected, assigned: !!image }"
    @click="onClick"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <div class="thumb-area">
      <img v-if="image" :src="image.data" class="thumb" :title="image.filename" />
      <div v-else class="thumb-placeholder" />
    </div>
    <div class="slot-info">
      <span class="slot-name" :title="cursor.id">{{ cursor.label }}</span>
      <span class="slot-id">{{ cursor.id }}</span>
    </div>
    <button v-if="image" class="clear-btn sm" @click="onClearClick" title="Remove assignment">✕</button>
  </div>
</template>

<style scoped>
.cursor-slot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 5px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.1s, border-color 0.1s;
  position: relative;
}
.cursor-slot:hover { background: #2e3237; }
.cursor-slot.selected { background: #2a3a4a; border-color: #3daee9; }
.cursor-slot.assigned .slot-id { color: #3daee9; }

.thumb-area {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.thumb {
  max-width: 32px;
  max-height: 32px;
  image-rendering: pixelated;
  border-radius: 2px;
}
.thumb-placeholder {
  width: 28px;
  height: 28px;
  border: 1px dashed #3d4347;
  border-radius: 3px;
}

.slot-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.slot-name {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.slot-id {
  font-size: 10px;
  color: #7f8c8d;
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.clear-btn {
  flex-shrink: 0;
  background: transparent;
  color: #7f8c8d;
  padding: 2px 5px;
  font-size: 10px;
}
.clear-btn:hover { background: #da4453; color: #fff; }
</style>
