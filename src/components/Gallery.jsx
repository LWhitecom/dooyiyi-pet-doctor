import { useEffect, useMemo, useRef, useState } from 'react'
import '../styles/gallery.css'
import CloudSyncPanel from './CloudSyncPanel.jsx'
import { builtInStickers, resolvePhotoSrc, resolveStickerSrc } from '../utils/wallAssets.js'

const POSITION_STORAGE_KEY = 'pet-doctor-wall-positions'
const DRAG_THRESHOLD = 10
const WALL_PADDING = 4
function Gallery({ photos, onPhotosChange, stickers, onStickersChange, onPhotoUpload, syncUser, syncStatus, onSignIn, onSignUp, onSignOut }) {
  const [active, setActive] = useState(null)
  const [drag, setDrag] = useState(null)
  const [trashActive, setTrashActive] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const input = useRef()
  const wallRef = useRef(null)
  const trashRef = useRef(null)
  const gestureRef = useRef(null)
  const justDraggedRef = useRef(false)
  const full = photos.length >= 15

  useEffect(() => () => clearTimeout(gestureRef.current?.timer), [])

  useEffect(() => {
    const positions = Object.fromEntries(photos.map(({ id, x, y }) => [id, { x, y }]))
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(positions))
  }, [photos])

  const addPhoto = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (full) return window.alert('照片墙已满，请先删除一张照片~')
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return window.alert('请选择 5MB 内的图片')
    onPhotoUpload(file).catch((error) => window.alert(error.message || '上传失败，请稍后重试'))
  }

  const addSticker = (sticker) => {
    onStickersChange((items) => [...items, { id: crypto.randomUUID(), assetId: sticker.assetId, name: sticker.name, x: 44 + Math.random() * 14, y: 42 + Math.random() * 15, r: -10 + Math.random() * 20 }])
    setPickerOpen(false)
  }

  const current = photos.findIndex((photo) => photo.id === active)
  const remove = () => {
    if (!window.confirm('确定删除这张照片吗？')) return
    onPhotosChange((items) => items.filter((photo) => photo.id !== active))
    setActive(null)
  }

  const isOverTrash = (clientX, clientY) => {
    const trash = trashRef.current?.getBoundingClientRect()
    return Boolean(trash && clientX >= trash.left && clientX <= trash.right && clientY >= trash.top && clientY <= trash.bottom)
  }

  const clearPointerListeners = () => {
    window.removeEventListener('pointermove', movePointer)
    window.removeEventListener('pointerup', endPointer)
    window.removeEventListener('pointercancel', endPointer)
    window.removeEventListener('mouseup', endMousePointer)
  }

  const endMousePointer = (event) => {
    const gesture = gestureRef.current
    if (!gesture) return
    endPointer({ pointerId: gesture.pointerId, clientX: event.clientX, clientY: event.clientY, type: 'pointerup' })
  }

  const startPointer = (event, item, kind) => {
    if (event.button !== undefined && event.button !== 0) return
    const node = event.currentTarget
    const wall = wallRef.current
    if (!wall) return
    node.setPointerCapture?.(event.pointerId)
    const timer = window.setTimeout(() => {
      if (gestureRef.current && !gestureRef.current.dragging) gestureRef.current.held = true
    }, 300)
    gestureRef.current = { id: item.id, kind, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, baseLeft: node.offsetLeft, baseTop: node.offsetTop, node, wall, dragging: false, held: false, timer, nextLeft: node.offsetLeft, nextTop: node.offsetTop }
    window.addEventListener('pointermove', movePointer)
    window.addEventListener('pointerup', endPointer)
    window.addEventListener('pointercancel', endPointer)
    window.addEventListener('mouseup', endMousePointer)
  }

  const movePointer = (event) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    const dx = event.clientX - gesture.startX
    const dy = event.clientY - gesture.startY
    if (!gesture.dragging && Math.hypot(dx, dy) <= DRAG_THRESHOLD) return
    clearTimeout(gesture.timer)
    clearPointerListeners()
    gesture.dragging = true
    const maxLeft = Math.max(WALL_PADDING, gesture.wall.clientWidth - gesture.node.offsetWidth - WALL_PADDING)
    const maxTop = Math.max(WALL_PADDING, gesture.wall.clientHeight - gesture.node.offsetHeight - WALL_PADDING)
    gesture.nextLeft = Math.max(WALL_PADDING, Math.min(gesture.baseLeft + dx, maxLeft))
    gesture.nextTop = Math.max(WALL_PADDING, Math.min(gesture.baseTop + dy, maxTop))
    setDrag({ id: gesture.id, kind: gesture.kind, offsetX: gesture.nextLeft - gesture.baseLeft, offsetY: gesture.nextTop - gesture.baseTop })
    if (gesture.kind === 'sticker') setTrashActive(isOverTrash(event.clientX, event.clientY))
  }

  const endPointer = (event) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    clearTimeout(gesture.timer)
    gesture.node.releasePointerCapture?.(event.pointerId)
    if (gesture.dragging) {
      justDraggedRef.current = true
      const deleteSticker = gesture.kind === 'sticker' && event.type === 'pointerup' && isOverTrash(event.clientX, event.clientY)
      if (deleteSticker) onStickersChange((items) => items.filter((item) => item.id !== gesture.id))
      else {
        const update = (items) => items.map((item) => item.id === gesture.id ? { ...item, x: (gesture.nextLeft / gesture.wall.clientWidth) * 100, y: (gesture.nextTop / gesture.wall.clientHeight) * 100 } : item)
        if (gesture.kind === 'photo') onPhotosChange(update)
        else onStickersChange(update)
      }
      setDrag(null)
      setTrashActive(false)
    }
    gestureRef.current = null
  }

  const openPhoto = (id) => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false
      return
    }
    setActive(id)
  }

  return <section id="gallery" className="gallery-section bg-star-rays">
    <header className="gallery-head">
      <div><p>memories on my wall</p><h2>My Photo Wall</h2></div>
      <div className="gallery-actions"><CloudSyncPanel user={syncUser} status={syncStatus} onSignIn={onSignIn} onSignUp={onSignUp} onSignOut={onSignOut} /><button type="button" className="sticker-button" onClick={() => setPickerOpen((open) => !open)}>✦ 贴纸</button><button type="button" onClick={() => full ? window.alert('已满 15 张，请先删除一张照片~') : input.current.click()}>＋ 添加</button></div>
      <input ref={input} type="file" accept="image/*" onChange={addPhoto} />
    </header>
    <p className={full ? 'gallery-count full' : 'gallery-count'}>{photos.length}/15</p>
    {pickerOpen && <div className="sticker-picker" role="dialog" aria-label="选择贴纸">
      <strong>选择一枚贴纸</strong>
      {builtInStickers.length ? <div className="sticker-grid">{builtInStickers.map((sticker) => <button type="button" key={sticker.src} onClick={() => addSticker(sticker)}><img src={sticker.src} alt={sticker.name} /></button>)}</div> : <p>贴纸素材准备好后会显示在这里 ✦</p>}
    </div>}
    <div className={`gallery-wall ${drag ? 'is-dragging' : ''}`} ref={wallRef}>
      {photos.map((photo, index) => {
        const isDragging = drag?.id === photo.id
        return <button className={`wall-photo ${isDragging ? 'dragging' : ''}`} key={photo.id} onPointerDown={(event) => startPointer(event, photo, 'photo')} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={endPointer} onClick={() => openPhoto(photo.id)} style={{ left: `${photo.x}%`, top: `${photo.y}%`, '--rotation': `${photo.r}deg`, '--drag-x': `${isDragging ? drag.offsetX : 0}px`, '--drag-y': `${isDragging ? drag.offsetY : 0}px` }}><span className="pin" /><img src={resolvePhotoSrc(photo)} alt={`照片 ${index + 1}`} decoding="async" onError={(event) => { event.currentTarget.alt = '图片加载失败' }} /><em>2026 · memory</em></button>
      })}
      {stickers.map((sticker) => {
        const isDragging = drag?.id === sticker.id
        return <button className={`wall-sticker ${isDragging ? 'dragging' : ''}`} key={sticker.id} onPointerDown={(event) => startPointer(event, sticker, 'sticker')} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={endPointer} aria-label={`贴纸 ${sticker.name || ''}`} style={{ left: `${sticker.x}%`, top: `${sticker.y}%`, '--rotation': `${sticker.r}deg`, '--drag-x': `${isDragging ? drag.offsetX : 0}px`, '--drag-y': `${isDragging ? drag.offsetY : 0}px` }}><img src={resolveStickerSrc(sticker)} alt="" loading="lazy" decoding="async" /></button>
      })}
    </div>
    {drag?.kind === 'sticker' && <div ref={trashRef} className={`sticker-trash ${trashActive ? 'is-active' : ''}`} role="status" aria-label="将贴纸拖到这里删除"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8m-6 0V2h4v2m-9 3h14m-12 0 1 13h8l1-13M10 10v7m4-7v7" /></svg><span>拖到这里删除</span></div>}
    {active && <div className="lightbox" onClick={() => setActive(null)}><button className="close" onClick={() => setActive(null)}>×</button><span>{current + 1}/{photos.length}</span><img src={resolvePhotoSrc(photos[current])} alt="大图预览" onClick={(event) => event.stopPropagation()} /><div><button disabled={current === 0} onClick={(event) => { event.stopPropagation(); setActive(photos[current - 1].id) }}>←</button><button className="delete" onClick={(event) => { event.stopPropagation(); remove() }}>删除</button><button disabled={current === photos.length - 1} onClick={(event) => { event.stopPropagation(); setActive(photos[current + 1].id) }}>→</button></div></div>}
  </section>
}

export default Gallery
