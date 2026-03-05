<script setup>
import { ui } from './store/project.js'
import ProjectBar from './components/ProjectBar.vue'
import ImagePool from './components/ImagePool.vue'
import AssignmentGrid from './components/AssignmentGrid.vue'
import CursorEditor from './components/CursorEditor.vue'
import ConflictDialog from './components/ConflictDialog.vue'
</script>

<template>
  <div class="app">
    <ProjectBar />

    <div class="panels">
      <ImagePool class="panel panel-pool" />
      <AssignmentGrid class="panel panel-grid" />
      <CursorEditor class="panel panel-editor" />
    </div>

    <!-- Size-conflict resolution dialog -->
    <ConflictDialog v-if="ui.conflicts.length" />

    <!-- Toast notifications -->
    <Transition name="toast">
      <div
        v-if="ui.toast"
        class="toast"
        :class="ui.toast.type"
      >
        {{ ui.toast.message }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.panels {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.panel { overflow: hidden; }
.panel-pool  { width: 220px; flex-shrink: 0; }
.panel-grid  { flex: 1; min-width: 0; }
.panel-editor { width: 310px; flex-shrink: 0; }

.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #31363b;
  border: 1px solid #3d4347;
  border-radius: 6px;
  padding: 8px 18px;
  font-size: 13px;
  color: #eff0f1;
  pointer-events: none;
  z-index: 1000;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}
.toast.error {
  background: #3b1e22;
  border-color: #da4453;
  color: #f8a5a5;
}
.toast.info {
  background: #1a2f3a;
  border-color: #3daee9;
  color: #9dd6f5;
}

.toast-enter-active, .toast-leave-active { transition: opacity 0.25s, transform 0.25s; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(10px); }
.toast-leave-to   { opacity: 0; transform: translateX(-50%) translateY(10px); }
</style>
