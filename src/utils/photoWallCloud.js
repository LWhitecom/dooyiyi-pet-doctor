import { supabase } from './supabaseClient.js'
import { createDefaultWallPhotos, resolvePhotoSrc } from './wallAssets.js'

const BUCKET = 'wall-media'
const SIGNED_URL_TTL = 60 * 60
const SIGNED_URL_CACHE_LIFETIME = 55 * 60 * 1000
const AUTH_REQUEST_TIMEOUT_MS = 12 * 1000
const signedUrlCache = new Map()

const withoutRuntimeSrc = (item) => {
  const { src, srcFull, pendingUpload, ...stored } = item
  return stored
}

export async function getCurrentUser() {
  if (!supabase) return null
  // 只读本地 session，首次打开不因弱网认证请求卡在空白启动页。
  const { data: sessionData } = await supabase.auth.getSession()
  return sessionData.session?.user || null
}

export async function signInWithPassword(email, password) {
  const timeout = new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error('LOGIN_NETWORK_TIMEOUT')), AUTH_REQUEST_TIMEOUT_MS)
  })
  const { data, error } = await Promise.race([
    supabase.auth.signInWithPassword({ email, password }),
    timeout,
  ])
  if (error) throw error
  if (!data?.user) throw new Error('登录状态未创建，请重试。')
  return data.user
}

export async function signUpWithEmail(email) {
  const emailRedirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo },
  })
  if (error) throw error
  return data
}

export async function verifySignupCode(email, token, password) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw error
  const { error: passwordError } = await supabase.auth.updateUser({ password })
  if (passwordError) throw passwordError
  return data
}

export async function sendResetCode(email) {
  const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

export async function exchangeRecoverySession() {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
    return data
  }

  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!data.session) throw new Error('重置链接无效或已过期，请重新发送。')
  return data
}

export async function resetPasswordWithCode(password) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

async function signedPhoto(photo, forceRefresh = false) {
  const [signed] = await signedPhotos([photo], forceRefresh)
  return signed
}

async function signedPhotos(photos, forceRefresh = false) {
  const now = Date.now()
  const pathsToSign = [...new Set(photos.flatMap((photo) => [photo.storagePath, photo.storagePathFull]).filter(Boolean))]
    .filter((path) => forceRefresh || !signedUrlCache.has(path) || signedUrlCache.get(path).expiresAt <= now)

  if (pathsToSign.length) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(pathsToSign, SIGNED_URL_TTL)
    if (error) throw error
    data.forEach((item) => {
      if (item.error) throw item.error
      signedUrlCache.set(item.path, { src: item.signedUrl, expiresAt: now + SIGNED_URL_CACHE_LIFETIME })
    })
  }

  return photos.map((photo) => {
    const preview = photo.storagePath && signedUrlCache.get(photo.storagePath)
    const full = photo.storagePathFull && signedUrlCache.get(photo.storagePathFull)
    return { ...photo, ...(preview ? { src: preview.src } : {}), ...(full ? { srcFull: full.src } : {}) }
  })
}

export async function loadCloudWall(userId) {
  const { data, error } = await supabase.from('photo_wall_states').select('photos, stickers, profile_photo, finale_cards, updated_at').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) return null
  const [profilePhoto] = await signedPhotos(data.profile_photo ? [data.profile_photo] : [])
  const finaleCards = await signedPhotos(data.finale_cards || [])
  return {
    photos: await signedPhotos(data.photos || []),
    stickers: data.stickers || [],
    profilePhoto: profilePhoto || null,
    finaleCards,
    updatedAt: data.updated_at || null,
  }
}

export async function refreshCloudMedia(item) {
  if (!item?.storagePath && !item?.storagePathFull) return item
  return signedPhoto(item, true)
}

export async function saveCloudWall(userId, { photos, stickers, profilePhoto = null, finaleCards = [] }) {
  const { error } = await supabase.from('photo_wall_states').upsert({
    user_id: userId,
    photos: photos.map(withoutRuntimeSrc),
    stickers: stickers.map(withoutRuntimeSrc),
    profile_photo: profilePhoto ? withoutRuntimeSrc(profilePhoto) : null,
    finale_cards: finaleCards.map(withoutRuntimeSrc),
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export function subscribeToCloudWall(userId, onChange) {
  if (!supabase) return () => {}
  const channel = supabase
    .channel(`photo-wall:${userId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'photo_wall_states', filter: `user_id=eq.${userId}` }, onChange)
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

async function createThumbnail(file) {
  let image
  let revokeSource = null
  if (typeof createImageBitmap === 'function') {
    image = await createImageBitmap(file)
  } else {
    const source = URL.createObjectURL(file)
    revokeSource = () => URL.revokeObjectURL(source)
    image = await new Promise((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('图片读取失败，请重新选择图片'))
      element.src = source
    })
  }
  const maxSide = 800
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', .72))
  image.close?.()
  revokeSource?.()
  if (!blob) throw new Error('图片压缩失败，请重新选择图片')
  return blob
}

export async function uploadCloudPhoto(file, userId, layout) {
  const thumbnail = await createThumbnail(file)
  const id = crypto.randomUUID()
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const storagePath = `${userId}/${id}.thumb.webp`
  const storagePathFull = `${userId}/${id}.${extension}`
  const { error: thumbnailError } = await supabase.storage.from(BUCKET).upload(storagePath, thumbnail, { contentType: 'image/webp', upsert: false })
  if (thumbnailError) throw thumbnailError
  const { error: fullError } = await supabase.storage.from(BUCKET).upload(storagePathFull, file, { contentType: file.type || 'image/jpeg', upsert: false })
  if (fullError) throw fullError
  const photo = { id, storagePath, storagePathFull, ...layout }
  return signedPhoto(photo)
}

export async function uploadCloudDisplayImage(file, userId, folder) {
  const thumbnail = await createThumbnail(file)
  const id = crypto.randomUUID()
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const storagePath = `${userId}/${folder}/${id}.thumb.webp`
  const storagePathFull = `${userId}/${folder}/${id}.${extension}`
  const { error: thumbnailError } = await supabase.storage.from(BUCKET).upload(storagePath, thumbnail, { contentType: 'image/webp', upsert: false })
  if (thumbnailError) throw thumbnailError
  const { error: fullError } = await supabase.storage.from(BUCKET).upload(storagePathFull, file, { contentType: file.type || 'image/jpeg', upsert: false })
  if (fullError) throw fullError
  return signedPhoto({ id, storagePath, storagePathFull })
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
