<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  /** data URL of the image to display */
  dataUrl: { type: String, default: null },
  /** {x, y} in master image coordinates */
  hotspot: { type: Object, default: null },
  /** {width, height} of the master image */
  dims: { type: Object, default: null },
})

const emit = defineEmits(['hotspot-change'])

const canvas = ref(null)
let _img = null
let _zoom = 1

function render() {
  if (!canvas.value) return
  const ctx = canvas.value.getContext('2d')

  if (!_img || !props.dims) {
    canvas.value.width = 256
    canvas.value.height = 256
    ctx.fillStyle = '#1b1e20'
    ctx.fillRect(0, 0, 256, 256)
    ctx.fillStyle = '#3d4347'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('No image', 128, 128)
    return
  }

  const mw = props.dims.width
  const mh = props.dims.height
  const maxDim = Math.max(mw, mh)
  _zoom = Math.min(8, Math.max(1, Math.floor(240 / maxDim)))

  const cw = mw * _zoom
  const ch = mh * _zoom
  canvas.value.width = cw
  canvas.value.height = ch

  // Checkerboard background (transparency indicator)
  for (let x = 0; x < cw; x += 8) {
    for (let y = 0; y < ch; y += 8) {
      ctx.fillStyle = ((x >> 3) + (y >> 3)) % 2 === 0 ? '#555' : '#888'
      ctx.fillRect(x, y, 8, 8)
    }
  }

  // Draw image — disable smoothing for pixel-perfect zoom
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(_img, 0, 0, cw, ch)

  // Crosshair at hotspot
  if (props.hotspot) {
    const hx = (props.hotspot.x + 0.5) * _zoom
    const hy = (props.hotspot.y + 0.5) * _zoom

    ctx.strokeStyle = '#ff3333'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(hx - 10, hy); ctx.lineTo(hx + 10, hy)
    ctx.moveTo(hx, hy - 10); ctx.lineTo(hx, hy + 10)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(hx - 11, hy); ctx.lineTo(hx + 11, hy)
    ctx.moveTo(hx, hy - 11); ctx.lineTo(hx, hy + 11)
    ctx.stroke()
  }
}

async function loadAndRender() {
  if (!props.dataUrl) {
    _img = null
    render()
    return
  }
  _img = new Image()
  _img.onload = render
  _img.src = props.dataUrl
}

function onClick(e) {
  if (!_img || !props.dims) return
  const rect = canvas.value.getBoundingClientRect()
  const cx = e.clientX - rect.left
  const cy = e.clientY - rect.top
  const scaleX = canvas.value.width / rect.width
  const scaleY = canvas.value.height / rect.height
  const px = Math.floor((cx * scaleX) / _zoom)
  const py = Math.floor((cy * scaleY) / _zoom)
  emit('hotspot-change', {
    x: Math.max(0, Math.min(px, props.dims.width - 1)),
    y: Math.max(0, Math.min(py, props.dims.height - 1)),
  })
}

watch(() => props.dataUrl, loadAndRender, { immediate: true })
watch(() => props.hotspot, render, { deep: true })
onMounted(loadAndRender)
</script>

<template>
  <div class="hotspot-canvas-wrap">
    <canvas ref="canvas" class="hotspot-canvas" @click="onClick" />
    <p class="hint">Click to set hotspot</p>
  </div>
</template>

<style scoped>
.hotspot-canvas-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.hotspot-canvas {
  cursor: crosshair;
  border: 1px solid #3d4347;
  border-radius: 4px;
  image-rendering: pixelated;
  max-width: 100%;
}
.hint {
  font-size: 10px;
  color: #7f8c8d;
}
</style>
