<script setup>
import { computed } from 'vue'
import { project, ui } from '../store/project.js'
import { CATEGORIES, CURSORS, CURSORS_BY_CATEGORY } from '../data/cursorDatabase.js'
import CursorSlot from './CursorSlot.vue'

const categoriesWithCursors = computed(() =>
  CATEGORIES
    .map(cat => {
      let cursors = CURSORS_BY_CATEGORY[cat.id] ?? []
      if (ui.simpleMode) cursors = cursors.filter(c => c.winRole)
      return { ...cat, cursors }
    })
    .filter(cat => cat.cursors.length > 0)
)

function getImage(cursorId) {
  const imageId = project.assignments[cursorId]
  return imageId ? project.images[imageId] ?? null : null
}

const visibleCursors = computed(() =>
  ui.simpleMode ? CURSORS.filter(c => c.winRole) : CURSORS
)

const totalAssigned = computed(() =>
  visibleCursors.value.filter(c => {
    const id = project.assignments[c.id]
    return id && project.images[id]
  }).length
)
const totalSlots = computed(() => visibleCursors.value.length)
</script>

<template>
  <div class="assignment-grid">
    <div class="grid-header">
      <span class="grid-title">Cursor Assignments</span>
      <div class="grid-header-right">
        <span class="grid-count">{{ totalAssigned }} / {{ totalSlots }}</span>
        <div class="mode-seg" title="Simple: Windows-compatible cursors only · Full: all X11/Linux roles">
          <button class="seg-btn" :class="{ active: ui.simpleMode }"  @click="ui.simpleMode = true">Simple</button>
          <button class="seg-btn" :class="{ active: !ui.simpleMode }" @click="ui.simpleMode = false">Full</button>
        </div>
      </div>
    </div>

    <div class="grid-body">
      <div v-for="cat in categoriesWithCursors" :key="cat.id" class="category-group">
        <div class="category-label">{{ cat.label }}</div>
        <div class="category-slots">
          <CursorSlot
            v-for="cursor in cat.cursors"
            :key="cursor.id"
            :cursor="cursor"
            :image="getImage(cursor.id)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.assignment-grid {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid #3d4347;
}

.grid-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #3d4347;
  flex-shrink: 0;
  background: #2a2e32;
}
.grid-title {
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #aab;
}
.grid-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.grid-count {
  font-size: 11px;
  color: #7f8c8d;
}
.mode-seg {
  display: flex;
  border: 1px solid #3d4347;
  border-radius: 3px;
  overflow: hidden;
}
.seg-btn {
  font-size: 10px;
  padding: 2px 8px;
  background: #232629;
  color: #7f8c8d;
  border: none;
  border-radius: 0;
}
.seg-btn + .seg-btn { border-left: 1px solid #3d4347; }
.seg-btn:hover { background: #31363b; color: #eff0f1; }
.seg-btn.active {
  background: #1d3a4a;
  color: #3daee9;
}

.grid-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-group {}

.category-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #7f8c8d;
  padding: 0 8px 4px;
  border-bottom: 1px solid #2e3237;
  margin-bottom: 4px;
}

.category-slots {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
</style>
