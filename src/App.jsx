import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import LoadingScreen from './components/LoadingScreen.jsx'
import AuthGate from './components/AuthGate.jsx'
import Hero from './components/Hero.jsx'
import AboutMe from './components/AboutMe.jsx'
import PawProgress from './components/PawProgress.jsx'
import { loadPersonalDisplayMemory, loadPhotoWall, savePersonalDisplayMemory, savePhotoWall } from './utils/photoWallStorage.js'
import { createDefaultWallPhotos } from './utils/wallAssets.js'
import { exchangeRecoverySession, getCurrentUser, loadCloudWall, migrateLocalWall, resetPasswordWithCode, saveCloudWall, sendResetCode, signInWithPassword, signOut, signUpWithEmail, subscribeToCloudWall, uploadCloudDisplayImage, uploadCloudPhoto, verifySignupCode } from './utils/photoWallCloud.js'

const Gallery = lazy(() => import('./components/Gallery.jsx'))
const FinaleCarousel = lazy(() => import('./components/FinaleCarousel.jsx'))

const AUTH_ACTIVITY_KEY = 'dooyiyi-auth-last-active'
const AUTH_INACTIVITY_MS = 3 * 24 * 60 * 60 * 1000

const withoutRuntimeDisplaySource = ({ src, srcFull, pendingUpload, ...stored }) => stored

const getLastAuthActivity = () => {
  try {
    const value = Number(window.localStorage.getItem(AUTH_ACTIVITY_KEY))
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

const recordAuthActivity = () => {
  try {
    window.localStorage.setItem(AUTH_ACTIVITY_KEY, String(Date.now()))
  } catch {}
}

const clearAuthActivity = () => {
  try {
    window.localStorage.removeItem(AUTH_ACTIVITY_KEY)
  } catch {}
}

const hasAuthSessionExpired = () => {
  const lastActivity = getLastAuthActivity()
  return lastActivity !== null && Date.now() - lastActivity >= AUTH_INACTIVITY_MS
}

const hasRecoveryLink = () => {
  const url = new URL(window.location.href)
  return url.searchParams.has('code') || /(?:^|[&#])type=recovery(?:&|$)/.test(url.hash) || url.hash.includes('access_token=')
}

function DeferredSection({ children, minHeight }) {
  const anchorRef = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const anchor = anchorRef.current
    if (!anchor || !('IntersectionObserver' in window)) return setVisible(true)
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    }, { rootMargin: '500px 0px' })
    observer.observe(anchor)
    return () => observer.disconnect()
  }, [])

  return <div ref={anchorRef} style={{ minHeight }}>{visible && <Suspense fallback={<div className="deferred-section-placeholder" aria-hidden="true" />}>{children}</Suspense>}</div>
}

const friendlyAuthError = (error) => {
  const message = String(error?.message || '')
  if (/[\u4e00-\u9fff]/.test(message)) return message
  if (/expired|invalid|recovery/i.test(message)) return '重置链接无效或已过期，请重新发送。'
  return '设置新密码失败，请稍后重试。'
}

