import { createApp } from 'vue'
import App from './App.vue'
import './global.css'

// ── Register format handlers (add new formats here) ──────────────────────────
import { registerFormatHandler } from './lib/formatRegistry.js'
import { imageFormatHandler }   from './lib/formats/imageFormat.js'
import { windowsCursorFormatHandler } from './lib/formats/windowsCursorFormat.js'
import { xcursorFormatHandler }       from './lib/formats/xcursorFormat.js'

registerFormatHandler(imageFormatHandler)
registerFormatHandler(windowsCursorFormatHandler)
registerFormatHandler(xcursorFormatHandler)
// ─────────────────────────────────────────────────────────────────────────────

createApp(App).mount('#app')
