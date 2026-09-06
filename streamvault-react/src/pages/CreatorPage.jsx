import { useParams } from 'react-router-dom'
import { BadgeCheck } from 'lucide-react'
import { VideoGrid } from '../components/VideoCard.jsx'
import { CREATORS } from '../data/catalog.js'
import { useCatalog } from '../lib/CatalogContext.jsx'

export default function CreatorPage() {
  const { id } = useParams()
  const c = CREATORS.find((x) => x.id === id) || CREATORS[0]
  const vids = useCatalog().videos.filter((v) => v.creator === c.id).sort((a, b) => a.ago - b.ago)
  return (
    <div className="container">
      <div className="creator-row" style={{ marginTop: 30, padding: 26 }}>
        <div className="avatar" style={{ width: 76, height: 76, background: `linear-gradient(135deg,${c.grad[0]},${c.grad[1]})` }}>
          <c.icon size={34} />
        </div>
        <div className="info">
          <div className="name" style={{ fontSize: 22, fontFamily: 'var(--font-head)' }}>
            {c.name} {c.verified && <BadgeCheck size={18} className="verified" />}
          </div>
          <div className="subs">{c.subs} subscribers</div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{c.about}</div>
        </div>
        <button className="btn btn-solid">Subscribe</button>
      </div>
      <div style={{ paddingBottom: 60 }}><VideoGrid videos={vids} /></div>
    </div>
  )
}
