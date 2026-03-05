<script setup>
import { project, ui, resolveSizeConflict } from '../store/project.js'
import { getCursorById } from '../data/cursorDatabase.js'
import TwoImageChoice from './TwoImageChoice.vue'

function cursorLabel(cursorId) {
  return getCursorById(cursorId)?.label ?? cursorId
}

function keep(c)   { resolveSizeConflict(c, 'keep') }
function useNew(c) { resolveSizeConflict(c, 'replace') }

function keepAll()    { while (ui.conflicts.length) resolveSizeConflict(ui.conflicts[0], 'keep') }
function replaceAll() { while (ui.conflicts.length) resolveSizeConflict(ui.conflicts[0], 'replace') }
</script>

<template>
  <div class="overlay">
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">
          Import conflict{{ ui.conflicts.length > 1 ? 's' : '' }}
          <span class="count-badge">{{ ui.conflicts.length }}</span>
        </span>
        <div v-if="ui.conflicts.length > 1" class="batch-row">
          <button class="sm" @click="keepAll">Keep all existing</button>
          <button class="sm primary" @click="replaceAll">Use all new</button>
        </div>
      </div>

      <div class="conflict-list">
        <div v-for="c in ui.conflicts" :key="c.newId" class="conflict-item">
          <div class="conflict-label">
            <span class="size-pill">{{ c.sizeStr }}px</span>
            source for <strong>{{ cursorLabel(c.cursorId) }}</strong>
            <code class="cursor-id">{{ c.cursorId }}</code>
          </div>
          <TwoImageChoice
            label-a="Existing"
            :image-url-a="project.images[c.existingId]?.data"
            :sublabel-a="project.images[c.existingId]?.filename"
            action-label-a="Keep existing"
            label-b="New"
            :image-url-b="project.images[c.newId]?.data"
            :sublabel-b="project.images[c.newId]?.filename"
            action-label-b="Use new"
            @choose-a="keep(c)"
            @choose-b="useNew(c)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal {
  background: #2a2e32;
  border: 1px solid #3d4347;
  border-radius: 8px;
  width: 480px;
  max-width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  padding: 12px 16px 10px;
  border-bottom: 1px solid #3d4347;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.modal-title {
  font-weight: 600;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.count-badge {
  background: #da4453;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
}

.batch-row {
  margin-left: auto;
  display: flex;
  gap: 6px;
}

.conflict-list {
  overflow-y: auto;
  padding: 8px 0;
  display: flex;
  flex-direction: column;
}

.conflict-item {
  padding: 12px 16px;
  border-bottom: 1px solid #31363b;
}
.conflict-item:last-child { border-bottom: none; }

.conflict-label {
  font-size: 12px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.size-pill {
  background: #1b1e20;
  border: 1px solid #3d4347;
  border-radius: 3px;
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  color: #eff0f1;
}

.cursor-id {
  font-size: 10px;
  color: #3daee9;
  background: #1b1e20;
  padding: 1px 5px;
  border-radius: 3px;
  margin-left: auto;
}
</style>
