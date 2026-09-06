import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { VideoGrid } from '../components/VideoCard.jsx'
import { useCatalog } from '../lib/CatalogContext.jsx'

const TABS = [['recent', 'Most Recent'], ['viewed', 'Most Viewed'], ['rated', 'Best Rated']]

export default function CategoryPage() {
  const { slug } = useParams()
  const { categories, videos: vids } = useCatalog()
  const cat = categories.find((c) => c.slug === slug) || {
    slug,
    name: slug.toUpperCase(),
    emoji: '🔥',
    count: 0,
  }
  const [tab, setTab] = useState('recent')
  const Icon = cat.icon

  const list = useMemo(() => {
    let l = vids.filter((v) => v.cat === cat.slug)
    if (tab === 'viewed') l = [...l].sort((a, b) => b.views - a.views)
    else if (tab === 'rated') l = [...l].sort((a, b) => b.rating - a.rating)
    else l = [...l].sort((a, b) => a.ago - b.ago)
    return l
  }, [tab, cat.slug, vids])

  const videoCount = cat.count || list.length

  return (
    <div className="container">
      <h1 className="page-title" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        {Icon ? (
          <Icon size={28} style={{ color: 'var(--brand)' }} />
        ) : (
          <span style={{ fontSize: 28, lineHeight: 1 }}>{cat.emoji || '🔥'}</span>
        )}
        {cat.name}
      </h1>
      <p className="page-sub">{videoCount.toLocaleString()} videos in this category</p>
      <div className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <div style={{ paddingBottom: 60 }}><VideoGrid videos={list} /></div>
    </div>
  )
}
