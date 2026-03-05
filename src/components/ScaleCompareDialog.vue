<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { processFromSources, pixelsToObjectUrl, pickBestSource } from '../lib/imageProcessor.js'
import { setScalePref } from '../store/project.js'
import TwoImageChoice from './TwoImageChoice.vue'

const props = defineProps({
  cursorId:   { type: String,  required: true },
  targetSize: { type: Number,  required: true },
  /** Array of source objects from getSourcesForCursor */
  sources:    { type: Array,   required: true },
  flip:       { type: Object,  default: () => ({ x: false, y: false }) },
})

const emit = defineEmits(['close'])

const loading   = ref(true)
const urlUp     = ref(null)
const urlDown   = ref(null)
const upLabel   = ref('')
const downLabel = ref('')

// Render both scale options asynchronously, then display.
async function render() {
  loading.value = true
  try {
    const pickedUp   = pickBestSource(props.sources, props.targetSize, 'up')
    const pickedDown = pickBestSource(props.sources, props.targetSize, 'down')
    upLabel.value   = pickedUp   ? `↑ from ${pickedUp.source.dims.width}px`   : 'upscale'
    downLabel.value = pickedDown ? `↓ from ${pickedDown.source.dims.width}px` : 'downscale'

    const [frameUp, frameDown] = await Promise.all([
      processFromSources(props.sources, props.targetSize, props.flip, 'up'),
      processFromSources(props.sources, props.targetSize, props.flip, 'down'),
    ])
    ;[urlUp.value, urlDown.value] = await Promise.all([
      pixelsToObjectUrl(frameUp.pixels,   props.targetSize, props.targetSize),
      pixelsToObjectUrl(frameDown.pixels, props.targetSize, props.targetSize),
    ])
  } finally {
    loading.value = false
  }
}

function chooseUp() {
  setScalePref(props.cursorId, props.targetSize, 'up')
  emit('close')
}

function chooseDown() {
  setScalePref(props.cursorId, props.targetSize, 'down')
  emit('close')
}

onMounted(render)

onBeforeUnmount(() => {
  if (urlUp.value)   URL.revokeObjectURL(urlUp.value)
  if (urlDown.value) URL.revokeObjectURL(urlDown.value)
})
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">
          Scaling for <span class="size-pill">{{ targetSize }}px</span>
        </span>
        <button class="sm dismiss" @click="emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <p class="hint">
          Both options use nearest-neighbour. Choose which native source to scale from.
        </p>
        <TwoImageChoice
          :label-a="upLabel || 'Upscale'"
          :image-url-a="urlUp"
          sublabel-a="from smaller native"
          action-label-a="Use upscale"
          :label-b="downLabel || 'Downscale'"
          :image-url-b="urlDown"
          sublabel-b="from larger native"
          action-label-b="Use downscale"
          :loading="loading"
          @choose-a="chooseUp"
          @choose-b="chooseDown"
        />
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
  width: 420px;
  max-width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  padding: 12px 16px 10px;
  border-bottom: 1px solid #3d4347;
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-title {
  font-weight: 600;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
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

.dismiss {
  background: transparent;
  color: #7f8c8d;
  border: none;
}
.dismiss:hover { color: #eff0f1; }

.modal-body {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hint {
  font-size: 11px;
  color: #7f8c8d;
  margin: 0;
}
</style>
