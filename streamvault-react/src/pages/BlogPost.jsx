import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { BLOG_POSTS } from '../data/catalog.js'

export default function BlogPost() {
  const { slug } = useParams()
  const p = BLOG_POSTS.find((x) => x.slug === slug) || BLOG_POSTS[0]
  return (
    <article className="article">
      <span className="tag">{p.tag}</span>
      <h1>{p.title}</h1>
      <div className="date">{p.date} · Midnight Clips Team</div>
      <div className="cover" style={{ background: `linear-gradient(135deg,${p.grad[0]},${p.grad[1]})` }}>
        <p.icon size={54} strokeWidth={1.3} />
      </div>
      {p.body.map((par, i) => <p key={i}>{par}</p>)}
      <Link className="back" to="/blog"><ArrowLeft size={15} /> Back to the blog</Link>
    </article>
  )
}
