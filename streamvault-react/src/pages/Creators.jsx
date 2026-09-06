import { Link } from 'react-router-dom'
import { BadgeCheck } from 'lucide-react'
import { CREATORS } from '../data/catalog.js'

export default function Creators() {
  return (
    <div className="container">
      <h1 className="page-title">Creators</h1>
      <p className="page-sub">The people behind the videos.</p>
      <div className="creator-grid">
        {CREATORS.filter((c) => c.id !== 'streamvault').map((c) => (
          <div className="creator-card" key={c.id}>
            <div className="avatar" style={{ background: `linear-gradient(135deg,${c.grad[0]},${c.grad[1]})` }}>
              <c.icon size={30} />
            </div>
            <b>{c.name} {c.verified && <BadgeCheck size={16} className="verified" />}</b>
            <p>{c.subs} subscribers</p>
            <Link className="btn btn-outline" to={`/creator/${c.id}`}>View Channel</Link>
          </div>
        ))}
      </div>
    </div>
  )
}
