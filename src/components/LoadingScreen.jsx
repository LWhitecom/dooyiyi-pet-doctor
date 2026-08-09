import { useState, useEffect, useRef } from 'react'
import loadingIllustration from '../assets/images/cutout/抠图素材图8.png'
import '../styles/loading.css'

// ════════════════════════════════════════════════════════
//  LoadingScreen 加载页（文档功能二）
//  - 星芒纹理背景
//  - 2 只简化 CSS/SVG 猫占位（TODO: 抠图轮替换为真实素材）
//  - 加载文字轮换 + 进度条
//  - onFinish 回调通知父组件关闭
// ════════════════════════════════════════════════════════

const LOADING_TEXTS = [
  '正在准备温暖...',
  '小动物们正在赶来...',
  '正在整理相册...',
  '喵~ 马上就好...',
  'Leila 和猫猫们准备中...'
]

// 简化 SVG 猫（白灰奶猫 A）— 抠图轮替换为 素材2 上排左
function CatA() {
  return (
    <svg viewBox="0 0 80 80" className="loading-cat cat-a" aria-label="白灰奶猫">
      {/* 身体 */}
      <ellipse cx="40" cy="52" rx="26" ry="22" fill="#ffffff" stroke="#e8d8d8" strokeWidth="1.5" />
      {/* 头顶灰斑块 */}
      <path d="M28 38 Q40 30 52 38 Q50 44 40 45 Q30 44 28 38Z" fill="#d4c8c8" opacity="0.7" />
      {/* 耳朵 */}
      <polygon points="20,30 26,16 32,30" fill="#ffffff" stroke="#e8d8d8" strokeWidth="1.5" />
      <polygon points="48,30 54,16 60,30" fill="#ffffff" stroke="#e8d8d8" strokeWidth="1.5" />
      <polygon points="23,28 26,20 29,28" fill="#f8b4b4" opacity="0.5" />
      <polygon points="51,28 54,20 57,28" fill="#f8b4b4" opacity="0.5" />
      {/* 眼睛（琥珀色圆眼）*/}
      <circle cx="32" cy="48" r="3.2" fill="#d4a574" />
      <circle cx="48" cy="48" r="3.2" fill="#d4a574" />
      <circle cx="32.8" cy="47.5" r="1" fill="#fff" />
      <circle cx="48.8" cy="47.5" r="1" fill="#fff" />
      {/* 腮红 */}
      <circle cx="26" cy="54" r="3" fill="#f8b4b4" opacity="0.6" />
      <circle cx="54" cy="54" r="3" fill="#f8b4b4" opacity="0.6" />
      {/* 鼻子嘴 */}
      <path d="M38 55 Q40 57 42 55" fill="#f8b4b4" />
      <path d="M40 57 Q38 60 36 59 M40 57 Q42 60 44 59" stroke="#8b7e7e" strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// 简化 SVG 猫（虎斑棕纹猫 B，眯眼高冷）— 抠图轮替换为 素材4/5
function CatB() {
  return (
    <svg viewBox="0 0 80 80" className="loading-cat cat-b" aria-label="虎斑棕纹猫">
      {/* 身体 */}
      <ellipse cx="40" cy="52" rx="26" ry="22" fill="#d4a574" stroke="#b8895a" strokeWidth="1.5" />
      {/* 虎斑条纹 */}
      <path d="M30 40 Q32 46 30 52" stroke="#8b5a2b" strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round" />
      <path d="M40 38 Q40 46 40 54" stroke="#8b5a2b" strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round" />
      <path d="M50 40 Q48 46 50 52" stroke="#8b5a2b" strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round" />
      {/* 耳朵 */}
      <polygon points="20,30 26,16 32,30" fill="#d4a574" stroke="#b8895a" strokeWidth="1.5" />
      <polygon points="48,30 54,16 60,30" fill="#d4a574" stroke="#b8895a" strokeWidth="1.5" />
      <polygon points="23,28 26,20 29,28" fill="#f8b4b4" opacity="0.5" />
      <polygon points="51,28 54,20 57,28" fill="#f8b4b4" opacity="0.5" />
      {/* 眯眼（高冷慵懒）— 弧线代替圆眼 */}
      <path d="M29 48 Q32 45 35 48" stroke="#5a4a4a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M45 48 Q48 45 51 48" stroke="#5a4a4a" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* 腮红 */}
      <circle cx="26" cy="54" r="3" fill="#f8b4b4" opacity="0.6" />
      <circle cx="54" cy="54" r="3" fill="#f8b4b4" opacity="0.6" />
      {/* 鼻子嘴 */}
      <path d="M38 55 Q40 57 42 55" fill="#8b5a2b" />
      <path d="M40 57 Q38 60 36 59 M40 57 Q42 60 44 59" stroke="#5a4a4a" strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function LoadingScreen({ onFinish }) {
  const [progress, setProgress] = useState(0)
  const [textIdx, setTextIdx] = useState(0)
  const finishedRef = useRef(false)

  // 进度模拟（文档 §Loading simulateLoading）：每 200ms 随机 +，到 100% 停 400ms 淡出
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) return 100
        const next = p + Math.random() * 15 + 5
        return next >= 100 ? 100 : next
      })
    }, 200)

    return () => clearInterval(interval)
  }, [])

  // 加载文字轮换
  useEffect(() => {
    const t = setInterval(() => {
      setTextIdx((i) => (i + 1) % LOADING_TEXTS.length)
    }, 1500)
    return () => clearInterval(t)
  }, [])

  // 到 100% → 等 400ms → 触发淡出 → 600ms 后回调父组件移除
  useEffect(() => {
    if (progress < 100 || finishedRef.current) return
    finishedRef.current = true
    const t = setTimeout(() => {
      onFinish && onFinish()
    }, 400 + 600) // 400 停顿 + 600 淡出动画
    return () => clearTimeout(t)
  }, [progress, onFinish])

  return (
    <div
      className={`loading-screen bg-star-rays ${progress >= 100 ? 'fading' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="loading-cats">
        <img src={loadingIllustration} alt="DooYiYi 与两只猫" className="loading-illustration" />
      </div>

      <div className="loading-text">{LOADING_TEXTS[textIdx]}</div>

      <div className="loading-progress-wrap">
        <div className="loading-progress-track">
          <div
            className="loading-progress-fill"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="loading-percent">{Math.floor(Math.min(progress, 100))}%</div>
      </div>
    </div>
  )
}

export default LoadingScreen
