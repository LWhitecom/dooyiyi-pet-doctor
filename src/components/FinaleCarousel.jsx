import { useEffect, useRef, useState } from 'react'
import slide1 from '../assets/images/cutout/轮播图1.png'
import slide2 from '../assets/images/cutout/轮播图2.png'
import slide3 from '../assets/images/cutout/轮播图3.png'
import slide4 from '../assets/images/cutout/轮播图4.png'
import slide5 from '../assets/images/cutout/轮播图5.png'
import catA from '../assets/images/cutout/单个抠图元素3.png'
import catB from '../assets/images/cutout/单个抠图元素1.png'
import '../styles/finale.css'

const defaultCards = [slide1, slide2, slide3, slide4, slide5].map((src, index) => ({
  id: `carousel-card-${index + 1}`,
  src,
}))

function FinaleCarousel() {
  const [cards, setCards] = useState(defaultCards)
  const [active, setActive] = useState(0)
  const [start, setStart] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [paused, setPaused] = useState(false)
  const [expandedCardId, setExpandedCardId] = useState(null)
  const replaceInputRef = useRef(null)
  const replacementCardIdRef = useRef(null)
  const expandedCard = cards.find((card) => card.id === expandedCardId) ?? null

  const move = (step) => {
    setDragOffset(0)
    setActive((index) => (index + step + cards.length) % cards.length)
  }
  useEffect(() => {
    if (paused || expandedCard !== null) return undefined
    const timer = window.setTimeout(() => move(1), 3000)
    return () => window.clearTimeout(timer)
  }, [active, cards.length, paused, expandedCard])
  useEffect(() => {
    if (!cards.length) return
    const nearbyIndexes = [active, active - 1, active + 1]
      .map((index) => (index + cards.length) % cards.length)
    nearbyIndexes.forEach((index) => {
      const preload = new Image()
      preload.decoding = 'async'
      preload.src = cards[index].src
    })
  }, [active, cards])
  const cardPosition = (index) => {
    const forward = (index - active + cards.length) % cards.length
    if (forward === 0) return 'active'
    if (forward === 1) return 'next'
    if (forward === cards.length - 1) return 'previous'
    return 'hidden'
  }
  const replaceCurrentCard = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) {
      window.alert('图片请控制在 5MB 以内哦~')
      return
    }
    const targetCardId = replacementCardIdRef.current
    if (targetCardId === null) return
    const reader = new FileReader()
    reader.onload = () => setCards((items) => items.map((item) => item.id === targetCardId ? { ...item, src: String(reader.result) } : item))
    reader.readAsDataURL(file)
  }
  const openReplacementPicker = (cardId) => {
    replacementCardIdRef.current = cardId
    replaceInputRef.current?.click()
  }
  const openLightbox = (cardId) => setExpandedCardId(cardId)

  return <section id="finale" className="finale bg-fade-rays-to-grid">
    <h2>Little moments, big love</h2>
    <p>把每一帧温柔，收进记忆里</p>
    <button type="button" className="carousel-upload" onClick={() => openLightbox(cards[active].id)} aria-label="查看当前轮播图片并确认替换">
      <span>＋</span> 查看并替换
    </button>
    <input ref={replaceInputRef} className="carousel-upload-input" type="file" accept="image/*" onChange={replaceCurrentCard} />
    <div className="carousel" style={{ '--swipe-offset': `${dragOffset}px` }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => { setDragOffset(0); setPaused(false) }} onTouchStart={(event) => { setPaused(true); setStart(event.touches[0].clientX) }} onTouchMove={(event) => setDragOffset(event.touches[0].clientX - start)} onTouchEnd={(event) => { const distance = start - event.changedTouches[0].clientX; if (Math.abs(distance) > 50) move(distance > 0 ? 1 : -1); else setDragOffset(0); setPaused(false) }} onTouchCancel={() => { setDragOffset(0); setPaused(false) }}>
      {cards.map((card, index) => <button key={card.id} className={`carousel-card ${cardPosition(index)}`} onClick={() => openLightbox(card.id)} aria-label={`放大查看轮播图片 ${index + 1}`}>
        <img src={card.src} alt={`轮播图片 ${index + 1}`} loading={cardPosition(index) === 'hidden' ? 'lazy' : 'eager'} fetchPriority={cardPosition(index) === 'active' ? 'high' : 'low'} decoding="async" />
      </button>)}
    </div>
    <div className="carousel-nav"><button type="button" onClick={() => move(-1)} aria-label="上一张">←</button><span>{active + 1} / {cards.length}</span><button type="button" onClick={() => move(1)} aria-label="下一张">→</button></div>
    {expandedCard && <div className="carousel-lightbox" role="dialog" aria-modal="true" aria-label="放大查看轮播图片" onClick={() => setExpandedCardId(null)}>
      <div className="carousel-lightbox-panel" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="carousel-lightbox-close" onClick={() => setExpandedCardId(null)} aria-label="关闭放大图片">×</button>
        <img src={expandedCard.src} alt="当前准备替换的轮播图片" />
        <button type="button" className="carousel-lightbox-replace" onClick={() => openReplacementPicker(expandedCard.id)}>替换图片</button>
      </div>
    </div>}
    <div className="goodbye"><img src={catA} alt="白灰猫挥手" /><div><strong>See you soon!</strong><span>愿每一次相遇都被温柔照亮</span></div><img src={catB} alt="虎斑猫陪伴" /></div>
  </section>
}

export default FinaleCarousel
