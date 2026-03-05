/**
 * Format handler for Linux/X11 Xcursor files.
 *
 * These files are typically extensionless (e.g. `arrow`, `left_ptr`).
 * Detection is via magic bytes "Xcur" = [0x58, 0x63, 0x75, 0x72].
 *
 * Imports the largest available frame size. For animated cursors,
 * the first frame of that size is used.
 */

import { parseXcursorFile } from '../parsers/xcursorParser.js'

export const xcursorFormatHandler = {
  name: 'Xcursor',
  magic: [0x58, 0x63, 0x75, 0x72],

  /** @param {File} file */
  async parse(file) {
    return parseXcursorFile(await file.arrayBuffer())
  },
}
