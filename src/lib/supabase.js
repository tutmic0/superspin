import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Giveaways
export const createGiveaway = async (data) => {
  const ends_at = new Date(Date.now() + data.duration_hours * 3600000).toISOString()
  const { data: g, error } = await supabase.from('giveaways')
    .insert({ ...data, ends_at, status: 'active' }).select().single()
  if (error) throw error
  return g
}

export const getGiveaway = async (id) => {
  const { data, error } = await supabase.from('giveaways').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export const getActiveGiveaways = async () => {
  const { data, error } = await supabase.from('giveaways').select('*')
    .eq('status', 'active').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const closeGiveaway = async (id) => {
  await supabase.from('giveaways').update({ status: 'closed' }).eq('id', id)
}

// Participants
export const joinGiveaway = async (data) => {
  const { data: p, error } = await supabase.from('participants')
    .upsert(data, { onConflict: 'giveaway_id,user_id' }).select().single()
  if (error) throw error
  return p
}

export const getParticipants = async (giveaway_id) => {
  const { data, error } = await supabase.from('participants').select('*')
    .eq('giveaway_id', giveaway_id).order('created_at', { ascending: true })
  if (error) throw error
  return data
}

// Winners
export const saveWinner = async (data) => {
  const { data: w, error } = await supabase.from('winners').insert(data).select().single()
  if (error) throw error
  return w
}

export const getWinners = async (giveaway_id) => {
  const { data, error } = await supabase.from('winners').select('*')
    .eq('giveaway_id', giveaway_id).order('prize_number', { ascending: true })
  if (error) throw error
  return data
}
