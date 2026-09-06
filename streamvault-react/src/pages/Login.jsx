import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { setAdmin } from '../lib/store.js'

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  return (
    <div className="container">
      <div className="form-card">
        <h1><Lock size={20} /> Studio sign in</h1>
        <p className="sub">Admin access only — StreamVault is a curated platform and does not accept public uploads.</p>
        <div className="field">
          <label>Email</label>
          <input type="email" placeholder="admin@streamvault.example" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" placeholder="••••••••" value={pass} onChange={(e) => setPass(e.target.value)} />
        </div>
        {err && <p className="msg-err" style={{ marginBottom: 8 }}>{err}</p>}
        <button className="btn btn-solid" onClick={() => {
          if (!email.trim() || !pass) { setErr('Enter an email and password.'); return }
          setAdmin(true); nav('/admin')
        }}>Sign In</button>
        <div className="notice" style={{ marginTop: 18 }}>
          Demo mode: any email and password signs you in. In production, wire this to real
          authentication (with 2FA) on your backend.
        </div>
      </div>
    </div>
  )
}