function ResetConfirm({ onComplete }) {
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('正在确认重置链接…')

  useEffect(() => {
    let cancelled = false
    exchangeRecoverySession().then(() => {
      if (!cancelled) {
        setReady(true)
        setMessage('')
      }
    }).catch((error) => {
      if (!cancelled) setMessage(friendlyAuthError(error))
    })
    return () => { cancelled = true }
  }, [])

  const submit = async () => {
    if (password.length < 8) return setMessage('密码至少需要 8 位。')
    if (password !== confirmPassword) return setMessage('两次输入的密码不一致。')
    setBusy(true)
    setMessage('')
    try {
      await onComplete(password)
    } catch (error) {
      setMessage(friendlyAuthError(error))
    } finally {
      setBusy(false)
    }
  }

  return <main className="auth-gate" aria-label="设置新密码">
    <div className="auth-gate-grid" aria-hidden="true" />
    <section className="auth-page auth-page--reset">
      <div className="auth-form-card">
        <p className="auth-eyebrow">DooYiYi · private space</p>
        <h1>设置新密码</h1><p className="auth-subtitle">为你的小世界设置新的守护密码</p>
        <label className="auth-field"><span>▣</span><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="新密码（至少 8 位）" autoComplete="new-password" disabled={busy || !ready} /></label>
        <label className="auth-field"><span>▣</span><input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" placeholder="确认新密码" autoComplete="new-password" disabled={busy || !ready} /></label>
        <button type="button" className="auth-submit" onClick={submit} disabled={busy || !ready}>{busy ? '请稍候…' : '保存新密码'}</button>
        {message && <p className="auth-message" role="status">{message}</p>}
      </div>
    </section>
  </main>
}

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
  const [profilePhoto, setProfilePhoto] = useState(null)
  const [finaleCards, setFinaleCards] = useState([])
  const [syncUser, setSyncUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [syncStatus, setSyncStatus] = useState('local')
  const [localWallReady, setLocalWallReady] = useState(false)
  const [localPersonalMemoryReady, setLocalPersonalMemoryReady] = useState(false)
  const [cloudWallReady, setCloudWallReady] = useState(false)
  const [authMode, setAuthMode] = useState(() => hasRecoveryLink() ? 'reset-confirm' : 'default')
  const wallStorageReady = useRef(false)
  const personalMemoryStorageReady = useRef(false)
  const cloudStorageReady = useRef(false)
  const skipCloudSave = useRef(false)
  const lastCloudSnapshot = useRef('')

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
    loadPersonalDisplayMemory().then((savedMemory) => {
      if (cancelled || !savedMemory) return
      setProfilePhoto(savedMemory.profilePhoto || null)
      setFinaleCards(Array.isArray(savedMemory.finaleCards) ? savedMemory.finaleCards : [])
    }).catch(() => {}).finally(() => {
      if (!cancelled) {
        personalMemoryStorageReady.current = true
        setLocalPersonalMemoryReady(true)
      }
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    getCurrentUser().then(async (user) => {
      if (cancelled) return
      if (user && hasAuthSessionExpired()) {
        await signOut()
        clearAuthActivity()
        return
      }
      if (user) recordAuthActivity()
      setSyncUser(user)
    }).catch(() => {}).finally(() => {
      if (!cancelled) setAuthReady(true)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!syncUser || !localWallReady || !localPersonalMemoryReady) return
    let cancelled = false
    setSyncStatus('syncing')
    loadCloudWall(syncUser.id).then(async (cloudWall) => {
      if (cancelled) return
      if (cloudWall) {
        setWallPhotos(cloudWall.photos)
        setWallStickers(cloudWall.stickers)
        setProfilePhoto(cloudWall.profilePhoto)
        setFinaleCards(cloudWall.finaleCards)
      } else {
        const migrated = await migrateLocalWall(syncUser.id, { photos: wallPhotos, stickers: wallStickers })
        if (cancelled) return
        setWallPhotos(migrated.photos)
        setWallStickers(migrated.stickers)
        await saveCloudWall(syncUser.id, { ...migrated, profilePhoto, finaleCards })
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
  }, [syncUser, localWallReady, localPersonalMemoryReady])

  useEffect(() => {
    if (!syncUser || !cloudWallReady) return undefined
    return subscribeToCloudWall(syncUser.id, () => {
      loadCloudWall(syncUser.id).then((cloudWall) => {
        if (!cloudWall) return
        skipCloudSave.current = true
        setWallPhotos(cloudWall.photos)
        setWallStickers(cloudWall.stickers)
        setProfilePhoto(cloudWall.profilePhoto)
        setFinaleCards(cloudWall.finaleCards)
        setSyncStatus('synced')
      }).catch(() => setSyncStatus('error'))
    })
  }, [syncUser, cloudWallReady])

  useEffect(() => {
    if (!syncUser) return undefined
    const keepSessionAlive = () => {
      if (hasAuthSessionExpired()) {
        handleSignOut().catch(() => {})
        return
      }
      recordAuthActivity()
    }
    const handleVisibilityChange = () => {
      if (!document.hidden) keepSessionAlive()
    }
    const expiryTimer = window.setInterval(() => {
      if (hasAuthSessionExpired()) handleSignOut().catch(() => {})
    }, 60 * 1000)
    window.addEventListener('focus', keepSessionAlive)
    window.addEventListener('pageshow', keepSessionAlive)
    window.addEventListener('click', keepSessionAlive)
    window.addEventListener('keydown', keepSessionAlive)
    window.addEventListener('touchstart', keepSessionAlive, { passive: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.clearInterval(expiryTimer)
      window.removeEventListener('focus', keepSessionAlive)
      window.removeEventListener('pageshow', keepSessionAlive)
      window.removeEventListener('click', keepSessionAlive)
      window.removeEventListener('keydown', keepSessionAlive)
      window.removeEventListener('touchstart', keepSessionAlive)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [syncUser])

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
          setProfilePhoto(cloudWall.profilePhoto)
          setFinaleCards(cloudWall.finaleCards)
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
    if (!personalMemoryStorageReady.current) return
    if (profilePhoto?.pendingUpload || finaleCards.some((card) => card.pendingUpload)) return
    savePersonalDisplayMemory({ profilePhoto, finaleCards }).catch(() => {})
  }, [profilePhoto, finaleCards])

  useEffect(() => {
    if (!syncUser || !cloudStorageReady.current) return
    if (skipCloudSave.current) {
      skipCloudSave.current = false
      return
    }
    if (wallPhotos.some((photo) => photo.pendingUpload) || profilePhoto?.pendingUpload || finaleCards.some((card) => card.pendingUpload)) return
    const snapshot = JSON.stringify({
      photos: wallPhotos.map(({ src, srcFull, pendingUpload, ...photo }) => photo),
      stickers: wallStickers.map(({ src, ...sticker }) => sticker),
      profilePhoto: profilePhoto ? withoutRuntimeDisplaySource(profilePhoto) : null,
      finaleCards: finaleCards.map(withoutRuntimeDisplaySource),
    })
    if (snapshot === lastCloudSnapshot.current) return
    const timer = setTimeout(() => {
      setSyncStatus('syncing')
      saveCloudWall(syncUser.id, { photos: wallPhotos, stickers: wallStickers, profilePhoto, finaleCards }).then(() => {
        lastCloudSnapshot.current = snapshot
        setSyncStatus('synced')
      }).catch(() => setSyncStatus('error'))
    }, 650)
    return () => clearTimeout(timer)
  }, [syncUser, wallPhotos, wallStickers, profilePhoto, finaleCards])

  const addCloudPhoto = async (file) => {
    if (!syncUser) throw new Error('请先登录“云同步”，再添加照片')
    const layout = { x: 8 + Math.random() * 62, y: 8 + Math.random() * 65, r: -6 + Math.random() * 12 }
    const temporaryId = `pending-${crypto.randomUUID()}`
    const localUrl = URL.createObjectURL(file)
    setWallPhotos((items) => [...items, { id: temporaryId, ...layout, src: localUrl, srcFull: localUrl, pendingUpload: true }])
    setSyncStatus('syncing')
    try {
      const photo = await uploadCloudPhoto(file, syncUser.id, layout)
      setWallPhotos((items) => items.map((item) => item.id === temporaryId ? photo : item))
      URL.revokeObjectURL(localUrl)
    } catch (error) {
      setWallPhotos((items) => items.filter((item) => item.id !== temporaryId))
      URL.revokeObjectURL(localUrl)
      setSyncStatus('error')
      throw error
    }
  }

  const saveDisplayImage = async (file, type, cardId = null) => {
    if (!syncUser) throw new Error('请先登录“云同步”，再更换图片')
    const localUrl = URL.createObjectURL(file)
    const optimisticImage = { src: localUrl, srcFull: localUrl, pendingUpload: true }
    const previousProfilePhoto = profilePhoto
    const previousFinaleCards = finaleCards
    if (type === 'profile') setProfilePhoto(optimisticImage)
    else setFinaleCards((items) => [...items.filter((item) => item.cardId !== cardId), { ...optimisticImage, cardId }])
    setSyncStatus('syncing')
    try {
      const uploadedImage = await uploadCloudDisplayImage(file, syncUser.id, type === 'profile' ? 'profile' : 'finale')
      if (type === 'profile') setProfilePhoto(uploadedImage)
      else setFinaleCards((items) => [...items.filter((item) => item.cardId !== cardId), { ...uploadedImage, cardId }])
      URL.revokeObjectURL(localUrl)
    } catch (error) {
      if (type === 'profile') setProfilePhoto(previousProfilePhoto)
      else setFinaleCards(previousFinaleCards)
      URL.revokeObjectURL(localUrl)
      setSyncStatus('error')
      throw error
    }
  }

  const resetProfilePhoto = () => setProfilePhoto(null)
  const resetFinaleCard = (cardId) => setFinaleCards((items) => items.filter((item) => item.cardId !== cardId))

  const handleSignIn = async (email, password) => {
    // 直接用登录返回的 user，不再二次调 getCurrentUser() 走网络（iOS 弱网会挂起/返回 null 导致卡死）
    const user = await signInWithPassword(email, password)
    recordAuthActivity()
    setSyncUser(user)
  }

  const handleSignUp = async (email) => {
    return signUpWithEmail(email)
  }

  const handleVerifySignup = async (email, code, password) => {
    await verifySignupCode(email, code, password)
    recordAuthActivity()
    setSyncUser(await getCurrentUser())
  }

  const handleResetPassword = async (password) => {
    await resetPasswordWithCode(password)
    recordAuthActivity()
    setSyncUser(await getCurrentUser())
    setAuthMode('default')
    window.history.replaceState({}, document.title, new URL(import.meta.env.BASE_URL, window.location.origin).toString())
  }

  const handleSignOut = async () => {
    await signOut()
    clearAuthActivity()
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

  if (authMode === 'reset-confirm') {
    return <ResetConfirm onComplete={handleResetPassword} />
  }

  if (!syncUser) {
    return <AuthGate onSignIn={handleSignIn} onSendSignupCode={handleSignUp} onVerifySignupCode={handleVerifySignup} onSendResetLink={sendResetCode} />
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
        <AboutMe wallPhotos={wallPhotos} profilePhoto={profilePhoto} onPhotoChange={(file) => saveDisplayImage(file, 'profile')} onPhotoReset={resetProfilePhoto} />
        <DeferredSection minHeight="650px"><Gallery photos={wallPhotos} onPhotosChange={setWallPhotos} stickers={wallStickers} onStickersChange={setWallStickers} onPhotoUpload={addCloudPhoto} syncUser={syncUser} syncStatus={syncStatus} onSignOut={handleSignOut} /></DeferredSection>
        <DeferredSection minHeight="100svh"><FinaleCarousel cardOverrides={finaleCards} onCardChange={(file, cardId) => saveDisplayImage(file, 'finale', cardId)} onCardReset={resetFinaleCard} /></DeferredSection>
      </main>
    </>
  )
}

export default App
