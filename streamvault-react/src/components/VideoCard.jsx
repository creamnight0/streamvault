import { Link } from 'react-router-dom'
import { Play, Eye, Heart, BadgeCheck, Clapperboard } from 'lucide-react'
import { creatorOf, fmtViews, fmtAgo } from '../data/catalog.js'

export function Thumb({ v, art = 44 }) {
  const Icon = v.icon || Clapperboard
  const bg = v.thumb
    ? { background: `url('${v.thumb}') center/cover no-repeat` }
    : { background: `linear-gradient(135deg,${v.grad[0]},${v.grad[1]})` }
  return (
    <Link className="thumb" to={`/watch/${v.id}`} style={bg}>
      {!v.thumb && <span className="art"><Icon size={art} strokeWidth={1.4} /></span>}
      <span className="play"><span><Play size={22} fill="currentColor" /></span></span>
      {v.q && <span className="badge q">{v.q}</span>}
      <span className="dur">{v.dur}</span>
    </Link>
  )
}

export default function VideoCard({ v }) {
  const c = creatorOf(v)
  return (
    <div className="card">
      <Thumb v={v} />
      <Link className="title" to={`/watch/${v.id}`}>{v.title}</Link>
      <div className="meta">
        <Link className="creator" to={`/creator/${c.id}`}>
          {c.name}
          {c.verified && <BadgeCheck size={14} className="verified" />}
        </Link>
        <span><Eye size={13} /> {fmtViews(v.views)}</span>
        <span><Heart size={13} /> {fmtViews(v.likes)}</span>
        <span>{fmtAgo(v.ago)}</span>
      </div>
    </div>
  )
}

export function VideoGrid({ videos }) {
  if (!videos.length) return <div className="empty">No videos match these filters.</div>
  return (
    <div className="grid">
      {videos.map((v) => <VideoCard key={v.id} v={v} />)}
    </div>
  )
}
