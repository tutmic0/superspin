import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if there's already an active daily giveaway today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: existing } = await supabaseAdmin
      .from('giveaways')
      .select('id')
      .eq('organizer_id', process.env.DAILY_GIVEAWAY_ORGANIZER_ID!)
      .gte('created_at', today.toISOString())
      .single()

    if (existing) {
      return NextResponse.json({ message: 'Daily giveaway already exists', id: existing.id })
    }

    // Calculate fees from yesterday (placeholder — update when Bags API available)
    const reward = process.env.DAILY_REWARD_OVERRIDE || 'Daily Fees Sharing'

    // Create new daily giveaway — ends in 24 hours
    const ends_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { data: giveaway, error } = await supabaseAdmin
      .from('giveaways')
      .insert({
        title: '🎰 Daily Fees Sharing Giveaway',
        description: reward,
        winner_count: 1,
        ends_at,
        status: 'active',
        organizer_id: process.env.DAILY_GIVEAWAY_ORGANIZER_ID!,
        organizer_username: process.env.DAILY_GIVEAWAY_ORGANIZER_USERNAME!,
        organizer_avatar: process.env.DAILY_GIVEAWAY_ORGANIZER_AVATAR || '',
        requirements: [
          { type: 'follow', username: process.env.DAILY_GIVEAWAY_ORGANIZER_USERNAME! },
        ],
      })
      .select()
      .single()

    if (error) throw error

    console.log(`[CRON] Daily giveaway created: ${giveaway.id}`)

    return NextResponse.json({
      success: true,
      id: giveaway.id,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/giveaway/${giveaway.id}`,
    })
  } catch (err: any) {
    console.error('[CRON] Failed to create daily giveaway:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
