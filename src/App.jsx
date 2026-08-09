import { useState, useEffect, useRef } from 'react'
import LoadingScreen from './components/LoadingScreen.jsx'
import Hero from './components/Hero.jsx'
import AboutMe from './components/AboutMe.jsx'
import Gallery from './components/Gallery.jsx'
import FinaleCarousel from './components/FinaleCarousel.jsx'
import PawProgress from './components/PawProgress.jsx'
import p1 from './assets/photos/本人照片1.jpg'
import p2 from './assets/photos/本人照片2.jpg'
import p3 from './assets/photos/本人照片3.jpg'
import p4 from './assets/photos/本人照片4.jpg'
import { loadPhotoWall, savePhotoWall } from './utils/photoWallStorage.js'

// ════════════════════════════════════════════════════════
//  App 主组件（批次①骨架版）
//  - Loading 加载页（先显示，进度满后淡出）
//  - 4 个 section 纵向滚动占位（批次②③ 填真实组件）
//  本轮：只搭骨架 + 验证设计系统生效
// ════════════════════════════════════════════════════════

function createDefaultWallPhotos() {
  const savedPositions = JSON.parse(localStorage.getItem('pet-doctor-wall-positions') || '{}')
  return [p1, p2, p3, p4].map((src, index) => {
    const id = `seed-${index}`
    const saved = savedPositions[id]
    return { id, src, x: Number.isFinite(saved?.x) ? saved.x : [6, 52, 18, 61][index], y: Number.isFinite(saved?.y) ? saved.y : [8, 14, 43, 58][index], r: [-5, 4, 3, -3][index] }
  })
}

function App() {
  const [loading, setLoading] = useState(true)
  const [wallPhotos, setWallPhotos] = useState(createDefaultWallPhotos)
  const [wallStickers, setWallStickers] = useState([])
  const wallStorageReady = useRef(false)

  useEffect(() => {
    let cancelled = false
    loadPhotoWall().then((savedWall) => {
      if (cancelled || !savedWall) return
      if (Array.isArray(savedWall)) setWallPhotos(savedWall)
      else {
        if (Array.isArray(savedWall.photos)) setWallPhotos(savedWall.photos)
        if (Array.isArray(savedWall.stickers)) setWallStickers(savedWall.stickers)
      }
    }).catch(() => {}).finally(() => {
      if (!cancelled) wallStorageReady.current = true
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!wallStorageReady.current) return
    savePhotoWall({ photos: wallPhotos, stickers: wallStickers }).catch(() => {})
  }, [wallPhotos, wallStickers])

  // 兜底：万一 Loading 组件没回调，8 秒后强制关闭（防卡死）
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 8000)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      {loading && (
        <LoadingScreen
          onFinish={() => setLoading(false)}
        />
      )}

      <main className="app-main">
        <PawProgress />
        <Hero />
        <AboutMe wallPhotos={wallPhotos} />
        <Gallery photos={wallPhotos} onPhotosChange={setWallPhotos} stickers={wallStickers} onStickersChange={setWallStickers} />


        <FinaleCarousel />
      </main>
    </>
  )
}

export default App
