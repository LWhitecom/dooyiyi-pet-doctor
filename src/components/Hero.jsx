import { useRef } from 'react'
import heroPhoto from '../assets/previews/hero/main-photo.webp'
import qCharacter from '../assets/previews/hero/q-character.webp'
import catA from '../assets/previews/hero/cat-a.webp'
import catB from '../assets/previews/hero/cat-b.webp'
import '../styles/hero.css'

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function Hero() {
  const photoFrameRef = useRef(null)

  const handlePhotoTilt = (event) => {
    if (event.pointerType === 'touch') return
    const card = photoFrameRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const rotateY = ((event.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 10
    const rotateX = ((event.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -10
    card.style.setProperty('--tilt-x', `${rotateX.toFixed(2)}deg`)
    card.style.setProperty('--tilt-y', `${rotateY.toFixed(2)}deg`)
    card.classList.add('is-tilting')
  }

  const resetPhotoTilt = () => {
    const card = photoFrameRef.current
    if (!card) return
    card.style.setProperty('--tilt-x', '0deg')
    card.style.setProperty('--tilt-y', '0deg')
    card.classList.remove('is-tilting')
  }

  return (
    <section id="hero" className="hero-collage bg-star-rays" aria-label="首页">
      <div className="hero-block hero-block-a" />
      <div className="hero-block hero-block-b" />
      <div className="hero-block hero-block-c" />
      <div className="hero-block hero-block-e" />
      <div className="hero-block hero-block-f" />

      <div className="hero-copy">
        <p className="hero-copy-kicker">PET DOCTOR</p>
        <h1>LEILA'S<br />SPACE</h1>
        <p>HEALING WITH<br />WARMTH</p>
        <span>「把温柔留给每一个小生命」</span>
      </div>

      <div className="hero-doodles" aria-hidden="true">
        <svg className="hero-bow" viewBox="0 0 72 56" fill="none"><path d="M8 28Q0 12 18 8Q32 4 28 24Q26 32 18 30Q6 28 8 28ZM64 28Q72 12 54 8Q40 4 44 24Q46 32 54 30Q66 28 64 28Z" /><circle cx="36" cy="28" r="5" /><path d="M30 33Q26 44 18 48M42 33Q46 44 54 50" /></svg>
        <svg className="hero-scribble" viewBox="0 0 50 40" fill="none"><path d="M2 20Q12 4 28 16T48 12M8 28Q20 12 34 24T46 20M4 34Q18 20 30 30" /></svg>
        <span className="hero-heart">♡</span>
        <span className="hero-sparkle">✦</span>
      </div>

      <div ref={photoFrameRef} className="hero-photo-frame" onPointerMove={handlePhotoTilt} onPointerLeave={resetPhotoTilt}>
        <img src={heroPhoto} alt="Leila 的照片" className="hero-photo" />
        <span className="hero-photo-label">real me · 真实的我</span>
      </div>

      <img src={qCharacter} alt="Q 版 Leila 装饰" className="hero-q-character" />
      <img src={catA} alt="白灰猫装饰" className="hero-cat hero-cat-a" />
      <img src={catB} alt="虎斑猫装饰" className="hero-cat hero-cat-b" />

      <div className="hero-name-tag">DooYiYi</div>
      <button type="button" className="hero-scroll" onClick={() => scrollToSection('about')}>↓ 滑动探索 ↓</button>
    </section>
  )
}

export default Hero
