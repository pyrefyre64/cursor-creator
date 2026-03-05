<script setup>
/**
 * Animated thumbnail using a canvas that cycles through frames.
 * Loads frame data URLs into Image objects and draws them in sequence
 * respecting each frame's delay value.
 *
 * Falls back to the first frame if only one frame is provided.
 */
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  /** Array of animation frames from ImageEntry.frames */
  frames: { type: Array, required: true },
  /** Pixel dimensions of the source image */
  dims:   { type: Object, required: true },
  /** Rendered canvas size in CSS/pixel units (default: 32) */
  size:   { type: Number, default: 32 },
})

const canvas  = ref(null)
let timer     = null
let frameIdx  = 0
let images    = []
let mounted   = false

async function _loadImages() {
  images = await Promise.all(props.frames.map(f => new Promise(resolve => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = f.data
  })))
}

function _drawNext() {
  if (!mounted || !canvas.value || !images.length) return

  const img = images[frameIdx]
  if (img) {
    const ctx = canvas.value.getContext('2d')
    ctx.clearRect(0, 0, props.size, props.size)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, 0, 0, props.size, props.size)
  }

  const delay = props.frames[frameIdx]?.delay ?? 100
  frameIdx = (frameIdx + 1) % images.length
  timer = setTimeout(_drawNext, delay)
}

async function _start() {
  clearTimeout(timer)
  frameIdx = 0
  await _loadImages()
  _drawNext()
}

onMounted(async () => {
  mounted = true
  await _start()
})

onUnmounted(() => {
  mounted = false
  clearTimeout(timer)
})

watch(() => props.frames, _start, { deep: false })
</script>

<template>
  <canvas
    ref="canvas"
    :width="size"
    :height="size"
    class="anim-thumb"
  />
</template>

<style scoped>
.anim-thumb {
  display: block;
  image-rendering: pixelated;
}
</style>
