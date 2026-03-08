import { supabase } from './supabase'

export const loginWithX = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'twitter',
    options: {
      redirectTo: window.location.origin + '/auth/callback',
      scopes: 'tweet.read users.read'
    }
  })
  if (error) console.error('Login error:', error)
}

export const logout = async () => {
  await supabase.auth.signOut()
  window.location.href = '/'
}
