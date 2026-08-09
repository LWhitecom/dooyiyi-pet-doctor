import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

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
