import { createApp } from 'vue'
import App from './App.vue'
import './global.css'

// ── Register format handlers (add new formats here) ──────────────────────────
import { registerFormatHandler } from './lib/formatRegistry.js'
import { imageFormatHandler }  from './lib/formats/imageFormat.js'
import { cursorFormatHandler } from './lib/formats/cursorFormat.js'

registerFormatHandler(imageFormatHandler)
registerFormatHandler(cursorFormatHandler)
// ─────────────────────────────────────────────────────────────────────────────

createApp(App).mount('#app')
