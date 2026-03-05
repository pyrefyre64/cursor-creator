/**
 * KDE / X11 cursor role database.
 *
 * Each entry describes one primary cursor role:
 *   id          — primary Xcursor filename (and the canonical name)
 *   label       — human-readable display name
 *   category    — group key
 *   aliases     — additional names written as symlinks in the theme
 *   detect      — regex array for auto-assigning from imported filenames
 *   hotspotHint — rough position hint ('top-left' | 'center' | 'top-right' | ...)
 *   winRole     — Windows registry key name (HKCU\Control Panel\Cursors), if this
 *                 cursor has a direct Windows equivalent. Absence means Linux/web only.
 *                 These 15 roles are also the "simple mode" set.
 *
 * Total named cursors (primary + all aliases) exceeds 70.
 */

export const CATEGORIES = [
  { id: 'pointer',     label: 'Pointer' },
  { id: 'link',        label: 'Link & Selection' },
  { id: 'status',      label: 'Status' },
  { id: 'help',        label: 'Help' },
  { id: 'precision',   label: 'Precision' },
  { id: 'text',        label: 'Text' },
  { id: 'handwriting', label: 'Handwriting' },
  { id: 'unavailable', label: 'Unavailable' },
  { id: 'resize',      label: 'Resize' },
  { id: 'move',        label: 'Move & Scroll' },
  { id: 'dnd',         label: 'Drag & Drop' },
  { id: 'zoom',        label: 'Zoom' },
  { id: 'grab',        label: 'Grab' },
  { id: 'misc',        label: 'Miscellaneous' },
]

