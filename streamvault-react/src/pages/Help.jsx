import { Link } from 'react-router-dom'
import {
  Flag, Scale, ShieldCheck, Inbox, Copyright, UserCheck, MapPin, Landmark,
  ScrollText, Send, Clapperboard, Cookie,
} from 'lucide-react'

const TILES = [
  ['/content-removal', Flag, 'Report Content', 'Request removal of a video or report abuse'],
  ['/illegal-content-reporting', Scale, 'Report Illegal Content', 'Priority reporting channel'],
  ['/child-safety', ShieldCheck, 'Child Safety', 'Zero-tolerance policy & reporting'],
  ['/complaints-appeals', Inbox, 'Complaints & Appeals', 'Challenge a moderation decision'],
  ['/dmca', Copyright, 'Copyright / DMCA', 'File or dispute a copyright claim'],
  ['/age-assurance', UserCheck, 'Age Assurance', 'How age checks work'],
  ['/uk-users', MapPin, 'UK Users', 'Online Safety Act information'],
  ['/law-enforcement', Landmark, 'Law Enforcement', 'Legal request procedures'],
  ['/content-guidelines', ScrollText, 'Content Guidelines', "What's allowed on StreamVault"],
  ['/content-submission-guidelines', Send, 'Submission Guidelines', 'Technical & policy requirements'],
  ['/content-production-guide', Clapperboard, 'Production Guide', 'Best practices for creators'],
  ['/cookie-notice', Cookie, 'Cookie Notice', 'How we use cookies'],
]

export default function Help() {
  return (
    <div className="container">
      <h1 className="page-title">Help Center</h1>
      <p className="page-sub">Find answers, policies, and ways to reach us.</p>
      <div className="cat-grid">
        {TILES.map(([to, Icon, title, sub]) => (
          <Link className="cat-tile" key={to} to={to}>
            <span className="tile-icon"><Icon size={22} /></span>
            <b>{title}</b>
            <span>{sub}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
