import { useSearchParams } from 'react-router-dom'
import { VideoGrid } from '../components/VideoCard.jsx'
import { creatorOf, catOf } from '../data/catalog.js'
import { useCatalog } from '../lib/CatalogContext.jsx'

export default function SearchPage() {
  const [params] = useSearchParams()
  const q = (params.get('q') || '').trim()
  const t = q.toLowerCase()
  const { videos: vids } = useCatalog()
  const results = q
    ? vids.filter((v) =>
        v.title.toLowerCase().includes(t) ||
        creatorOf(v).name.toLowerCase().includes(t) ||
        catOf(v).name.toLowerCase().includes(t))
    : []
  return (
    <div className="container">
      <h1 className="page-title">{q ? `Results for “${q}”` : 'Search'}</h1>
      <p className="page-sub">{q ? `${results.length} result(s)` : 'Type a query in the search bar above.'}</p>
      <div style={{ padding: '26px 0 60px' }}><VideoGrid videos={results} /></div>
    </div>
  )
}