/** @type {Array<{id:string, label:string, category:string, aliases:string[], detect:RegExp[], hotspotHint:string}>} */
export const CURSORS = [
  // ── Pointer ────────────────────────────────────────────────────────────────
  {
    id: 'left_ptr',
    label: 'Normal Select',
    winRole: 'Arrow',
    category: 'pointer',
    aliases: [
      'default',
      'arrow',
      'top_left_arrow',
      'ul_angle',
      'e29285e634086352946a0e7090d73106',
      'normal_select'
    ],
    detect: [/left[_-]?ptr/i, /normal[_-]?select/i, /\barrow\b/i, /\bdefault\b/i],
    hotspotHint: 'top-left',
  },
  {
    id: 'right_ptr',
    label: 'Right Pointer',
    category: 'pointer',
    aliases: ['right_arrow'],
    detect: [/right[_-]?ptr/i, /right[_-]?arrow/i],
    hotspotHint: 'top-right',
  },

  // ── Link & Selection ────────────────────────────────────────────────────────
  {
    id: 'hand2',
    label: 'Link Select',
    winRole: 'Hand',
    category: 'link',
    aliases: [
      'pointer', 'hand', 'hand1', 'pointing_hand',
      '9d800788f1b08800ae810202380a0822',
      'd9ce0ab605698f320427677b458ad60b',
    ],
    detect: [/hand[12]/i, /\bpointer\b/i, /link[\s_-]?select/i, /pointing/i, /finger/i],
    hotspotHint: 'finger-tip',
  },

  // ── Status ─────────────────────────────────────────────────────────────────
  {
    id: 'watch',
    label: 'Busy',
    winRole: 'Wait',
    category: 'status',
    aliases: ['wait', 'clock', 'f29f11e539c5f3b21f0f5f1d45c01051'],
    detect: [/\bwatch\b/i, /\bwait\b/i, /\bclock\b/i, /\bbusy\b/i],
    hotspotHint: 'center',
  },
  {
    id: 'left_ptr_watch',
    label: 'Working in Background',
    winRole: 'AppStarting',
    category: 'status',
    aliases: ['08e8e1c95fe2fc01f976f1e063a24ccd', '3ecb610c1bf2410f44200f48c40d3599'],
    detect: [/left[_-]?ptr[_-]?watch/i, /working/i, /app[_-]?starting/i, /background/i],
    hotspotHint: 'top-left',
  },
  {
    id: 'progress',
    label: 'Progress',
    category: 'status',
    aliases: ['half-busy'],
    detect: [/\bprogress\b/i],
    hotspotHint: 'top-left',
  },

  // ── Help ───────────────────────────────────────────────────────────────────
  {
    id: 'help',
    label: 'Help Select',
    winRole: 'Help',
    category: 'help',
    aliases: [
      'question_arrow',
      '5c6cd98b3f3ebcb1f9af7d597d428b62',
    ],
    detect: [/\bhelp\b/i, /question/i, /what[_-]?cursor/i],
    hotspotHint: 'top-left',
  },

  // ── Precision ──────────────────────────────────────────────────────────────
  {
    id: 'crosshair',
    label: 'Precision Select',
    winRole: 'Crosshair',
    category: 'precision',
    aliases: ['cross', 'plus', 'tcross', 'diamond_cross'],
    detect: [/crosshair/i, /\bprecision\b/i, /\btcross\b/i, /\bcross\b/i],
    hotspotHint: 'center',
  },

  // ── Text ───────────────────────────────────────────────────────────────────
  {
    id: 'xterm',
    label: 'Text Select',
    winRole: 'IBeam',
    category: 'text',
    aliases: ['text', 'ibeam'],
    detect: [/xterm/i, /\btext\b/i, /ibeam/i, /i[_-]?beam/i],
    hotspotHint: 'center',
  },
  {
    id: 'vertical-text',
    label: 'Vertical Text',
    category: 'text',
    aliases: ['vertical_text'],
    detect: [/vertical[_-]?text/i],
    hotspotHint: 'center',
  },

  // ── Handwriting ────────────────────────────────────────────────────────────
  {
    id: 'pencil',
    label: 'Handwriting',
    winRole: 'NWPen',
    category: 'handwriting',
    aliases: [],
    detect: [/pencil/i, /handwriting/i, /\bpen\b/i],
    hotspotHint: 'top-left',
  },

  // ── Unavailable ────────────────────────────────────────────────────────────
  {
    id: 'not-allowed',
    label: 'Unavailable',
    winRole: 'No',
    category: 'unavailable',
    aliases: ['crossed_circle', 'circle', 'forbidden', '03b6e0fcb3499374a867c041f52298f0'],
    detect: [/not[_-]?allow/i, /unavailable/i, /forbid/i, /crossed[_-]?circle/i],
    hotspotHint: 'center',
  },
  {
    id: 'no-drop',
    label: 'No Drop',
    category: 'unavailable',
    aliases: ['dnd-no-drop', 'c7088f0f3e6c8088236ef8e1e3e70000'],
    detect: [/no[_-]?drop/i, /dnd[_-]?no/i],
    hotspotHint: 'center',
  },

  // ── Resize ─────────────────────────────────────────────────────────────────
  {
    id: 'ew-resize',
    label: 'Horizontal Resize',
    winRole: 'SizeWE',
    category: 'resize',
    aliases: ['sb_h_double_arrow', 'h_double_arrow', 'size_hor', '1ab6223944d28fd11d49c6a2c6f8998b'],
    detect: [/ew[_-]?resize/i, /horiz.*resize/i, /size[_-]?hor/i, /h[_-]?double[_-]?arrow/i],
    hotspotHint: 'center',
  },
  {
    id: 'col-resize',
    label: 'Column Resize',
    category: 'resize',
    aliases: ['3085a0e285430894940527032f8b26df'],
    detect: [/col[_-]?resize/i],
    hotspotHint: 'center',
  },
  {
    id: 'ns-resize',
    label: 'Vertical Resize',
    winRole: 'SizeNS',
    category: 'resize',
    aliases: ['sb_v_double_arrow', 'v_double_arrow', 'size_ver', '2870a09082c103050810ffdffffe0204', 'c07385c7190e701020ff7ffffd08103c'],
    detect: [/ns[_-]?resize/i, /vert.*resize/i, /size[_-]?ver/i, /v[_-]?double[_-]?arrow/i],
    hotspotHint: 'center',
  },
  {
    id: 'row-resize',
    label: 'Row Resize',
    category: 'resize',
    aliases: ['6407b0e523e9f812db0d7db2178c72d4'],
    detect: [/row[_-]?resize/i],
    hotspotHint: 'center',
  },
  {
    id: 'nwse-resize',
    label: 'Diagonal Resize ↖↘',
    winRole: 'SizeNWSE',
    category: 'resize',
    aliases: [
      'size_fdiag',
      'bd_double_arrow',
      'nwse_double_arrow',
      'diagonal_resize_1'
    ],
    detect: [/nwse[_-]?resize/i, /size[_-]?fdiag/i, /bd[_-]?double/i, /\bnwse\b/i, /fdiag/i],
    hotspotHint: 'center',
  },
  {
    id: 'nesw-resize',
    label: 'Diagonal Resize ↗↙',
    winRole: 'SizeNESW',
    category: 'resize',
    aliases: [
      'size_bdiag', 
      'fd_double_arrow', 
      'nesw_double_arrow',
      'diagonal_resize_2'
    ],
    detect: [/nesw[_-]?resize/i, /size[_-]?bdiag/i, /fd[_-]?double/i, /\bnesw\b/i, /bdiag/i],
    hotspotHint: 'center',
  },
  {
    id: 'n-resize',
    label: 'North Resize',
    category: 'resize',
    aliases: ['top_side', 'top_tee'],
    detect: [/\bn[_-]resize\b/i, /\bnorth[_-]?resize\b/i, /top[_-]?side\b/i],
    hotspotHint: 'center',
  },
  {
    id: 's-resize',
    label: 'South Resize',
    category: 'resize',
    aliases: ['bottom_side', 'bottom_tee'],
    detect: [/\bs[_-]resize\b/i, /\bsouth[_-]?resize\b/i, /bottom[_-]?side\b/i],
    hotspotHint: 'center',
  },
  {
    id: 'e-resize',
    label: 'East Resize',
    category: 'resize',
    aliases: ['right_side'],
    detect: [/\be[_-]resize\b/i, /\beast[_-]?resize\b/i, /right[_-]?side\b/i],
    hotspotHint: 'center',
  },
  {
    id: 'w-resize',
    label: 'West Resize',
    category: 'resize',
    aliases: ['left_side'],
    detect: [/\bw[_-]resize\b/i, /\bwest[_-]?resize\b/i, /left[_-]?side\b/i],
    hotspotHint: 'center',
  },
  {
    id: 'ne-resize',
    label: 'Northeast Resize',
    category: 'resize',
    aliases: ['top_right_corner', 'ur_angle'],
    detect: [/\bne[_-]resize\b/i, /top[_-]?right[_-]?corner/i, /northeast[_-]?resize/i],
    hotspotHint: 'center',
  },
  {
    id: 'nw-resize',
    label: 'Northwest Resize',
    category: 'resize',
    aliases: ['top_left_corner'],
    detect: [/\bnw[_-]resize\b/i, /top[_-]?left[_-]?corner/i, /northwest[_-]?resize/i],
    hotspotHint: 'center',
  },
  {
    id: 'se-resize',
    label: 'Southeast Resize',
    category: 'resize',
    aliases: ['bottom_right_corner', 'lr_angle'],
    detect: [/\bse[_-]resize\b/i, /bottom[_-]?right[_-]?corner/i, /southeast[_-]?resize/i],
    hotspotHint: 'center',
  },
  {
    id: 'sw-resize',
    label: 'Southwest Resize',
    category: 'resize',
    aliases: ['bottom_left_corner', 'll_angle'],
    detect: [/\bsw[_-]resize\b/i, /bottom[_-]?left[_-]?corner/i, /southwest[_-]?resize/i],
    hotspotHint: 'center',
  },

  // ── Move & Scroll ──────────────────────────────────────────────────────────
  {
    id: 'fleur',
    label: 'Move',
    winRole: 'SizeAll',
    category: 'move',
    aliases: ['move', 'all-scroll', 'size_all', '00000000000000020006000e7e9ffc3f'],
    detect: [/\bfleur\b/i, /\bmove\b/i, /all[_-]?scroll/i, /size[_-]?all/i],
    hotspotHint: 'center',
  },
  {
    id: 'sb_up_arrow',
    label: 'Alternate Select',
    winRole: 'UpArrow',
    category: 'move',
    aliases: ['up_arrow', 'center_ptr'],
    detect: [/up[_-]?arrow/i, /sb[_-]?up/i, /center[_-]?ptr/i, /alternate/i],
    hotspotHint: 'top-center',
  },

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  {
    id: 'copy',
    label: 'Copy',
    category: 'dnd',
    aliases: ['dnd-copy', '1081e37283d90000800003c07f3ef6bf', 'b8e0e337f8ef5f93a3d96c56f7841765'],
    detect: [/\bcopy\b/i, /dnd[_-]?copy/i],
    hotspotHint: 'top-left',
  },
  {
    id: 'alias',
    label: 'Link / Alias',
    category: 'dnd',
    aliases: ['dnd-link', 'a2a266d0498c3104214a47bd64ab0fc8', '640fb0e74195791501fd1ed57b41487f'],
    detect: [/\balias\b/i, /dnd[_-]?link/i, /\blink\b/i],
    hotspotHint: 'top-left',
  },
  {
    id: 'dnd-move',
    label: 'DnD Move',
    category: 'dnd',
    aliases: ['4498f0e0c1937ffe01fd06f973665830'],
    detect: [/dnd[_-]?move/i],
    hotspotHint: 'top-left',
  },
  {
    id: 'dnd-none',
    label: 'DnD None',
    category: 'dnd',
    aliases: [],
    detect: [/dnd[_-]?none/i],
    hotspotHint: 'top-left',
  },

  // ── Zoom ───────────────────────────────────────────────────────────────────
  {
    id: 'zoom-in',
    label: 'Zoom In',
    category: 'zoom',
    aliases: ['zoom_in'],
    detect: [/zoom[_-]?in/i],
    hotspotHint: 'center',
  },
  {
    id: 'zoom-out',
    label: 'Zoom Out',
    category: 'zoom',
    aliases: ['zoom_out'],
    detect: [/zoom[_-]?out/i],
    hotspotHint: 'center',
  },

  // ── Grab ───────────────────────────────────────────────────────────────────
  {
    id: 'grab',
    label: 'Grab',
    category: 'grab',
    aliases: ['openhand', 'hand_grab'],
    detect: [/\bgrab\b/i, /open[_-]?hand/i],
    hotspotHint: 'center',
  },
  {
    id: 'grabbing',
    label: 'Grabbing',
    category: 'grab',
    aliases: ['closedhand', 'hand_grabbing'],
    detect: [/grabbing/i, /closed[_-]?hand/i],
    hotspotHint: 'center',
  },

  // ── Miscellaneous ──────────────────────────────────────────────────────────
  {
    id: 'cell',
    label: 'Cell Selection',
    category: 'misc',
    aliases: [],
    detect: [/\bcell\b/i],
    hotspotHint: 'center',
  },
  {
    id: 'context-menu',
    label: 'Context Menu',
    category: 'misc',
    aliases: ['context_menu'],
    detect: [/context[_-]?menu/i],
    hotspotHint: 'top-left',
  },
  {
    id: 'X_cursor',
    label: 'X Root Cursor',
    category: 'misc',
    aliases: ['x-cursor'],
    detect: [/\bX_cursor\b/i, /\bx[_-]?cursor\b/i],
    hotspotHint: 'center',
  },
]

