import { Link } from 'react-router-dom'
import { BLOG_POSTS } from '../data/catalog.js'

export default function Blog() {
  return (
    <div className="container">
      <h1 className="page-title">The Midnight Clips Blog</h1>
      <p className="page-sub">Product news, creator spotlights, and the engineering behind the player.</p>
      <div className="blog-grid">
        {BLOG_POSTS.map((p) => (
          <Link className="post-card" key={p.slug} to={`/blog/${p.slug}`}>
            <div className="cover" style={{ background: `linear-gradient(135deg,${p.grad[0]},${p.grad[1]})` }}>
              <p.icon size={44} strokeWidth={1.4} />
            </div>
            <div className="body">
              <span className="tag">{p.tag}</span>
              <h3>{p.title}</h3>
              <p>{p.excerpt}</p>
              <span className="date">{p.date}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
