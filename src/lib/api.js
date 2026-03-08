const API = import.meta.env.VITE_API_URL || 'https://api.superspin.online'

// Auth
export const getSession = () => {
  const s = localStorage.getItem('ss_session')
  if (!s) return null
  try {
    const decoded = JSON.parse(atob(s))
    if (decoded.exp < Date.now()) { localStorage.removeItem('ss_session'); return null }
    return decoded
  } catch { return null }
}

export const saveSession = (session) => {
  localStorage.setItem('ss_session', session)
}

export const logout = () => {
  localStorage.removeItem('ss_session')
  window.location.href = '/'
}

export const loginWithX = (returnTo = '/') => {
  window.location.href = `${API}/auth/twitter?state=${returnTo}`
}

// API calls
const authHeaders = () => {
  const s = localStorage.getItem('ss_session')
  return s ? { 'Authorization': `Bearer ${s}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

export const getGiveaways = async () => {
  const res = await fetch(`${API}/api/giveaways`)
  return res.json()
}

export const getGiveaway = async (id) => {
  const res = await fetch(`${API}/api/giveaways/${id}`)
  return res.json()
}

export const createGiveaway = async (data) => {
  const res = await fetch(`${API}/api/giveaways`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  })
  return res.json()
}

export const joinGiveaway = async (id) => {
  const res = await fetch(`${API}/api/giveaways/${id}/join`, {
    method: 'POST',
    headers: authHeaders()
  })
  return res.json()
}

export const getParticipants = async (id) => {
  const res = await fetch(`${API}/api/giveaways/${id}/participants`)
  return res.json()
}

export const saveWinner = async (id, data) => {
  const res = await fetch(`${API}/api/giveaways/${id}/winners`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  })
  return res.json()
}

export const getWinners = async (id) => {
  const res = await fetch(`${API}/api/giveaways/${id}/winners`)
  return res.json()
}
