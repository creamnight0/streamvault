import { Link } from 'react-router-dom'
import { PLAYLISTS } from '../data/catalog.js'

export default function Playlists() {
  return (
    <div className="container">
      <h1 className="page-title">Playlists</h1>
      <p className="page-sub">Curated collections from creators and the community.</p>
      <div className="cat-grid">
        {PLAYLISTS.map((p) => (
          <Link className="cat-tile" key={p.name} to={`/category/${p.cat}`}>
            <span className="tile-icon"><p.icon size={22} /></span>
            <b>{p.name}</b>
            <span>{p.n} videos</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
