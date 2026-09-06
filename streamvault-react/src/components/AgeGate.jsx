import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import { ageOk, setAgeOk } from '../lib/store.js'

export default function AgeGate() {
  const [open, setOpen] = useState(!ageOk())
  if (!open) return null
  return (
    <div className="age-gate">
      <div className="age-card">
        <div className="mark"><Play size={26} fill="currentColor" /></div>
        <h2>This website is for adults only</h2>
        <p>
          You must be <strong>18 years or older</strong> (or the age of majority in your
          jurisdiction) to enter. By entering you confirm your age and accept our terms.
        </p>
        <div className="links">
          <Link to="/terms">Terms</Link> · <Link to="/privacy">Privacy</Link> ·{' '}
          <Link to="/age-assurance">Age Assurance</Link> · <Link to="/cookie-notice">Cookies</Link>
        </div>
        <div className="btns">
          <button className="btn btn-solid" onClick={() => { setAgeOk(); setOpen(false) }}>
            I am 18 or older — Enter
          </button>
          <button className="btn btn-ghost" onClick={() => { window.location.href = 'https://www.google.com' }}>
            Exit
          </button>
        </div>
      </div>
    </div>
  )
}
