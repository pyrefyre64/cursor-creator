<script setup>
import { computed } from 'vue'
import { project } from '../store/project.js'
import { CATEGORIES, CURSORS_BY_CATEGORY } from '../data/cursorDatabase.js'
import CursorSlot from './CursorSlot.vue'

const categoriesWithCursors = computed(() =>
  CATEGORIES
    .map(cat => ({ ...cat, cursors: CURSORS_BY_CATEGORY[cat.id] ?? [] }))
    .filter(cat => cat.cursors.length > 0)
)

function getImage(cursorId) {
  const imageId = project.assignments[cursorId]
  return imageId ? project.images[imageId] ?? null : null
}

const totalAssigned = computed(() =>
  Object.values(project.assignments).filter(v => v && project.images[v]).length
)
const totalSlots = computed(() =>
  Object.values(CURSORS_BY_CATEGORY).reduce((s, arr) => s + arr.length, 0)
)
</script>

<template>
  <div class="assignment-grid">
    <div class="grid-header">
      <span class="grid-title">Cursor Assignments</span>
      <span class="grid-count">{{ totalAssigned }} / {{ totalSlots }} assigned</span>
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
.grid-count {
  font-size: 11px;
  color: #7f8c8d;
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
