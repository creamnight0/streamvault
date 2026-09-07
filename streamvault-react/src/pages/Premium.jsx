import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'

const PLANS = [
  { name: 'Free', price: '$0', per: '/month', cta: 'Get Started', btn: 'btn-ghost',
    features: ['Unlimited watching in HD', 'Comment, like & subscribe', 'Save playlists & watch history', 'Ad-supported'] },
  { name: 'Premium', price: '$7.99', per: '/month', cta: 'Try 30 Days Free', btn: 'btn-solid', featured: true,
    features: ['Everything in Free', 'No ads, ever', '4K & HDR streaming', 'Offline downloads', 'Exclusive Midnight Clips Originals'] },
  { name: 'VIP Annual', price: '$59.99', per: '/year', cta: 'Go VIP', btn: 'btn-outline',
    features: ['Everything in Premium', 'Two months free vs. monthly', 'Early access to Originals', 'VIP badge in comments', 'Priority support'] },
]

export default function Premium() {
  return (
    <div className="container">
      <h1 className="page-title">Go Premium</h1>
      <p className="page-sub">
        Ad-free viewing, 4K streaming, offline downloads, and exclusive Originals — while directly
        supporting the platform.
      </p>
      <div className="plans">
        {PLANS.map((p) => (
          <div className={`plan${p.featured ? ' featured' : ''}`} key={p.name}>
            {p.featured && <span className="tag">MOST POPULAR</span>}
            <h3>{p.name}</h3>
            <div className="price">{p.price}<small>{p.per}</small></div>
            <ul>
              {p.features.map((f) => <li key={f}><Check size={15} /> {f}</li>)}
            </ul>
            <Link className={`btn ${p.btn}`} to="/login">{p.cta}</Link>
          </div>
        ))}
      </div>
    </div>
  )
}
