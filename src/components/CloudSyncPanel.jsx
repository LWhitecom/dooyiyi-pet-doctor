import '../styles/cloud-sync.css'

function CloudSyncPanel({ user, status, onSignOut }) {
  if (!user) return null
  const label = status === 'syncing' ? '☁ 同步中' : status === 'error' ? '☁ 同步失败' : '☁ 已同步'
  return <div className="cloud-sync"><span>{label}</span><button type="button" onClick={onSignOut}>退出</button></div>
}

export default CloudSyncPanel
