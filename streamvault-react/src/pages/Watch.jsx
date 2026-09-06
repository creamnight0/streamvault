import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Eye, Heart, Star, ThumbsUp, ThumbsDown, Share2, Bookmark, Flag, BadgeCheck,
} from 'lucide-react'
import VideoCard, { Thumb } from '../components/VideoCard.jsx'
import StreamPlayer from '../components/StreamPlayer.jsx'
import { creatorOf, catOf, fmtViews, fmtAgo, SAMPLE_SRC } from '../data/catalog.js'
import { useCatalog } from '../lib/CatalogContext.jsx'

const COMMENTS = [
  { name: 'foxtail_88', when: '2 hours ago', text: 'The editing on this one is next level. Instant subscribe.', grad: ['#c2711d', '#6e3410'] },
  { name: 'wavelength', when: '4 hours ago', text: 'Came for the thumbnail, stayed for the whole thing. Great pacing.', grad: ['#1c7a70', '#0d423c'] },
  { name: 'sakura.codes', when: '6 hours ago', text: 'Can you do a follow-up on this? Would love a deeper dive.', grad: ['#b34270', '#5f1f3c'] },
]

export default function Watch() {
  const { id } = useParams()
  const { videos: vids, loading, categories } = useCatalog()
  const v = vids.find((x) => String(x.id) === id)
  const [liked, setLiked] = useState(false)

  const upNext = useMemo(() => {
    if (!v) return []
    const related = vids.filter((x) => x.id !== v.id && (x.cat === v.cat || x.creator === v.creator))
    const rest = vids.filter((x) => x.id !== v.id && !related.includes(x))
    return [...related, ...rest].slice(0, 8)
  }, [v, vids])

  // still fetching the catalog — don't flash a wrong/fallback video
  if (!v && loading) {
    return <div className="container"><div className="empty" style={{ padding: '90px 0' }}>Loading video…</div></div>
  }
  // catalog loaded but this id doesn't exist
  if (!v) {
    return (
      <div className="container">
        <div className="empty" style={{ padding: '90px 0' }}>
          This video isn’t available. It may have been removed.<br />
          <Link to="/videos" style={{ color: 'var(--brand)', fontWeight: 600 }}>Browse all videos →</Link>
        </div>
      </div>
    )
  }

  const c = creatorOf(v)
  const cat = categories?.find((catItem) => catItem.slug === v.cat) || catOf(v)
  const CatIcon = cat.icon
  const src = v.src || v.streamUrl || v.embed || SAMPLE_SRC[v.id % SAMPLE_SRC.length]

  return (
    <div className="container">
      <div className="watch">
        <section>
          <div className="player">
            <StreamPlayer
              videoId={v.id}
              src={src}
              poster={v.thumb}
              autoPlay={false}
              suggestions={upNext}
              startTime={typeof v.startTime === 'number' ? v.startTime : 5}
            />
          </div>
          <h1>{v.title}</h1>
          <div className="watch-meta">
            <span><Eye size={15} /> {fmtViews(v.views)} views</span>
            <span><Heart size={15} /> {fmtViews(v.likes)}</span>
            {v.rating > 0 && <span><Star size={15} /> {v.rating}</span>}
            <span>{fmtAgo(v.ago)}</span>
            <Link to={`/category/${cat.slug}`}>
              {CatIcon ? (
                <CatIcon size={15} />
              ) : (
                <span style={{ fontSize: 13, marginRight: 2, lineHeight: 1 }}>{cat.emoji || '🔥'}</span>
              )}
              {cat.name}
            </Link>
            {v.q && <span className="badge">{v.q}</span>}
            {v.exclusive && <span className="badge brand">ORIGINAL</span>}
          </div>
          <div className="watch-actions">
            <button className="btn btn-ghost" style={liked ? { color: 'var(--brand)', borderColor: 'var(--brand)' } : undefined}
              onClick={() => setLiked(!liked)}>
              <ThumbsUp size={15} /> {liked ? `Liked (${fmtViews(v.likes + 1)})` : 'Like'}
            </button>
            <button className="btn btn-ghost"><ThumbsDown size={15} /></button>
            <button className="btn btn-ghost"><Share2 size={15} /> Share</button>
            <button className="btn btn-ghost"><Bookmark size={15} /> Save</button>
            <Link className="btn btn-ghost" to="/content-removal"><Flag size={15} /> Report</Link>
          </div>
          <div className="creator-row">
            <div className="avatar" style={{ background: `linear-gradient(135deg,${c.grad[0]},${c.grad[1]})` }}>
              <c.icon size={22} />
            </div>
            <div className="info">
              <Link className="name" to={`/creator/${c.id}`}>
                {c.name} {c.verified && <BadgeCheck size={16} className="verified" />}
              </Link>
              <div className="subs">{c.subs} subscribers</div>
            </div>
            <button className="btn btn-solid">Subscribe</button>
          </div>
          <div className="desc-box">
            {v.desc || c.about}
            <br /><br />
            Uploaded {fmtAgo(v.ago)} in <Link to={`/category/${cat.slug}`}>{cat.name}</Link>.
            {v.tags ? <> Tags: {v.tags}.</> : null}
            {!v.desc && ' Demo description — sample video courtesy of the Blender Foundation / Google sample media library.'}
          </div>

          <div className="comments">
            <h3>Comments ({COMMENTS.length})</h3>
            <div className="comment-input">
              <div className="avatar" style={{ background: 'linear-gradient(135deg,#c62b4a,#8f1d38)' }}>
                <Heart size={18} />
              </div>
              <input placeholder="Add a comment… (sign in required)" />
            </div>
            {COMMENTS.map((cm) => (
              <div className="comment" key={cm.name}>
                <div className="avatar" style={{ background: `linear-gradient(135deg,${cm.grad[0]},${cm.grad[1]})` }}>
                  {cm.name[0].toUpperCase()}
                </div>
                <div className="body">
                  <b>{cm.name}</b><span>{cm.when}</span>
                  <p>{cm.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="upnext">
          <h3>Up Next</h3>
          {upNext.map((x) => <VideoCard key={x.id} v={x} />)}
        </aside>
      </div>
    </div>
  )
}
