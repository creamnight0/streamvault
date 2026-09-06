/* Local flags only (session conveniences). Video data lives on the backend — see lib/api.js. */
export function store(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
export function storeSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); return true } catch { return false }
}

export const isAdmin = () => store('sv-admin', false)
export const setAdmin = (val) => storeSet('sv-admin', val)
export const ageOk = () => store('sv-age-ok', false)
export const setAgeOk = () => storeSet('sv-age-ok', true)
