export interface User {
  id: string
  username: string
  name: string
  avatar_url: string
}

export interface GiveawayRequirement {
  type: 'follow' | 'like' | 'reply'
  username?: string  // only for follow
}

export interface Giveaway {
  id: string
  title: string
  description: string
  winner_count: number
  ends_at: string
  status: 'active' | 'in_progress' | 'ended'
  organizer_id: string
  organizer_username: string
  organizer_avatar: string
  requirements: GiveawayRequirement[]
  created_at: string
}

export interface Participant {
  id: string
  giveaway_id: string
  user_id: string
  username: string
  name: string
  avatar_url: string
  joined_at: string
}

export interface Winner {
  id: string
  giveaway_id: string
  user_id: string
  username: string
  name: string
  avatar_url: string
  prize_number: number
  created_at: string
}
