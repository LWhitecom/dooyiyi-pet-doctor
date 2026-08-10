import { useState, useEffect, useRef } from 'react'
import LoadingScreen from './components/LoadingScreen.jsx'
import Hero from './components/Hero.jsx'
import AboutMe from './components/AboutMe.jsx'
import Gallery from './components/Gallery.jsx'
import FinaleCarousel from './components/FinaleCarousel.jsx'
import PawProgress from './components/PawProgress.jsx'
import { loadPhotoWall, savePhotoWall } from './utils/photoWallStorage.js'
import { createDefaultWallPhotos } from './utils/wallAssets.js'
import { getCurrentUser, loadCloudWall, migrateLocalWall, saveCloudWall, signInWithPassword, signOut, signUpWithPassword, subscribeToCloudWall, uploadCloudPhoto } from './utils/photoWallCloud.js'

// ════════════════════════════════════════════════════════
//  App 主组件（批次①骨架版）
//  - Loading 加载页（先显示，进度满后淡出）
//  - 4 个 section 纵向滚动占位（批次②③ 填真实组件）
//  本轮：只搭骨架 + 验证设计系统生效
// ════════════════════════════════════════════════════════

function App() {
  const [loading, setLoading] = useState(true)
  const [wallPhotos, setWallPhotos] = useState(createDefaultWallPhotos)
  const [wallStickers, setWallStickers] = useState([])
  const [syncUser, setSyncUser] = useState(null)
  const [syncStatus, setSyncStatus] = useState('local')
  const [localWallReady, setLocalWallReady] = useState(false)
  const wallStorageReady = useRef(false)
  const cloudStorageReady = useRef(false)
  const skipCloudSave = useRef(false)

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
      if (!cancelled) {
        wallStorageReady.current = true
        setLocalWallReady(true)
      }
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    getCurrentUser().then((user) => {
      if (!cancelled) setSyncUser(user)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!syncUser || !localWallReady) return
    let cancelled = false
    setSyncStatus('syncing')
    loadCloudWall(syncUser.id).then(async (cloudWall) => {
      if (cancelled) return
      if (cloudWall) {
        setWallPhotos(cloudWall.photos)
        setWallStickers(cloudWall.stickers)
      } else {
        const migrated = await migrateLocalWall(syncUser.id, { photos: wallPhotos, stickers: wallStickers })
        if (cancelled) return
        setWallPhotos(migrated.photos)
        setWallStickers(migrated.stickers)
        await saveCloudWall(syncUser.id, migrated)
      }
      cloudStorageReady.current = true
      setSyncStatus('synced')
    }).catch(() => {
      if (!cancelled) setSyncStatus('error')
    })
    return () => { cancelled = true }
  }, [syncUser, localWallReady])

  useEffect(() => {
    if (!syncUser || !cloudStorageReady.current) return undefined
    return subscribeToCloudWall(syncUser.id, () => {
      loadCloudWall(syncUser.id).then((cloudWall) => {
        if (!cloudWall) return
        skipCloudSave.current = true
        setWallPhotos(cloudWall.photos)
        setWallStickers(cloudWall.stickers)
        setSyncStatus('synced')
      }).catch(() => setSyncStatus('error'))
    })
  }, [syncUser, syncStatus])

  useEffect(() => {
    if (!wallStorageReady.current) return
    savePhotoWall({ photos: wallPhotos, stickers: wallStickers }).catch(() => {})
  }, [wallPhotos, wallStickers])

  useEffect(() => {
    if (!syncUser || !cloudStorageReady.current) return
    if (skipCloudSave.current) {
      skipCloudSave.current = false
      return
    }
    const timer = setTimeout(() => {
      setSyncStatus('syncing')
      saveCloudWall(syncUser.id, { photos: wallPhotos, stickers: wallStickers }).then(() => setSyncStatus('synced')).catch(() => setSyncStatus('error'))
    }, 180)
    return () => clearTimeout(timer)
  }, [syncUser, wallPhotos, wallStickers])

  const addCloudPhoto = async (file) => {
    if (!syncUser) throw new Error('请先登录“云同步”，再添加照片')
    const photo = await uploadCloudPhoto(file, syncUser.id, { x: 8 + Math.random() * 62, y: 8 + Math.random() * 65, r: -6 + Math.random() * 12 })
    setWallPhotos((items) => [...items, photo])
  }

  const handleSignIn = async (email, password) => {
    await signInWithPassword(email, password)
    setSyncUser(await getCurrentUser())
  }

  const handleSignUp = async (email, password) => {
    return signUpWithPassword(email, password)
  }

  const handleSignOut = async () => {
    await signOut()
    cloudStorageReady.current = false
    setSyncUser(null)
    setSyncStatus('local')
  }

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
        <Gallery photos={wallPhotos} onPhotosChange={setWallPhotos} stickers={wallStickers} onStickersChange={setWallStickers} onPhotoUpload={addCloudPhoto} syncUser={syncUser} syncStatus={syncStatus} onSignIn={handleSignIn} onSignUp={handleSignUp} onSignOut={handleSignOut} />


        <FinaleCarousel />
      </main>
    </>
  )
}

export default App
