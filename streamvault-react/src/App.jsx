import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Header, Footer } from './components/Chrome.jsx'
import AgeGate from './components/AgeGate.jsx'
import Home from './pages/Home.jsx'
import Videos from './pages/Videos.jsx'
import Watch from './pages/Watch.jsx'
import Categories from './pages/Categories.jsx'
import CategoryPage from './pages/CategoryPage.jsx'
import Creators from './pages/Creators.jsx'
import CreatorPage from './pages/CreatorPage.jsx'
import Models from './pages/Models.jsx'
import Trending from './pages/Trending.jsx'
import Playlists from './pages/Playlists.jsx'
import SearchPage from './pages/SearchPage.jsx'
import Blog from './pages/Blog.jsx'
import BlogPost from './pages/BlogPost.jsx'
import Premium from './pages/Premium.jsx'
import Help from './pages/Help.jsx'
import Login from './pages/Login.jsx'
import Admin from './pages/Admin.jsx'
import LegalPage, { ContentRemoval } from './pages/Legal.jsx'
import { LEGAL_PAGES } from './data/legal.jsx'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/models" element={<Models />} />
          <Route path="/creators" element={<Creators />} />
          <Route path="/creator/:id" element={<CreatorPage />} />
          <Route path="/trending" element={<Trending />} />
          <Route path="/playlists" element={<Playlists />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/premium" element={<Premium />} />
          <Route path="/help" element={<Help />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/content-removal" element={<ContentRemoval />} />
          {Object.keys(LEGAL_PAGES).map((slug) => (
            <Route key={slug} path={`/${slug}`} element={<LegalPage slug={slug} />} />
          ))}
          <Route path="*" element={<div className="empty" style={{ padding: '100px 0' }}>Page not found.</div>} />
        </Routes>
      </main>
      <Footer />
      <AgeGate />
    </>
  )
}
