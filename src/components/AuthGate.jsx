import { useEffect, useMemo, useState } from 'react'
import loginArtwork from '../assets/images/cutout/登录界面.png'
import signupArtwork from '../assets/images/cutout/注册页面.png'
import resetArtwork from '../assets/images/cutout/忘记密码界面.png'
import '../styles/auth-gate.css'

const pageCopy = {
  login: { title: '欢迎回来', subtitle: '回到属于你的小世界', artwork: loginArtwork },
  signup: { title: '注册', subtitle: '开启属于你的小世界', artwork: signupArtwork },
  reset: { title: '忘记密码', subtitle: '重新找回你的小世界', artwork: resetArtwork },
}

function AuthGate({ onSignIn, onSendSignupCode, onVerifySignupCode, onSendResetCode, onResetPassword }) {
  const [page, setPage] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)

  const content = useMemo(() => pageCopy[page], [page])
  const changePage = (nextPage) => {
    setPage(nextPage)
    setMessage('')
    setCode('')
    setCodeSent(false)
    setSecondsLeft(0)
  }

  useEffect(() => {
    if (page !== 'signup' || secondsLeft <= 0) return undefined
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [page, secondsLeft])

  const validPassword = () => {
    if (password.length < 6) {
      setMessage('密码至少需要 6 位。')
      return false
    }
    if (password !== confirmPassword) {
      setMessage('两次输入的密码不一致。')
      return false
    }
    return true
  }

  const run = async (task) => {
    setBusy(true)
    setMessage('')
    try {
      await task()
    } catch (error) {
      setMessage(error.message || '操作失败，请稍后重试。')
    } finally {
      setBusy(false)
    }
  }

  const sendCode = () => run(async () => {
    if (!email) throw new Error('请先填写邮箱。')
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('请输入正确的邮箱地址。')
    if (page === 'signup') await onSendSignupCode(email)
    else await onSendResetCode(email)
    setCodeSent(true)
    if (page === 'signup') {
      setSecondsLeft(60)
      setMessage('验证码已发送，请查收邮箱；60 秒后可重新获取。')
    } else {
      setMessage('验证码已发送，请查看邮箱。')
    }
  })

  const submit = () => run(async () => {
    if (!email) throw new Error('请填写邮箱。')
    if (page === 'login') {
      if (!password) throw new Error('请填写密码。')
      await onSignIn(email, password)
      return
    }
    if (!validPassword()) return
    if (!codeSent) throw new Error('请先获取邮件验证码。')
    if (!/^\d{8}$/.test(code)) throw new Error('请输入完整的 8 位验证码。')
    if (page === 'signup') await onVerifySignupCode(email, code, password)
    else await onResetPassword(email, code, password)
  })

  return <main className="auth-gate" aria-label="账号登录">
    <div className="auth-gate-grid" aria-hidden="true" />
    <section className={`auth-page auth-page--${page}`} aria-live="polite">
      <div className="auth-visual" aria-hidden="true"><img src={content.artwork} alt="" /></div>
      <div className="auth-form-card">
        <p className="auth-eyebrow">DooYiYi · private space</p>
        <h1>{content.title}</h1><p className="auth-subtitle">{content.subtitle}</p>
        <label className="auth-field"><span>✉</span><input value={email} onChange={(event) => setEmail(event.target.value.trim())} type="email" inputMode="email" placeholder="邮箱" autoComplete="email" disabled={busy} /></label>
        {page !== 'login' && <label className="auth-field auth-code"><span>⌾</span><input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))} maxLength={8} inputMode="numeric" autoComplete="one-time-code" placeholder="验证码" disabled={busy} /><button type="button" onClick={sendCode} disabled={busy || (page === 'signup' && (!/^\S+@\S+\.\S+$/.test(email) || secondsLeft > 0))}>{busy ? '发送中…' : page === 'signup' && secondsLeft > 0 ? `${secondsLeft}s 后重试` : codeSent ? '重新获取' : '获取验证码'}</button></label>}
        <label className="auth-field"><span>▣</span><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} placeholder={page === 'reset' ? '新密码' : '密码'} autoComplete={page === 'login' ? 'current-password' : 'new-password'} disabled={busy} /><button type="button" className="auth-eye" aria-label={showPassword ? '隐藏密码' : '显示密码'} onClick={() => setShowPassword((value) => !value)}>◉</button></label>
        {page !== 'login' && <label className="auth-field"><span>▣</span><input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type={showPassword ? 'text' : 'password'} placeholder="确认密码" autoComplete="new-password" disabled={busy} /></label>}
        <button type="button" className="auth-submit" onClick={submit} disabled={busy}>{busy ? '请稍候…' : page === 'login' ? '登录并同步' : page === 'signup' ? '注册' : '重置密码'}</button>
        {message && <p className="auth-message" role="status">{message}</p>}
        <nav className="auth-links" aria-label="账号操作">{page === 'login' ? <><button type="button" onClick={() => changePage('reset')}>忘记密码？</button><button type="button" onClick={() => changePage('signup')}>注册账号</button></> : <button type="button" onClick={() => changePage('login')}>已有账号？返回登录</button>}</nav>
      </div>
    </section>
  </main>
}

export default AuthGate
