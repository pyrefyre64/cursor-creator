<script setup>
defineProps({
  /** Label shown above option A's thumbnail */
  labelA:       { type: String, required: true },
  /** Data/object URL for option A */
  imageUrlA:    { type: String, default: null },
  /** Small descriptive text shown below the thumbnail (filename, size, etc.) */
  sublabelA:    { type: String, default: '' },
  /** Button text for option A */
  actionLabelA: { type: String, default: 'Choose' },

  labelB:       { type: String, required: true },
  imageUrlB:    { type: String, default: null },
  sublabelB:    { type: String, default: '' },
  actionLabelB: { type: String, default: 'Choose' },

  /** Show a loading spinner instead of images */
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['choose-a', 'choose-b'])
</script>

<template>
  <div class="two-choice">
    <!-- Option A -->
    <div class="option" @click="emit('choose-a')">
      <div class="thumb-wrap">
        <span v-if="loading" class="spinner" />
        <img v-else-if="imageUrlA" :src="imageUrlA" class="thumb" />
      </div>
      <span class="option-label">{{ labelA }}</span>
      <span v-if="sublabelA" class="option-sub" :title="sublabelA">{{ sublabelA }}</span>
      <button class="sm" @click.stop="emit('choose-a')" :disabled="loading">{{ actionLabelA }}</button>
    </div>

    <div class="vs">vs</div>

    <!-- Option B -->
    <div class="option" @click="emit('choose-b')">
      <div class="thumb-wrap">
        <span v-if="loading" class="spinner" />
        <img v-else-if="imageUrlB" :src="imageUrlB" class="thumb" />
      </div>
      <span class="option-label">{{ labelB }}</span>
      <span v-if="sublabelB" class="option-sub" :title="sublabelB">{{ sublabelB }}</span>
      <button class="sm primary" @click.stop="emit('choose-b')" :disabled="loading">{{ actionLabelB }}</button>
    </div>
  </div>
</template>

<style scoped>
.two-choice {
  display: flex;
  align-items: stretch;
  gap: 8px;
}

.option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: #232629;
  border: 1px solid #31363b;
  border-radius: 5px;
  padding: 8px;
  cursor: pointer;
  transition: border-color 0.1s;
}
.option:hover { border-color: #4d5760; }

.thumb-wrap {
  width: 64px;
  height: 64px;
  background: repeating-conic-gradient(#555 0% 25%, #888 0% 50%) 0 0 / 8px 8px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.thumb {
  max-width: 64px;
  max-height: 64px;
  image-rendering: pixelated;
  display: block;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #3d4347;
  border-top-color: #3daee9;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: block;
}
@keyframes spin { to { transform: rotate(360deg); } }

.option-label {
  font-size: 11px;
  font-weight: 600;
  color: #eff0f1;
}

.option-sub {
  font-size: 10px;
  color: #7f8c8d;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.vs {
  display: flex;
  align-items: center;
  font-size: 11px;
  color: #4d5760;
  font-style: italic;
  flex-shrink: 0;
  padding: 0 2px;
}
</style>
