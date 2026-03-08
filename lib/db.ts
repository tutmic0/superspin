import { createClient } from './supabase'
import type { Giveaway, Participant, Winner } from '@/types'

// ============ GIVEAWAYS ============

export async function createGiveaway(data: {
  title: string
  description: string
  winner_count: number
  ends_at: string
  organizer_id: string
  organizer_username: string
  organizer_avatar: string
}): Promise<Giveaway> {
  const supabase = createClient()
  const { data: giveaway, error } = await supabase
    .from('giveaways')
    .insert({ ...data, status: 'active' })
    .select()
    .single()
  if (error) throw error
  return giveaway
}

export async function getGiveaway(id: string): Promise<Giveaway | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('giveaways')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function getActiveGiveaways(): Promise<Giveaway[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('giveaways')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  if (error) return []
  return data || []
}

export async function getEndedGiveaways(): Promise<Giveaway[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('giveaways')
    .select('*')
    .eq('status', 'ended')
    .order('created_at', { ascending: false })
  if (error) return []
  return data || []
}

export async function updateGiveawayStatus(id: string, status: 'active' | 'in_progress' | 'ended') {
  const supabase = createClient()
  const { error } = await supabase
    .from('giveaways')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

// ============ PARTICIPANTS ============

export async function joinGiveaway(data: {
  giveaway_id: string
  user_id: string
  username: string
  name: string
  avatar_url: string
}): Promise<Participant> {
  const supabase = createClient()
  const { data: participant, error } = await supabase
    .from('participants')
    .upsert(data, { onConflict: 'giveaway_id,user_id' })
    .select()
    .single()
  if (error) throw error
  return participant
}

export async function getParticipants(giveaway_id: string): Promise<Participant[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('giveaway_id', giveaway_id)
    .order('joined_at', { ascending: true })
  if (error) return []
  return data || []
}

// ============ WINNERS ============

export async function saveWinner(data: {
  giveaway_id: string
  user_id: string
  username: string
  name: string
  avatar_url: string
  prize_number: number
}): Promise<Winner> {
  const supabase = createClient()
  const { data: winner, error } = await supabase
    .from('winners')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return winner
}

export async function getWinners(giveaway_id: string): Promise<Winner[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('winners')
    .select('*')
    .eq('giveaway_id', giveaway_id)
    .order('prize_number', { ascending: true })
  if (error) return []
  return data || []
}
