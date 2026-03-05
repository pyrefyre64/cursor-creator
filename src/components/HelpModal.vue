<script setup>
import { ref } from 'vue'
import { ui } from '../store/project.js'

const tab = ref('howto')
</script>

<template>
  <div class="overlay" @click.self="ui.showHelp = false">
    <div class="modal">
      <div class="modal-header">
        <div class="tabs">
          <button class="tab" :class="{ active: tab === 'howto' }" @click="tab = 'howto'">How to Use</button>
          <button class="tab" :class="{ active: tab === 'about' }" @click="tab = 'about'">About</button>
        </div>
        <button class="close-btn" @click="ui.showHelp = false" title="Close">✕</button>
      </div>

      <div class="modal-body">

        <!-- ── HOW TO USE ──────────────────────────────────────── -->
        <div v-if="tab === 'howto'" class="tab-content">
          <p class="intro">
            The app has three panels: <strong>Image Pool</strong> (left),
            <strong>Assignment Grid</strong> (centre), and <strong>Cursor Editor</strong> (right).
          </p>

          <ol class="steps">
            <li>
              <strong>Name your theme</strong>
              <p>Type a theme name in the Project Bar. This becomes the folder name inside the exported archive.</p>
            </li>
            <li>
              <strong>Import images</strong>
              <p>
                Click <em>Import</em> in the Image Pool or drag files onto it.
                Accepted: PNG, JPEG, WebP, BMP — and cursor files (<code>.cur</code>, <code>.ani</code>, Xcursor).
                Files with recognisable names (e.g. <code>left_ptr.png</code>, <code>IBeam.cur</code>) are
                automatically assigned to the matching cursor role.
              </p>
            </li>
            <li>
              <strong>Assign images to cursor roles</strong>
              <p>
                Drag a thumbnail from the Image Pool and drop it onto a slot in the Assignment Grid.
                A new size is added as an additional native source; the same size triggers a conflict
                dialog so you can keep or replace the existing one.
              </p>
            </li>
            <li>
              <strong>Edit the hotspot</strong>
              <p>
                Click any assigned slot to open the Cursor Editor. Click anywhere on the zoomed pixel
                canvas to place the hotspot. The coordinate scales proportionally across all output sizes.
              </p>
            </li>
            <li>
              <strong>Choose output sizes</strong>
              <p>Toggle the size buttons in the Project Bar (24 / 32 / 48 / 64 / 96 px).</p>
            </li>
            <li>
              <strong>Add per-size sources (optional)</strong>
              <p>
                Drag images from the pool onto the Cursor Editor's sources list, or click
                <em>+ Add</em> to import a file directly linked to that role.
                The export preview shows which source and method (native / NN upscale / NN downscale /
                bilinear) will be used for each output size.
                Use the <strong>⇅</strong> button when both NN directions are available to compare
                them side-by-side.
              </p>
            </li>
            <li>
              <strong>Simple / Full mode</strong>
              <p>
                The toggle in the Assignment Grid switches between 15 common Windows roles
                (<em>Simple</em>) and the full set of 37 X11/KDE roles (<em>Full</em>).
              </p>
            </li>
            <li>
              <strong>Save your project</strong>
              <p>
                Click <em>Save Project</em> to download a <code>.json</code> file with all images
                embedded. Reload it any time with <em>Load Project</em>.
              </p>
            </li>
            <li>
              <strong>Export</strong>
              <p>
                Click <em>Export .tar.gz</em> for KDE/X11 (installable via
                <em>Plasma Settings → Cursors → Install from file…</em>).
                Use the <strong>▾</strong> dropdown for Windows cursors, raw PNGs, CSS, or APNG.
              </p>
            </li>
          </ol>
        </div>

        <!-- ── ABOUT ──────────────────────────────────────────── -->
        <div v-if="tab === 'about'" class="tab-content about">
          <p>
            <strong>Cursor Creator</strong> is a pure client-side web app for building KDE/X11 and
            Windows cursor themes from your own images.
            No account, no server, no uploads — everything runs in the browser.
          </p>

          <div class="links">
            <a href="https://github.com/Pyrefyre64/cursor-creator" target="_blank" rel="noopener">GitHub →</a>
          </div>

          <p>
            I made this because I wanted a utility to change some Windows .ani cursor files into a format I could install on my Linux distro with KDE Plasma.
            Lo and behold, AI makes it really easy to over-engineer a solution.
            But by making this work with all sorts of file types and many other extra bells and whistles, I hope this can be useful to anyone who comes across it.
          </p>
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
  width: 560px;
  max-width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #3d4347;
  flex-shrink: 0;
}

.tabs {
  display: flex;
  flex: 1;
}

.tab {
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 500;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  color: #7f8c8d;
  cursor: pointer;
  margin-bottom: -1px;
  transition: color 0.15s;
}
.tab:hover { color: #eff0f1; background: transparent; }
.tab.active {
  color: #3daee9;
  border-bottom-color: #3daee9;
  background: transparent;
}

.close-btn {
  margin-right: 10px;
  padding: 4px 8px;
  font-size: 12px;
  background: transparent;
  border: none;
  color: #7f8c8d;
  cursor: pointer;
  border-radius: 4px;
  line-height: 1;
}
.close-btn:hover { color: #eff0f1; background: #31363b; }

.modal-body {
  overflow-y: auto;
  padding: 18px 20px 20px;
}

.tab-content {
  font-size: 13px;
  line-height: 1.6;
  color: #eff0f1;
}

.intro {
  margin: 0 0 14px;
  color: #bdc3c7;
}

/* How to Use */
.steps {
  margin: 0;
  padding-left: 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.steps li {
  padding-left: 4px;
}
.steps li > strong {
  display: block;
  color: #eff0f1;
  margin-bottom: 2px;
}
.steps li p {
  margin: 0;
  color: #bdc3c7;
}
.steps code {
  font-family: monospace;
  font-size: 11px;
  background: #1b1e20;
  border: 1px solid #3d4347;
  padding: 1px 4px;
  border-radius: 3px;
  color: #3daee9;
}

/* About */
.about h3 {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #7f8c8d;
  margin: 16px 0 6px;
}
.about p {
  margin: 0 0 8px;
  color: #bdc3c7;
}
.about ul {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #bdc3c7;
}
.about code {
  font-family: monospace;
  font-size: 11px;
  background: #1b1e20;
  border: 1px solid #3d4347;
  padding: 1px 4px;
  border-radius: 3px;
  color: #3daee9;
}
.links {
  margin: 18px 0;
  display: flex;
  gap: 12px;
}
.links a {
  color: #3daee9;
  text-decoration: none;
  font-size: 13px;
}
.links a:hover { text-decoration: underline; }
</style>
