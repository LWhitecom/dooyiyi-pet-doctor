import { useState, useEffect, useRef } from 'react'
import LoadingScreen from './components/LoadingScreen.jsx'
import AuthGate from './components/AuthGate.jsx'
import Hero from './components/Hero.jsx'
import AboutMe from './components/AboutMe.jsx'
import Gallery from './components/Gallery.jsx'
import FinaleCarousel from './components/FinaleCarousel.jsx'
import PawProgress from './components/PawProgress.jsx'
import { loadPhotoWall, savePhotoWall } from './utils/photoWallStorage.js'
import { createDefaultWallPhotos } from './utils/wallAssets.js'
import { getCurrentUser, loadCloudWall, migrateLocalWall, resetPasswordWithCode, saveCloudWall, sendResetCode, signInWithPassword, signOut, signUpWithEmail, subscribeToCloudWall, uploadCloudPhoto, verifySignupCode } from './utils/photoWallCloud.js'

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
  const [authReady, setAuthReady] = useState(false)
  const [syncStatus, setSyncStatus] = useState('local')
  const [localWallReady, setLocalWallReady] = useState(false)
  const [cloudWallReady, setCloudWallReady] = useState(false)
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
    }).catch(() => {}).finally(() => {
      if (!cancelled) setAuthReady(true)
    })
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
      setCloudWallReady(true)
      setSyncStatus('synced')
    }).catch(() => {
      if (!cancelled) {
        setCloudWallReady(false)
        setSyncStatus('error')
      }
    })
    return () => { cancelled = true }
  }, [syncUser, localWallReady])

  useEffect(() => {
    if (!syncUser || !cloudWallReady) return undefined
    return subscribeToCloudWall(syncUser.id, () => {
      loadCloudWall(syncUser.id).then((cloudWall) => {
        if (!cloudWall) return
        skipCloudSave.current = true
        setWallPhotos(cloudWall.photos)
        setWallStickers(cloudWall.stickers)
        setSyncStatus('synced')
      }).catch(() => setSyncStatus('error'))
    })
  }, [syncUser, cloudWallReady])

  useEffect(() => {
    if (!syncUser || !cloudWallReady) return undefined
    let refreshTimer
    const refreshFromCloud = () => {
      clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => {
        loadCloudWall(syncUser.id).then((cloudWall) => {
          if (!cloudWall) return
          skipCloudSave.current = true
          setWallPhotos(cloudWall.photos)
          setWallStickers(cloudWall.stickers)
          setSyncStatus('synced')
        }).catch(() => setSyncStatus('error'))
      }, 120)
    }
    const refreshWhenVisible = () => {
      if (!document.hidden) refreshFromCloud()
    }
    window.addEventListener('focus', refreshFromCloud)
    window.addEventListener('pageshow', refreshFromCloud)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      clearTimeout(refreshTimer)
      window.removeEventListener('focus', refreshFromCloud)
      window.removeEventListener('pageshow', refreshFromCloud)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [syncUser, cloudWallReady])

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

  const handleSignUp = async (email) => {
    return signUpWithEmail(email)
  }

  const handleVerifySignup = async (email, code, password) => {
    await verifySignupCode(email, code, password)
    setSyncUser(await getCurrentUser())
  }

  const handleResetPassword = async (email, code, password) => {
    await resetPasswordWithCode(email, code, password)
    setSyncUser(await getCurrentUser())
  }

  const handleSignOut = async () => {
    await signOut()
    cloudStorageReady.current = false
    setCloudWallReady(false)
    setSyncUser(null)
    setSyncStatus('local')
  }

  // 兜底：万一 Loading 组件没回调，8 秒后强制关闭（防卡死）
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 8000)
    return () => clearTimeout(t)
  }, [])

  if (!authReady) {
    return <div className="auth-gate auth-gate--boot" aria-busy="true" />
  }

  if (!syncUser) {
    return <AuthGate onSignIn={handleSignIn} onSendSignupCode={handleSignUp} onVerifySignupCode={handleVerifySignup} onSendResetCode={sendResetCode} onResetPassword={handleResetPassword} />
  }

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
        <Gallery photos={wallPhotos} onPhotosChange={setWallPhotos} stickers={wallStickers} onStickersChange={setWallStickers} onPhotoUpload={addCloudPhoto} syncUser={syncUser} syncStatus={syncStatus} onSignOut={handleSignOut} />


        <FinaleCarousel />
      </main>
    </>
  )
}

export default App
