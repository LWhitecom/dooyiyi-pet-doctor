import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// iOS < 15.4 无 crypto.randomUUID，补一个兜底（照片上传 / 贴纸生成会用到）
if (typeof crypto === 'undefined' || !crypto.randomUUID) {
  const polyfill = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
  try {
    if (typeof crypto === 'undefined') window.crypto = { randomUUID: polyfill }
    else crypto.randomUUID = polyfill
  } catch { /* crypto 只读时忽略，调用处会再兜底 */ }
}

// 设计系统（顺序重要：变量先于其它）
import './styles/variables.css'
import './styles/textures.css'
import './styles/global.css'
import './styles/animations.css'
import './styles/app-skeleton.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
