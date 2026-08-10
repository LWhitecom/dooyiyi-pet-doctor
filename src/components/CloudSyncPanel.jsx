import { useState } from 'react'
import '../styles/cloud-sync.css'

function CloudSyncPanel({ user, status, onSignIn, onSignUp, onSignOut }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async (action, mode) => {
    setBusy(true)
    setMessage('')
    try {
      const result = await action(email, password)
      setMessage(mode === 'signup' && !result?.session ? '请先到邮箱完成确认，再回来点击“登录”。' : '已连接云端，正在同步…')
    } catch (error) {
      setMessage(error.message || '操作失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  if (user) return <div className="cloud-sync"><span>☁ 已同步</span><button type="button" onClick={onSignOut}>退出</button></div>
  return <div className="cloud-sync-wrap"><button type="button" className="cloud-sync-trigger" onClick={() => setOpen((value) => !value)}>☁ 云同步</button>{open && <div className="cloud-sync-card"><strong>登录后同步照片墙</strong><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="邮箱" autoComplete="email" /><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="密码（至少 6 位）" autoComplete="current-password" /><div><button type="button" disabled={busy} onClick={() => submit(onSignIn, 'signin')}>登录</button><button type="button" disabled={busy} onClick={() => submit(onSignUp, 'signup')}>注册</button></div>{message && <p>{message}</p>}</div>}</div>
}

export default CloudSyncPanel
