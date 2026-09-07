import { Link } from 'react-router-dom'
import { Play, Flame, Clock, Star, ArrowRight, BookOpen, Radio } from 'lucide-react'
import { VideoGrid } from '../components/VideoCard.jsx'
import CatList from '../components/CatList.jsx'
import { BLOG_POSTS } from '../data/catalog.js'
import { useCatalog } from '../lib/CatalogContext.jsx'

function Row({ icon: Icon, title, to, videos }) {
  if (!videos || videos.length === 0) return null
  return (
    <section className="section">
      <div className="section-head">
        <h2><Icon size={20} /> {title}</h2>
        <Link to={to}>View all <ArrowRight size={14} /></Link>
      </div>
      <VideoGrid videos={videos} />
    </section>
  )
}

export default function Home() {
  const { videos: vids } = useCatalog()
  const studioUploads = vids.filter((v) => v.uploaded || v.srcType === 'stream' || v.id > 1000000000000)

  return (
    <div className="container">
      <section className="hero">
        <h1>Premium videos, <em>hand-picked</em> and beautifully streamed</h1>
        <p>
          Every video on Midnight Clips is uploaded by our own studio — curated, quality-checked,
          and compressed without losing a pixel.
        </p>
        <Link className="btn btn-solid" to="/videos"><Play size={15} fill="currentColor" /> Start Watching</Link>
        <Link className="btn btn-ghost" to="/trending" style={{ marginLeft: 10 }}>
          <Flame size={15} /> See What's Trending
        </Link>
      </section>

      <div className="layout">
        <aside className="sidebar">
          <div className="side-card">
            <h3>Categories</h3>
            <CatList />
          </div>
          <div className="side-card">
            <h3>From the Blog</h3>
            <ul className="cat-list">
              {BLOG_POSTS.map((p) => (
                <li key={p.slug}>
                  <Link to={`/blog/${p.slug}`}><BookOpen size={15} /> {p.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="home-main">
          <div style={{ marginTop: 0 }}>
            {studioUploads.length > 0 && (
              <Row
                icon={Radio}
                title="📡 Studio Uploads & Streams"
                to="/videos"
                videos={studioUploads.slice(0, 4)}
              />
            )}
            <Row
              icon={Flame}
              title="Trending Now"
              to="/trending"
              videos={[...vids].sort((a, b) => (a.uploaded ? -1 : b.uploaded ? 1 : b.views - a.views)).slice(0, 4)}
            />
            <Row
              icon={Flame}
              title="Trending in Desi"
              to="/category/desi"
              videos={[...vids.filter((v) => v.cat === 'desi')].sort((a, b) => (a.uploaded ? -1 : b.uploaded ? 1 : b.views - a.views)).slice(0, 4)}
            />
            <Row
              icon={Clock}
              title="Recently Uploaded"
              to="/videos"
              videos={[...vids].sort((a, b) => (a.uploaded ? -1 : b.uploaded ? 1 : a.ago - b.ago)).slice(0, 4)}
            />
            <Row
              icon={Star}
              title="Midnight Clips Originals"
              to="/videos"
              videos={vids.filter((v) => v.exclusive).slice(0, 4)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
