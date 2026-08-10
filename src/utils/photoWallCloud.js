import { supabase } from './supabaseClient.js'
import { createDefaultWallPhotos, resolvePhotoSrc } from './wallAssets.js'

const BUCKET = 'wall-media'

const withoutRuntimeSrc = (item) => {
  const { src, ...stored } = item
  return stored
}

export async function getCurrentUser() {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user || null
}

export async function signInWithPassword(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signUpWithPassword(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

async function signedPhoto(photo) {
  if (!photo.storagePath) return photo
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(photo.storagePath, 60 * 60)
  if (error) throw error
  return { ...photo, src: data.signedUrl }
}

export async function loadCloudWall(userId) {
  const { data, error } = await supabase.from('photo_wall_states').select('photos, stickers').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) return null
  return { photos: await Promise.all((data.photos || []).map(signedPhoto)), stickers: data.stickers || [] }
}

export async function saveCloudWall(userId, { photos, stickers }) {
  const { error } = await supabase.from('photo_wall_states').upsert({
    user_id: userId,
    photos: photos.map(withoutRuntimeSrc),
    stickers: stickers.map(withoutRuntimeSrc),
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

async function compressImage(file) {
  const image = await createImageBitmap(file)
  const maxSide = 1600
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', .82))
  image.close()
  if (!blob) throw new Error('图片压缩失败，请重新选择图片')
  return blob
}

export async function uploadCloudPhoto(file, userId, layout) {
  const blob = await compressImage(file)
  const id = crypto.randomUUID()
  const storagePath = `${userId}/${id}.webp`
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, blob, { contentType: 'image/webp', upsert: false })
  if (error) throw error
  const photo = { id, storagePath, ...layout }
  return signedPhoto(photo)
}

export async function migrateLocalWall(userId, wall) {
  const photos = []
  for (const photo of wall.photos || createDefaultWallPhotos()) {
    if (photo.storagePath || photo.assetId || String(photo.id).startsWith('seed-')) {
      photos.push({ ...photo, assetId: photo.assetId || photo.id, src: undefined })
      continue
    }
    if (String(photo.src || '').startsWith('data:image/')) {
      const blob = await (await fetch(photo.src)).blob()
      photos.push(await uploadCloudPhoto(new File([blob], 'photo'), userId, { x: photo.x, y: photo.y, r: photo.r }))
    }
  }
  return { photos: photos.length ? photos : createDefaultWallPhotos(), stickers: wall.stickers || [] }
}

export function fallbackWall() {
  return { photos: createDefaultWallPhotos().map((photo) => ({ ...photo, src: resolvePhotoSrc(photo) })), stickers: [] }
}
