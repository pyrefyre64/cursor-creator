/**
 * Format handler for standard browser-decodable images:
 * PNG, JPEG, WebP, GIF, AVIF, SVG, BMP, etc.
 *
 * Uses the browser's built-in decoding via FileReader + Image element.
 */
export const imageFormatHandler = {
  name: 'Standard Image',
  extensions: [],          // no specific extensions — matched by MIME type
  mimeTypes: ['image/'],   // catches all image/* types

  /**
   * @param {File} file
   * @returns {Promise<{dataUrl:string, hotspot:null, width:number, height:number}>}
   */
  async parse(file) {
    const dataUrl = await _readAsDataUrl(file)
    const { width, height } = await _getImageDims(dataUrl)
    return { dataUrl, hotspot: null, width, height }
  },
}

function _readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve(e.target.result)
    reader.onerror = () => reject(new Error(`Cannot read ${file.name}`))
    reader.readAsDataURL(file)
  })
}

function _getImageDims(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload  = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Failed to load image for dimension check'))
    img.src = dataUrl
  })
}
