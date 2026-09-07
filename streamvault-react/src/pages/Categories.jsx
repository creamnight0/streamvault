import { Link } from 'react-router-dom'
import { useCatalog } from '../lib/CatalogContext.jsx'

export default function Categories() {
  const { categories, videos } = useCatalog()

  const getCount = (c) => {
    if (typeof c.count === 'number' && c.count > 0 && !c.custom) return c.count
    return videos.filter((v) => v.cat === c.slug).length
  }

  return (
    <div className="container">
      <h1 className="page-title">Categories</h1>
      <p className="page-sub">Browse every corner of Midnight Clips.</p>
      <div className="cat-grid">
        {categories.map((c) => (
          <Link className="cat-tile" key={c.slug} to={`/category/${c.slug}`}>
            <span className="tile-icon">
              {c.icon ? (
                <c.icon size={22} />
              ) : (
                <span style={{ fontSize: 22, lineHeight: 1 }}>{c.emoji || '🔥'}</span>
              )}
            </span>
            <b>
              {c.name}{' '}
              {c.hot && (
                <span className="badge brand" style={{ fontSize: 9, verticalAlign: 'middle' }}>
                  HOT
                </span>
              )}
              {c.custom && (
                <span className="badge" style={{ fontSize: 9, verticalAlign: 'middle', background: 'rgba(255,255,255,0.08)' }}>
                  CUSTOM
                </span>
              )}
            </b>
            <span>{getCount(c).toLocaleString()} videos</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
