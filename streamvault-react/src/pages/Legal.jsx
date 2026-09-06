import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { LEGAL_PAGES } from '../data/legal.jsx'

export default function LegalPage({ slug }) {
  const page = LEGAL_PAGES[slug]
  if (!page) return <div className="empty">Page not found.</div>
  return (
    <div className="legal">
      <h1>{page.title}</h1>
      <div className="updated">Last updated: September 5, 2026</div>
      <div dangerouslySetInnerHTML={{ __html: page.intro + page.body }} />
    </div>
  )
}

const REASONS = [
  'I appear in this content without my consent',
  'Child safety concern',
  'Illegal content (other)',
  'Copyright infringement (use the DMCA process)',
  'Privacy violation / personal data exposed',
  'Harassment or threats',
  'Impersonation',
  'Other policy violation',
]

export function ContentRemoval() {
  const [sent, setSent] = useState(false)
  return (
    <div className="legal">
      <h1>Content Removal Request</h1>
      <div className="updated">Anyone can file — no account required.</div>
      <p style={{ color: 'var(--muted)' }}>
        Use this form to request removal of a video or comment that violates the law or our policies,
        including content depicting you without consent.
      </p>
      <div className="notice warn" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <AlertTriangle size={18} style={{ color: 'var(--gold)', marginTop: 2 }} />
        <span>
          <strong>Emergencies:</strong> if someone is in immediate danger, contact your local emergency
          services first. Child safety reports are prioritized 24/7 — see the{' '}
          <Link to="/child-safety">Child Safety Policy</Link>.
        </span>
      </div>

      <div className="form-card wide" style={{ margin: '26px 0' }}>
        {sent ? (
          <p className="msg-ok">
            Request received (demo). In production this creates a case number and sends you status
            updates by email.
          </p>
        ) : (
          <>
            <div className="field"><label>URL(s) of the content *</label>
              <textarea placeholder="One URL per line" style={{ minHeight: 80 }} /></div>
            <div className="field"><label>Reason for removal *</label>
              <select defaultValue="">
                <option value="" disabled>Select a reason…</option>
                {REASONS.map((r) => <option key={r}>{r}</option>)}
              </select></div>
            <div className="field"><label>Description *</label>
              <textarea placeholder="Describe the issue. Include timestamps where relevant." /></div>
            <div className="field"><label>Your name *</label><input placeholder="Full legal name" /></div>
            <div className="field"><label>Your email *</label>
              <input type="email" placeholder="We'll send status updates here" /></div>
            <div className="field"><label>Are you the person depicted, or their authorized representative?</label>
              <select>
                <option>Yes — I am the person depicted</option>
                <option>Yes — authorized representative</option>
                <option>No — third-party report</option>
              </select></div>
            <div className="notice">
              Submitting knowingly false reports may lead to action against you. Reports made in good
              faith are always safe to file.
            </div>
            <button className="btn btn-solid" onClick={() => setSent(true)}>Submit Removal Request</button>
          </>
        )}
      </div>

      <h2>What Happens After You Submit</h2>
      <ul>
        <li>You receive an acknowledgment email with a case number</li>
        <li>Requests are triaged by severity; child-safety and imminent-harm reports are handled first, typically within hours</li>
        <li>Non-consensual intimate imagery reports are resolved within 48 hours</li>
        <li>Requests from people depicted in content are honored without dispute</li>
        <li>Other reports are typically resolved within 7 days, with an outcome notification and appeal rights under the <Link to="/complaints-appeals">Complaints &amp; Appeals Policy</Link></li>
      </ul>
      <h2>Copyright Claims</h2>
      <p>
        Copyright removals follow a distinct statutory process — use the <Link to="/dmca">DMCA</Link>{' '}
        procedure instead of this form.
      </p>
    </div>
  )
}
