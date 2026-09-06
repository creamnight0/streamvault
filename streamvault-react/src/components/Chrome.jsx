import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Play, Search, Sparkles, User } from 'lucide-react'

const NAV = [
  ['/', 'Home'], ['/videos', 'Videos'], ['/categories', 'Categories'],
  ['/models', 'Models'], ['/creators', 'Creators'], ['/trending', 'Trending'],
  ['/playlists', 'Playlists'], ['/blog', 'Blog'], ['/premium', 'Premium'], ['/help', 'Help'],
]

export const LEGAL_LINKS = [
  ['/terms', 'Terms of Service'],
  ['/privacy', 'Privacy Policy'],
  ['/2257', '2257 Statement'],
  ['/dmca', 'DMCA'],
  ['/content-production-guide', 'Content Production Guide'],
  ['/content-submission-guidelines', 'Content Submission Guidelines'],
  ['/uk-users', 'Information for Users in the UK'],
  ['/child-safety', 'Child Safety Policy'],
  ['/illegal-content-reporting', 'Illegal Content Reporting Policy'],
  ['/age-assurance', 'Age Assurance Policy'],
  ['/complaints-appeals', 'Complaints & Appeals Policy'],
  ['/law-enforcement', 'Law Enforcement Requests'],
  ['/content-removal', 'Content Removal Request'],
  ['/content-guidelines', 'Content Guidelines'],
  ['/cookie-notice', 'Cookie Notice'],
]

export function Logo({ small }) {
  return (
    <Link className="logo" to="/" style={small ? { fontSize: 19 } : undefined}>
      <span className="mark" style={small ? { width: 30, height: 30 } : undefined}>
        <Play size={small ? 14 : 17} fill="currentColor" />
      </span>
      STREAM<b>VAULT</b>
    </Link>
  )
}

export function Header() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  return (
    <>
      <div className="utilbar">
        <div className="container">
          <Link to="/trending">Trending</Link>
          <Link to="/categories">Categories</Link>
          <Link to="/models">Models</Link>
          <Link to="/creators">Creators</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/premium">Go Premium</Link>
          <Link to="/help">Help Center</Link>
          <Link to="/admin">Admin</Link>
        </div>
      </div>
      <div className="header-wrap">
        <header className="site-header">
          <div className="container">
            <Logo />
            <div className="searchbox">
              <span className="icon"><Search size={16} /></span>
              <input
                type="search"
                placeholder="Search videos, creators, categories…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && q.trim()) nav('/search?q=' + encodeURIComponent(q.trim()))
                }}
              />
            </div>
            <div className="header-actions">
              <Link className="btn btn-outline" to="/premium"><Sparkles size={15} /> Premium</Link>
              <Link className="btn btn-solid" to="/videos"><Play size={15} fill="currentColor" /> Watch Now</Link>
              <Link className="icon-btn" to="/login" title="Admin sign in"><User size={17} /></Link>
            </div>
          </div>
        </header>
        <nav className="mainnav">
          <div className="container">
            {NAV.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </>
  )
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Logo small />
          <p className="blurb">
            A curated video platform. Every upload is owned or licensed by us, published with
            documented consent, and reviewed before release.
          </p>
        </div>
        <div>
          <h4>Explore</h4>
          <ul>
            <li><Link to="/videos">All Videos</Link></li>
            <li><Link to="/categories">Categories</Link></li>
            <li><Link to="/creators">Creators</Link></li>
            <li><Link to="/trending">Trending</Link></li>
            <li><Link to="/playlists">Playlists</Link></li>
            <li><Link to="/blog">Blog</Link></li>
            <li><Link to="/premium">Premium</Link></li>
          </ul>
        </div>
        <div>
          <h4>Studio</h4>
          <ul>
            <li><Link to="/admin">Admin Panel</Link></li>
            <li><Link to="/content-production-guide">Production Guide</Link></li>
            <li><Link to="/content-submission-guidelines">Submission Guidelines</Link></li>
            <li><Link to="/content-guidelines">Content Guidelines</Link></li>
            <li><Link to="/help">Help Center</Link></li>
          </ul>
        </div>
        <div>
          <h4>Legal &amp; Safety</h4>
          <ul>
            {LEGAL_LINKS.map(([to, label]) => (
              <li key={to}><Link to={to}>{label}</Link></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} StreamVault. All rights reserved. 18+ only. Demo site — for design purposes only.</span>
        <span>
          <Link to="/terms">Terms</Link> · <Link to="/privacy">Privacy</Link> ·{' '}
          <Link to="/cookie-notice">Cookies</Link> · <Link to="/content-removal">Content Removal</Link>
        </span>
      </div>
    </footer>
  )
}
