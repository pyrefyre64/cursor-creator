<script setup>
import { ref } from 'vue'
import { project, saveProject, loadProject, showToast } from '../store/project.js'
import { exportTheme } from '../lib/themeExporter.js'
import { exportWindowsCursors } from '../lib/windowsExporter.js'

const ALL_SIZES = [24, 32, 48, 64, 96]
const loadInput = ref(null)
const exporting = ref(false)
const exportingWin = ref(false)
const dropdownOpen = ref(false)

function toggleSize(size) {
  const idx = project.config.sizes.indexOf(size)
  if (idx === -1) {
    project.config.sizes.push(size)
    project.config.sizes.sort((a, b) => a - b)
  } else if (project.config.sizes.length > 1) {
    project.config.sizes.splice(idx, 1)
  }
}

function hasSize(size) {
  return project.config.sizes.includes(size)
}

async function onLoadFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    loadProject(text)
    showToast('Project loaded', 'info')
  } catch (err) {
    showToast('Failed to load project: ' + err.message, 'error')
  }
  loadInput.value.value = ''
}

async function onExport() {
  exporting.value = true
  try {
    await exportTheme()
    showToast('Theme exported!', 'info')
  } catch (err) {
    showToast('Export failed: ' + err.message, 'error')
    console.error(err)
  } finally {
    exporting.value = false
  }
}

async function onExportWindows() {
  dropdownOpen.value = false
  exportingWin.value = true
  try {
    await exportWindowsCursors()
    showToast('Windows cursors exported!', 'info')
  } catch (err) {
    showToast('Export failed: ' + err.message, 'error')
    console.error(err)
  } finally {
    exportingWin.value = false
  }
}
</script>

<template>
  <div class="project-bar">
    <div class="bar-section brand">
      <span class="app-name">KDE Cursor Maker</span>
    </div>

    <div class="bar-section meta">
      <label class="field-label">Theme name</label>
      <input
        type="text"
        v-model="project.meta.name"
        placeholder="MyTheme"
        class="theme-name-input"
      />
      <input
        type="text"
        v-model="project.meta.description"
        placeholder="Description (optional)"
        class="desc-input"
      />
    </div>

    <div class="bar-section sizes">
      <label class="field-label">Output sizes</label>
      <div class="size-toggles">
        <button
          v-for="size in ALL_SIZES"
          :key="size"
          class="size-toggle"
          :class="{ active: hasSize(size) }"
          @click="toggleSize(size)"
        >{{ size }}</button>
      </div>
    </div>

    <div class="bar-section actions">
      <button @click="saveProject">Save Project</button>
      <button @click="loadInput.click()">Load Project</button>
      <div class="export-wrap">
        <div class="export-split">
          <button class="primary export-main" @click="onExport" :disabled="exporting || exportingWin">
            {{ exporting ? 'Exporting…' : exportingWin ? 'Exporting…' : 'Export .tar.gz' }}
          </button>
          <button class="primary export-chevron" @click.stop="dropdownOpen = !dropdownOpen" :disabled="exporting || exportingWin" title="More export options">▾</button>
        </div>
        <div v-if="dropdownOpen" class="export-backdrop" @click="dropdownOpen = false"></div>
        <div v-if="dropdownOpen" class="export-menu">
          <button @click="onExportWindows">Export Windows (.ani)</button>
        </div>
      </div>
      <input ref="loadInput" type="file" accept=".json" style="display:none" @change="onLoadFile" />
    </div>
  </div>
</template>

<style scoped>
.project-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px 14px;
  background: #1b1e20;
  border-bottom: 1px solid #3d4347;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.bar-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand {
  flex-shrink: 0;
}
.app-name {
  font-size: 14px;
  font-weight: 700;
  color: #3daee9;
  white-space: nowrap;
}

.meta {
  flex: 1;
  min-width: 200px;
  flex-wrap: wrap;
}
.field-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #7f8c8d;
  white-space: nowrap;
}
.theme-name-input {
  width: 140px;
}
.desc-input {
  width: 180px;
  flex: 1;
  min-width: 100px;
}

.sizes { flex-shrink: 0; }
.size-toggles {
  display: flex;
  gap: 4px;
}
.size-toggle {
  padding: 3px 8px;
  font-size: 11px;
  font-family: monospace;
  background: #2a2e32;
  color: #7f8c8d;
  border: 1px solid #3d4347;
}
.size-toggle:hover { background: #31363b; }
.size-toggle.active {
  background: #1d3a4a;
  color: #3daee9;
  border-color: #3daee9;
}

.actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-wrap {
  position: relative;
}
.export-split {
  display: flex;
}
.export-main {
  border-radius: 4px 0 0 4px;
}
.export-chevron {
  border-radius: 0 4px 4px 0;
  border-left: 1px solid rgba(255, 255, 255, 0.15);
  padding: 4px 7px;
}
.export-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99;
}
.export-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 100;
  background: #232629;
  border: 1px solid #3d4347;
  border-radius: 4px;
  min-width: 180px;
  padding: 3px 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}
.export-menu button {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 6px 12px;
  font-size: 12px;
  color: #eff0f1;
  cursor: pointer;
  border-radius: 0;
}
.export-menu button:hover {
  background: #31363b;
}
</style>
