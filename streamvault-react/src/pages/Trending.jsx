import { VideoGrid } from '../components/VideoCard.jsx'
import { useCatalog } from '../lib/CatalogContext.jsx'

export default function Trending() {
  return (
    <div className="container">
      <h1 className="page-title">Trending</h1>
      <p className="page-sub">The most-watched videos on StreamVault right now.</p>
      <div style={{ padding: '26px 0 60px' }}>
        <VideoGrid videos={[...useCatalog().videos].sort((a, b) => b.views - a.views)} />
      </div>
    </div>
  )
}
