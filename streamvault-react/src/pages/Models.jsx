import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, CheckCircle2, Star, Users, ExternalLink, ChevronDown,
  Sparkles, Filter, Video, Eye, PlaySquare, Heart,
} from 'lucide-react'
import { useCatalog } from '../lib/CatalogContext.jsx'
import { fmtViews } from '../data/catalog.js'

export default function Models() {
  const { models, categories, videos } = useCatalog()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all') // 'all' | 'verified' | 'collab'
  const [selectedCat, setSelectedCat] = useState('all')
  const [sortBy, setSortBy] = useState('rank') // 'rank' | 'views' | 'videos' | 'name'

  // Calculate live dynamic video counts and views for each model based on published videos
  const augmentedModels = useMemo(() => {
    return models.map((m, index) => {
      const modelVideos = videos.filter((v) => v.creator === m.id || v.creator === m.name)
      const dynamicViews = modelVideos.reduce((sum, v) => sum + (v.views || 0), m.views || 0)
      const dynamicVideoCount = Math.max(m.videoCount || 0, modelVideos.length)
      return {
        ...m,
        rank: m.rank || index + 1,
        computedViews: dynamicViews,
        computedVideoCount: dynamicVideoCount,
      }
    })
  }, [models, videos])

  // Filter & sort
  const filteredModels = useMemo(() => {
    return augmentedModels
      .filter((m) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const matchName = m.name?.toLowerCase().includes(q)
          const matchBio = m.bio?.toLowerCase().includes(q)
          const matchCat = m.category?.toLowerCase().includes(q)
          if (!matchName && !matchBio && !matchCat) return false
        }
        if (filterType === 'verified' && !m.verified) return false
        if (filterType === 'collab' && !m.collab) return false
        if (selectedCat !== 'all' && m.category !== selectedCat) return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'rank') return (a.rank || 999) - (b.rank || 999)
        if (sortBy === 'views') return (b.computedViews || 0) - (a.computedViews || 0)
        if (sortBy === 'videos') return (b.computedVideoCount || 0) - (a.computedVideoCount || 0)
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        return 0
      })
  }, [augmentedModels, searchQuery, filterType, selectedCat, sortBy])

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      {/* Page Title */}
      <div style={{ textAlign: 'center', margin: '30px 0 24px' }}>
        <h1 style={{
          fontSize: 34,
          fontWeight: 900,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          margin: 0,
        }}>
          MODELS
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>
          Discover top creators, verified models, and exclusive channel profiles.
        </p>
      </div>

      {/* Search & Filter Toolbar (Exact PimpBunny / Model Directory Styling) */}
      <div className="models-toolbar">
        {/* Search input */}
        <div className="model-search-box">
          <Search size={16} style={{ color: 'var(--brand)' }} />
          <input
            type="search"
            placeholder="Model search…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Pills & Dropdowns */}
        <div className="models-filter-group">
          <button
            type="button"
            className={`model-tab-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            ALL MODELS
          </button>

          <button
            type="button"
            className={`model-tab-btn ${filterType === 'verified' ? 'active' : ''}`}
            onClick={() => setFilterType(filterType === 'verified' ? 'all' : 'verified')}
          >
            <CheckCircle2 size={13} style={{ color: 'var(--brand)' }} /> VERIFIED
          </button>

          <button
            type="button"
            className={`model-tab-btn ${filterType === 'collab' ? 'active' : ''}`}
            onClick={() => setFilterType(filterType === 'collab' ? 'all' : 'collab')}
          >
            <Star size={13} style={{ color: 'var(--gold)' }} /> COLLAB
          </button>

          {/* Sort Dropdown */}
          <div className="select-pill-wrap">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="rank">RANKED #1-10</option>
              <option value="views">MOST VIEWED ▾</option>
              <option value="videos">MOST VIDEOS</option>
              <option value="name">NAME A–Z</option>
            </select>
            <ChevronDown size={13} className="select-arrow" />
          </div>

          {/* Category Filter Dropdown */}
          <div className="select-pill-wrap">
            <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)}>
              <option value="all">ALL CATEGORIES ▾</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={13} className="select-arrow" />
          </div>
        </div>
      </div>

      {/* Models Grid */}
      {filteredModels.length > 0 ? (
        <div className="models-grid">
          {filteredModels.map((m) => {
            const hasCustomPhoto = !!m.avatar
            return (
              <div key={m.id} className="model-card">
                {/* Portrait Photo Box */}
                <div className="model-photo-wrap">
                  {hasCustomPhoto ? (
                    <img src={m.avatar} alt={m.name} className="model-photo" />
                  ) : (
                    <div
                      className="model-photo-fallback"
                      style={{
                        background: `linear-gradient(135deg, ${m.grad?.[0] || '#c62b4a'}, ${m.grad?.[1] || '#8f1d38'})`,
                      }}
                    >
                      <PlaySquare size={38} color="#fff" />
                    </div>
                  )}

                  {/* Top Right AD or Verified Badge */}
                  {m.isAd ? (
                    <div className="model-ad-badge">AD</div>
                  ) : m.verified ? (
                    <div className="model-verified-badge" title="Verified Creator">
                      <CheckCircle2 size={12} /> VERIFIED
                    </div>
                  ) : null}

                  {/* Action Button overlay at bottom of photo */}
                  <div className="model-action-wrap">
                    <Link to={`/creator/${m.id}`} className="model-action-btn">
                      <Video size={13} /> VIEW CHANNEL
                    </Link>
                  </div>
                </div>

                {/* Model Info Section */}
                <div className="model-info">
                  <div className="model-title-row">
                    <span className="model-rank-num">#{m.rank}</span>
                    <Link to={`/creator/${m.id}`} className="model-name">
                      {m.name}
                    </Link>
                  </div>

                  <div className="model-stats-row">
                    <span>{m.computedVideoCount} videos</span>
                    <span><Eye size={12} /> {fmtViews(m.computedViews)}</span>
                  </div>

                  {m.bio && (
                    <p className="model-bio">{m.bio}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty" style={{ padding: '80px 0' }}>
          <h3>No models found</h3>
          <p style={{ color: 'var(--muted)', marginTop: 6 }}>Try adjusting your search query or filters.</p>
          <button
            type="button"
            className="btn btn-outline"
            style={{ marginTop: 14 }}
            onClick={() => {
              setSearchQuery('')
              setFilterType('all')
              setSelectedCat('all')
            }}
          >
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  )
}
