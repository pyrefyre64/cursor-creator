/**
 * Format handler for Windows cursor files:
 *   .cur — static cursor (ICO-like with hotspot)
 *   .ani — animated cursor (RIFF/ACON; imports first frame only)
 *
 * Hotspot coordinates are extracted directly from the file and
 * pre-populated in the imported image entry.
 */
import { parseCursorFile } from '../cursorFileParser.js'

export const cursorFormatHandler = {
  name: 'Windows Cursor',
  extensions: ['cur', 'ani'],

  /**
   * @param {File} file
   * @returns {Promise<{dataUrl:string, hotspot:{x:number,y:number}|null, width:number, height:number}>}
   */
  async parse(file) {
    const buffer = await file.arrayBuffer()
    return parseCursorFile(buffer, file.name)
  },
}
