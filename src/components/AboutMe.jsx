import { useEffect, useMemo, useRef, useState } from 'react'
import aboutPhoto from '../assets/photos/本人照片1.jpg'
import qCharacter from '../assets/images/cutout/抠图素材图5.png'
import catA from '../assets/images/cutout/单个抠图元素2.png'
import catDecor from '../assets/images/cutout/单个抠图元素5.png'
import catDecorTwo from '../assets/images/cutout/单个抠图元素8.png'
import '../styles/about.css'
import { resolvePhotoSrc } from '../utils/wallAssets.js'

function AboutMe({ wallPhotos, profilePhoto, onPhotoChange, onPhotoReset, onPhotoMediaRefresh }) {
  const [pressing, setPressing] = useState(false)
  const [hint, setHint] = useState(false)
  const [carouselSlide, setCarouselSlide] = useState(0)
  const [carouselMoving, setCarouselMoving] = useState(false)
  const [carouselPaused, setCarouselPaused] = useState(false)
  const [pageVisible, setPageVisible] = useState(!document.hidden)
  const inputRef = useRef(null)
  const timerRef = useRef(null)
  const openedRef = useRef(false)
  const profileRetryCount = useRef(0)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const carouselGroups = useMemo(() => Array.from(
    { length: Math.ceil(wallPhotos.length / 2) },
    (_, groupIndex) => [
      wallPhotos[(groupIndex * 2) % wallPhotos.length],
      wallPhotos[(groupIndex * 2 + 1) % wallPhotos.length],
    ],
  ), [wallPhotos])
  const carouselSlides = carouselGroups.length > 1 ? [...carouselGroups, carouselGroups[0]] : carouselGroups

  useEffect(() => {
    const onVisibilityChange = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useEffect(() => {
    setCarouselSlide(0)
    setCarouselMoving(false)
  }, [carouselGroups.length])

  useEffect(() => {
    if (carouselGroups.length < 2 || carouselPaused || !pageVisible || carouselMoving) return undefined
    const timer = window.setTimeout(() => {
      setCarouselMoving(true)
      setCarouselSlide((index) => index + 1)
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [carouselGroups.length, carouselPaused, pageVisible, carouselMoving, carouselSlide])

  useEffect(() => {
    carouselSlides.slice(carouselSlide, carouselSlide + 3).flat().forEach((item) => {
      const preload = new Image()
      preload.src = resolvePhotoSrc(item)
    })
  }, [carouselSlide, carouselSlides])

  const handleCarouselTransitionEnd = (event) => {
    if (event.target !== event.currentTarget) return
    if (carouselSlide === carouselGroups.length) {
      setCarouselMoving(false)
      setCarouselSlide(0)
      return
    }
    setCarouselMoving(false)
  }

  const endPress = () => {
    clearTimeout(timerRef.current)
    setPressing(false)
    if (!openedRef.current) setHint(false)
  }

  const startPress = () => {
    openedRef.current = false
    setPressing(true)
    setHint(true)
    timerRef.current = setTimeout(() => {
      openedRef.current = true
      setPressing(false)
      setHint(false)
      navigator.vibrate?.([30, 50, 30])
      inputRef.current?.click()
    }, 500)
  }

  const choosePhoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) {
      window.alert('图片请控制在 5MB 以内哦~')
      return
    }
    try {
      await onPhotoChange(file)
    } catch (error) {
      window.alert(error.message || '图片保存失败，请稍后重试。')
    }
  }

  const photo = profilePhoto?.src || aboutPhoto

  return (
    <section id="about" className="about-section bg-plaid-grid" aria-labelledby="about-title">
      <header>
        <h2 id="about-title">··· About Me ···</h2>
        <div className="about-progress"><span /><small>2 of Me &gt;</small></div>
      </header>

      <div className="about-main-photo-wrap">
        <div
          className={`about-main-photo ${pressing ? 'is-pressing' : ''}`}
          onPointerDown={startPress}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          onPointerCancel={endPress}
          onContextMenu={(event) => event.preventDefault()}
          role="button"
          tabIndex="0"
          aria-label="长按 500 毫秒更换照片"
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click() }}
        >
          <img src={photo} alt="Leila 的个人照片" loading="lazy" decoding="async" onLoad={() => { profileRetryCount.current = 0 }} onError={() => { if (profilePhoto && profileRetryCount.current < 2) { profileRetryCount.current += 1; onPhotoMediaRefresh?.() } }} />
          {profilePhoto && <button type="button" className="about-photo-reset" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onPhotoReset() }}>恢复默认</button>}
          <span className="about-dot" />
          <svg className="about-photo-line" viewBox="0 0 32 24" fill="none"><path d="M2 20Q8 6 16 12Q24 18 30 4" /></svg>
          <p>Hi~ I&apos;m your<br />pet doctor 🐾</p>
          <b>?!</b>
          <em>Say hi to me ^_^</em>
          <span className={`long-press-hint ${hint ? 'is-visible' : ''}`}>👆 长按换图</span>
          <input ref={inputRef} type="file" accept="image/*" onChange={choosePhoto} />
        </div>
      </div>

      <aside className="about-card-column" aria-label="个人小卡片">
        <article className="about-mini-card"><strong>NEW POST</strong><span>today&apos;s tiny happiness</span></article>
        <article
          className="about-dual-card"
          onMouseEnter={() => setCarouselPaused(true)}
          onMouseLeave={() => setCarouselPaused(false)}
          onTouchStart={() => setCarouselPaused(true)}
          onTouchEnd={() => setCarouselPaused(false)}
          onTouchCancel={() => setCarouselPaused(false)}
          aria-label="照片墙联动轮播"
        >
          {carouselSlides.length ? <div className="about-carousel-viewport">
            <div
              className={`about-carousel-track ${carouselMoving ? 'is-moving' : ''}`}
              style={{ transform: `translate3d(-${carouselSlide * 100}%, 0, 0)` }}
              onTransitionEnd={handleCarouselTransitionEnd}
            >
              {carouselSlides.map((group, groupIndex) => <div className="about-carousel-slide" key={`${groupIndex}-${group[0]?.id}`}>
                {group.map((item, index) => <img key={`${item.id}-${index}`} src={resolvePhotoSrc(item)} alt={`照片墙照片 ${groupIndex * 2 + index + 1}`} loading={groupIndex <= 1 ? 'eager' : 'lazy'} fetchPriority={groupIndex === 0 ? 'high' : 'low'} decoding="async" />)}
              </div>)}
            </div>
          </div> : <span>照片墙暂时没有照片</span>}
          <i>wall</i>
        </article>
        <article className="about-stats-card"><div><strong>MY CATS</strong><img src={catA} alt="白灰猫" /></div><p>两只小毛孩子<br />是生活里的光~</p><span>🐾 companions</span></article>
        <article className="about-event-card"><strong>EVENT!!</strong><p>欢迎来到我的小世界~</p></article>
      </aside>

      <img src={qCharacter} alt="Q 版 Leila 装饰" className="about-q-character" />
      <img src={catDecor} alt="白灰猫装饰" className="about-cat-decor" />
      <img src={catDecorTwo} alt="虎斑猫装饰" className="about-cat-decor-two" />
      <svg className="about-spiral" viewBox="0 0 50 70" fill="none" aria-hidden="true"><path d="M8 10Q25 2 38 15Q46 28 36 42Q26 56 14 48Q4 40 10 26Q16 14 28 20M30 30Q38 35 34 48M12 52Q20 62 30 58" /></svg>
      <div className="about-actions" aria-label="关于我操作"><button type="button">🐾</button><button type="button">♡</button><button type="button">☰</button></div>
    </section>
  )
}

export default AboutMe