// ── Derived lookups ──────────────────────────────────────────────────────────

/** Map from cursor id → cursor object */
export const CURSOR_BY_ID = Object.fromEntries(CURSORS.map(c => [c.id, c]))

/** Map from category id → cursor objects array */
export const CURSORS_BY_CATEGORY = Object.fromEntries(
  CATEGORIES.map(cat => [cat.id, CURSORS.filter(c => c.category === cat.id)])
)

/**
 * Get a cursor by its primary id.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getCursorById(id) {
  return CURSOR_BY_ID[id]
}

/**
 * Try to detect a cursor role from a filename base (no extension).
 * Returns the primary cursor id or null.
 * @param {string} basename
 * @returns {string|null}
 */
export function detectCursorFromFilename(basename) {
  const lower = basename.toLowerCase().replace(/[^a-z0-9_\-]/g, '_')
  // Strip trailing size suffix produced by PNG export (e.g. watch_32 → watch)
  const stemmed = lower.replace(/_\d+$/, '')

  // 1. Exact match on primary id
  if (CURSOR_BY_ID[basename]) return basename
  if (CURSOR_BY_ID[lower]) return lower
  if (stemmed !== lower && CURSOR_BY_ID[stemmed]) return stemmed

  // 2. Exact match on aliases
  for (const cursor of CURSORS) {
    if (cursor.aliases.some(a => a.toLowerCase() === lower)) return cursor.id
  }
  if (stemmed !== lower) {
    for (const cursor of CURSORS) {
      if (cursor.aliases.some(a => a.toLowerCase() === stemmed)) return cursor.id
    }
  }

  // 3. Pattern matching
  for (const cursor of CURSORS) {
    if (cursor.detect.some(re => re.test(basename))) return cursor.id
  }
  if (stemmed !== lower) {
    for (const cursor of CURSORS) {
      if (cursor.detect.some(re => re.test(stemmed))) return cursor.id
    }
  }

  return null
}
