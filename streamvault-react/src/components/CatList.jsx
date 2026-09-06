import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'
import { useCatalog } from '../lib/CatalogContext.jsx'

/* Sidebar category list. When onPick is given it acts as an in-page filter;
   otherwise entries link to /category/:slug. */
export default function CatList({ active = '', onPick }) {
  const { categories, videos } = useCatalog()

  const getCount = (c) => {
    if (typeof c.count === 'number' && c.count > 0 && !c.custom) return c.count
    return videos.filter((v) => v.cat === c.slug).length
  }

  const total = categories.reduce((s, c) => s + getCount(c), 0)

  const item = (slug, label, count, Icon, emoji, hot) => {
    const cls = active === slug ? 'active' : ''
    const inner = (
      <>
        {Icon ? (
          <Icon size={16} />
        ) : (
          <span style={{ fontSize: 14, width: 16, display: 'inline-block', textAlign: 'center', lineHeight: 1 }}>
            {emoji || '🔥'}
          </span>
        )}
        {label}
        {hot && <span className="badge brand" style={{ fontSize: 9 }}>HOT</span>}
        <span className="count">{count.toLocaleString()}</span>
      </>
    )
    return onPick ? (
      <a href="#" className={cls} onClick={(e) => { e.preventDefault(); onPick(slug) }}>{inner}</a>
    ) : (
      <Link className={cls} to={slug === 'all' ? '/videos' : `/category/${slug}`}>{inner}</Link>
    )
  }

  return (
    <ul className="cat-list">
      <li key="all">{item('all', 'All', total, null, '📁', false)}</li>
      {categories.map((c) => (
        <li key={c.slug}>{item(c.slug, c.name, getCount(c), c.icon, c.emoji, c.hot)}</li>
      ))}
    </ul>
  )
}
