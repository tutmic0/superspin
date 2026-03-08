// Cloudflare Worker - SuperSpin OAuth + API

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

async function generatePKCE() {
  const array = crypto.getRandomValues(new Uint8Array(32))
  const verifier = Array.from(array, b => ('0' + b.toString(16)).slice(-2)).join('')
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return { verifier, challenge }
}

function toBase64(str) {
  const bytes = new TextEncoder().encode(str)
  const bin = Array.from(bytes, b => String.fromCharCode(b)).join('')
  return btoa(bin)
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env)
    } catch (err) {
      return new Response(`Worker error: ${err.message}\n${err.stack}`, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      })
    }
  }
}

async function handleRequest(request, env) {
  const url = new URL(request.url)

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  // Step 1: Redirect to X login
  if (url.pathname === '/auth/twitter') {
    const { verifier, challenge } = await generatePKCE()
    const returnTo = url.searchParams.get('state') || '/'
    const state = toBase64(JSON.stringify({ verifier, returnTo }))

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.X_CLIENT_ID,
      redirect_uri: env.REDIRECT_URI,
      scope: 'tweet.read users.read offline.access',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256'
    })

    return Response.redirect(`https://twitter.com/i/oauth2/authorize?${params}`, 302)
  }

  // Step 2: Callback from X
  if (url.pathname === '/auth/callback') {
    const code = url.searchParams.get('code')
    const stateParam = url.searchParams.get('state') || ''

    if (!code) {
      return new Response('No code received from X', { status: 400 })
    }

    let verifier = ''
    let returnTo = '/'
    try {
      const decoded = JSON.parse(atob(stateParam))
      verifier = decoded.verifier
      returnTo = decoded.returnTo || '/'
    } catch (e) {
      return new Response(`Invalid state: ${e.message}`, { status: 400 })
    }

    // Exchange code for token
    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${toBase64(`${env.X_CLIENT_ID}:${env.X_CLIENT_SECRET}`)}`
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: env.REDIRECT_URI,
        code_verifier: verifier
      })
    })

    const tokens = await tokenRes.json()

    if (!tokens.access_token) {
      return new Response(`Token error: ${JSON.stringify(tokens)}`, { status: 400 })
    }

    // Get user info
    const userRes = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    })
    const userData = await userRes.json()
    const user = userData.data

    if (!user) {
      return new Response(`User error: ${JSON.stringify(userData)}`, { status: 400 })
    }

    // Save user to Supabase
    await fetch(`${env.SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: user.id,
        username: user.username,
        name: user.name,
        avatar_url: user.profile_image_url?.replace('_normal', '_bigger') || null
      })
    })

    // Create session token
    const sessionData = {
      id: user.id,
      username: user.username,
      name: user.name,
      avatar_url: user.profile_image_url?.replace('_normal', '_bigger') || null,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000
    }
    const session = toBase64(JSON.stringify(sessionData))

    // Redirect to app
    const appUrl = returnTo.startsWith('/') ? `${env.APP_URL}${returnTo}` : env.APP_URL
    return new Response(`<html><head><meta http-equiv="refresh" content="0;url=${appUrl}?session=${encodeURIComponent(session)}"></head></html>`, { status: 200, headers: { 'Content-Type': 'text/html' } })
  }

  // API: Get giveaways
  if (url.pathname === '/api/giveaways' && request.method === 'GET') {
    const res = await supabaseGet(env, 'giveaways?status=eq.active&order=created_at.desc')
    return new Response(res, { headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  // API: Create giveaway
  if (url.pathname === '/api/giveaways' && request.method === 'POST') {
    const user = getUser(request)
    if (!user) return new Response('Unauthorized', { status: 401, headers: CORS })
    const body = await request.json()
    const ends_at = new Date(Date.now() + body.duration_hours * 3600000).toISOString()
    const res = await supabasePost(env, 'giveaways', {
      title: body.title,
      description: body.description,
      prize_count: body.prize_count,
      duration_hours: body.duration_hours,
      ends_at,
      status: 'active',
      organizer_id: user.id,
      organizer_name: user.username,
      organizer_avatar: user.avatar_url
    })
    return new Response(res, { headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  // API: Get single giveaway
  if (url.pathname.match(/^\/api\/giveaways\/[^/]+$/) && request.method === 'GET') {
    const id = url.pathname.split('/')[3]
    const res = await supabaseGet(env, `giveaways?id=eq.${id}`)
    const data = JSON.parse(res)
    return new Response(JSON.stringify(data[0] || null), { headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  // API: Join giveaway
  if (url.pathname.match(/^\/api\/giveaways\/[^/]+\/join$/) && request.method === 'POST') {
    const user = getUser(request)
    if (!user) return new Response('Unauthorized', { status: 401, headers: CORS })
    const id = url.pathname.split('/')[3]
    const joinRes = await fetch(`${env.SUPABASE_URL}/rest/v1/participants`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify({ giveaway_id: id, user_id: user.id, username: user.username, avatar_url: user.avatar_url })
    })
    const joinText = await joinRes.text()
    return new Response(joinText || '[]', { headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  // API: Get participants
  if (url.pathname.match(/^\/api\/giveaways\/[^/]+\/participants$/)) {
    const id = url.pathname.split('/')[3]
    const res = await supabaseGet(env, `participants?giveaway_id=eq.${id}&order=created_at.asc`)
    return new Response(res, { headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  // API: Winners
  if (url.pathname.match(/^\/api\/giveaways\/[^/]+\/winners$/)) {
    const id = url.pathname.split('/')[3]
    if (request.method === 'POST') {
      const user = getUser(request)
      if (!user) return new Response('Unauthorized', { status: 401, headers: CORS })
      const body = await request.json()
      const res = await supabasePost(env, 'winners', { giveaway_id: id, ...body })
      return new Response(res, { headers: { ...CORS, 'Content-Type': 'application/json' } })
    }
    const res = await supabaseGet(env, `winners?giveaway_id=eq.${id}&order=prize_number.asc`)
    return new Response(res, { headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  return new Response('Not found', { status: 404, headers: CORS })
}

function getUser(request) {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const decoded = JSON.parse(atob(auth.slice(7)))
    if (decoded.exp < Date.now()) return null
    return decoded
  } catch { return null }
}

async function supabaseGet(env, path) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`
    }
  })
  return res.text()
}

async function supabasePost(env, table, data) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(data)
  })
  const text = await res.text()
  const status = res.status
  if (!text || text === '') return JSON.stringify({ debug: 'empty response', status })
  return text
}
