import { useMemo, useState } from 'react'
import { VideoGrid } from '../components/VideoCard.jsx'
import CatList from '../components/CatList.jsx'
import { useCatalog } from '../lib/CatalogContext.jsx'

const TABS = [
  ['recent', 'Most Recent'],
  ['viewed', 'Most Viewed'],
  ['rated', 'Best Rated'],
  ['originals', 'Originals'],
]

export default function Videos() {
  const [tab, setTab] = useState('recent')
  const [cat, setCat] = useState('all')
  const [maxMins, setMaxMins] = useState(60)
  const { videos: vids } = useCatalog()

  const list = useMemo(() => {
    let l = [...vids]
    if (cat !== 'all') l = l.filter((v) => v.cat === cat)
    if (maxMins < 60) l = l.filter((v) => v.mins <= maxMins)
    if (tab === 'viewed') l = [...l].sort((a, b) => b.views - a.views)
    else if (tab === 'rated') l = [...l].sort((a, b) => b.rating - a.rating)
    else if (tab === 'originals') l = l.filter((v) => v.exclusive).sort((a, b) => a.ago - b.ago)
    else l = [...l].sort((a, b) => a.ago - b.ago)
    return l
  }, [tab, cat, maxMins, vids])

  return (
    <div className="container">
      <h1 className="page-title">Videos</h1>
      <div className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <div className="layout">
        <aside className="sidebar">
          <div className="side-card">
            <h3>Duration <span>minutes</span></h3>
            <div className="duration-slider">
              <input type="range" min="0" max="60" step="5" value={maxMins}
                onChange={(e) => setMaxMins(+e.target.value)} />
              <div className="duration-ticks">
                <span>0</span><span>10</span><span>20</span><span>30</span><span>45</span><span>60+</span>
              </div>
              <div style={{ color: 'var(--faint)', fontSize: 12.5, marginTop: 6 }}>
                Up to <b>{maxMins >= 60 ? 'any length' : maxMins + ' min'}</b>
              </div>
            </div>
          </div>
          <div className="side-card">
            <h3>Categories</h3>
            <CatList active={cat} onPick={setCat} />
          </div>
        </aside>
        <section><VideoGrid videos={list} /></section>
      </div>
    </div>
  )
}
