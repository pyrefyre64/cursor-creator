<script setup>
import { computed } from 'vue'
import { project, ui, removeAssignment, toggleFlip, getSourcesForCursor, linkPoolImageToCursor } from '../store/project.js'
import AnimatedThumb from './AnimatedThumb.vue'

const props = defineProps({
  cursor: { type: Object, required: true },
  /** Assigned ImageEntry or null */
  image: { type: Object, default: null },
})

const isSelected = computed(() => ui.selectedCursorId === props.cursor.id)
const flip = computed(() => project.flips[props.cursor.id] ?? { x: false, y: false })
const thumbTransform = computed(() => {
  const parts = []
  if (flip.value.x) parts.push('scaleX(-1)')
  if (flip.value.y) parts.push('scaleY(-1)')
  return parts.length ? parts.join(' ') : undefined
})

const nativeSizes = computed(() =>
  getSourcesForCursor(props.cursor.id).map(s => ({ imageId: s.imageId, width: s.dims.width }))
)

function focusPoolImage(imageId) {
  ui.focusImageId = imageId
}

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
  if (!imageId) return

  const cursorId = props.cursor.id

  // Same image already linked → no-op
  const alreadyLinked =
    project.assignments[cursorId] === imageId ||
    Object.values(project.sizeLinks[cursorId] ?? {}).includes(imageId)
  if (alreadyLinked) return

  // Smart routing: sets primary if unassigned, adds sizeLink if new size,
  // or pushes to ui.conflicts if that size already has a source.
  linkPoolImageToCursor(imageId, cursorId)
  ui.selectedCursorId = cursorId
}

function onClearClick(e) {
  e.stopPropagation()
  removeAssignment(props.cursor.id)
  if (ui.selectedCursorId === props.cursor.id) ui.selectedCursorId = null
}
</script>

<template>
  <div
    :id="`slot-${cursor.id}`"
    class="cursor-slot"
    :class="{ selected: isSelected, assigned: !!image }"
    :style="cursor.cssCursor ? { cursor: cursor.cssCursor } : undefined"
    @click="onClick"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <div class="thumb-area">
      <AnimatedThumb v-if="image?.frames?.length > 1" :frames="image.frames" :dims="image.dims" :size="32" class="thumb" :title="image.filename" :style="thumbTransform ? { transform: thumbTransform } : undefined" />
      <img v-else-if="image" :src="image.data" class="thumb" :title="image.filename" :style="thumbTransform ? { transform: thumbTransform } : undefined" />
      <div v-else class="thumb-placeholder" />
    </div>
    <div class="slot-info">
      <span class="slot-name" :title="cursor.id">{{ cursor.label }}</span>
      <span class="slot-id">{{ cursor.id }}</span>
      <div v-if="nativeSizes.length" class="slot-sizes">
        <span v-if="image?.frames?.length > 1" class="anim-pill">▶ {{ image.frames.length }}f</span>
        <button
          v-for="s in nativeSizes"
          :key="s.imageId"
          class="size-pill"
          @click.stop="focusPoolImage(s.imageId)"
        >{{ s.width }}px</button>
      </div>
    </div>
    <div v-if="image" class="flip-controls">
      <button class="flip-btn" :class="{ active: flip.x }" @click.stop="toggleFlip(cursor.id, 'x')" title="Mirror horizontally">↔</button>
      <button class="flip-btn" :class="{ active: flip.y }" @click.stop="toggleFlip(cursor.id, 'y')" title="Mirror vertically">↕</button>
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
.slot-sizes {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
.size-pill {
  font-size: 9px;
  font-family: monospace;
  color: #4d5760;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  line-height: 1.3;
}
.size-pill:hover { color: #7f8c8d; }

.anim-pill {
  font-size: 9px;
  color: #f39c12;
  font-family: monospace;
  line-height: 1.3;
}

.flip-controls {
  display: flex;
  flex-direction: row;
  flex: 1;
  gap: 2px;
  flex-shrink: 0;
}
.flip-btn {
  background: transparent;
  color: #7f8c8d;
  border: 1px solid transparent;
  padding: 1px 4px;
  font-size: 11px;
  line-height: 1;
  border-radius: 3px;
}
.flip-btn:hover { color: #ccd; border-color: #3d4347; }
.flip-btn.active { color: #3daee9; border-color: #3daee933; }

.clear-btn {
  flex-shrink: 0;
  background: transparent;
  color: #7f8c8d;
  padding: 2px 5px;
  font-size: 10px;
}
.clear-btn:hover { background: #da4453; color: #fff; }
</style>
