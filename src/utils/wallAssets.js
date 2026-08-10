import photo1 from '../assets/photos/本人照片1.jpg'
import photo2 from '../assets/photos/本人照片2.jpg'
import photo3 from '../assets/photos/本人照片3.jpg'
import photo4 from '../assets/photos/本人照片4.jpg'

const seedPhotos = { 'seed-0': photo1, 'seed-1': photo2, 'seed-2': photo3, 'seed-3': photo4 }
const stickerModules = import.meta.glob('../assets/stickers/*.{png,webp,svg}', { eager: true, import: 'default', query: '?url' })

export const builtInStickers = Object.entries(stickerModules)
  .map(([path, src]) => ({ src, assetId: path.split('/').pop().replace(/\.[^.]+$/, ''), name: path.split('/').pop().replace(/\.[^.]+$/, '') }))
  .filter((sticker) => sticker.name.startsWith('贴纸'))
  .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true }))

export function createDefaultWallPhotos() {
  return [
    { id: 'seed-0', assetId: 'seed-0', x: 6, y: 8, r: -5 },
    { id: 'seed-1', assetId: 'seed-1', x: 52, y: 14, r: 4 },
    { id: 'seed-2', assetId: 'seed-2', x: 18, y: 43, r: 3 },
    { id: 'seed-3', assetId: 'seed-3', x: 61, y: 58, r: -3 },
  ]
}

export function resolvePhotoSrc(photo) {
  const assetId = photo.assetId || photo.id
  return seedPhotos[assetId] || photo.src || ''
}

export function resolveStickerSrc(sticker) {
  return builtInStickers.find((item) => item.assetId === sticker.assetId || item.name === sticker.name)?.src || sticker.src || ''
}
