'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase'
import { getActiveGiveaways, getEndedGiveaways } from '@/lib/db'
import type { Giveaway } from '@/types'
import type { User } from '@supabase/supabase-js'
import CreateGiveawayModal from '@/components/CreateGiveawayModal'

function timeLeft(endsAt: string, status?: string): string {
  if (status === 'ended' || status === 'in_progress') return 'ENDED'
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return 'ENDED'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [activeGiveaways, setActiveGiveaways] = useState<Giveaway[]>([])
  const [endedGiveaways, setEndedGiveaways] = useState<Giveaway[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState<'active' | 'ended'>('active')
  const [timers, setTimers] = useState<Record<string, string>>({})
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    Promise.all([getActiveGiveaways(), getEndedGiveaways()]).then(([active, ended]) => {
      setActiveGiveaways(active)
      setEndedGiveaways(ended)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const tick = () => {
      const updated: Record<string, string> = {}
      activeGiveaways.forEach(g => { updated[g.id] = timeLeft(g.ends_at, g.status) })
      setTimers(updated)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [activeGiveaways])

  const handleHostClick = () => {
    if (!user) {
      supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      return
    }
    setShowCreate(true)
  }

  const onGiveawayCreated = (id: string) => {
    setShowCreate(false)
    router.push(`/giveaway/${id}`)
  }

  const displayed = tab === 'active' ? activeGiveaways : endedGiveaways
  const pad = isMobile ? '0 16px' : '0 40px'

  return (
    <>
      <Navbar />
      <main style={{ flex: 1, padding: '0 0 80px' }}>
        <div style={{ textAlign: 'center', padding: isMobile ? '48px 20px 40px' : '80px 40px 60px', position: 'relative' }}>
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: isMobile ? 300 : 600, height: isMobile ? 200 : 300,
            background: 'radial-gradient(ellipse, rgba(178,75,255,0.12), transparent 70%)',
            pointerEvents: 'none',
          }} />
          <h1 style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: isMobile ? '2rem' : 'clamp(2.5rem, 6vw, 4rem)',
            fontWeight: 900,
            letterSpacing: isMobile ? '2px' : '4px',
            background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple), var(--neon-pink))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '12px',
            position: 'relative',
          }}>
            SUPERSPIN
          </h1>
          <p style={{
            fontSize: isMobile ? '0.95rem' : '1.1rem',
            color: 'var(--text-dim)',
            maxWidth: 500,
            margin: '0 auto 32px',
            lineHeight: 1.6,
            padding: isMobile ? '0 8px' : '0',
          }}>
            Host transparent giveaways with X authentication. Spin the wheel, pick winners live.
          </p>
          <button onClick={handleHostClick} style={{
            padding: isMobile ? '14px 32px' : '16px 48px',
            background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))',
            border: 'none', borderRadius: '50px', color: '#fff',
            fontFamily: 'Orbitron, monospace',
            fontSize: isMobile ? '0.7rem' : '0.8rem',
            fontWeight: 700, letterSpacing: '3px', cursor: 'pointer',
            boxShadow: '0 0 40px rgba(178,75,255,0.4)',
            transition: 'all 0.3s',
          }}>
            🎁 HOST A GIVEAWAY
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: isMobile ? '0 16px 20px' : '0 40px 24px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neon-purple)', boxShadow: '0 0 8px var(--neon-purple)' }} />
          <button onClick={() => setTab('active')} style={{
            fontFamily: 'Orbitron, monospace', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '3px',
            color: tab === 'active' ? '#fff' : 'var(--text-dim)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            borderBottom: tab === 'active' ? '2px solid var(--neon-purple)' : '2px solid transparent',
            paddingBottom: '4px', transition: 'all 0.2s',
          }}>ACTIVE</button>
          <button onClick={() => setTab('ended')} style={{
            fontFamily: 'Orbitron, monospace', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '3px',
            color: tab === 'ended' ? '#fff' : 'var(--text-dim)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            borderBottom: tab === 'ended' ? '2px solid var(--neon-blue)' : '2px solid transparent',
            paddingBottom: '4px', transition: 'all 0.2s',
          }}>ENDED</button>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-dim)' }}>
            <div style={{
              width: 40, height: 40, border: '3px solid var(--border)',
              borderTopColor: 'var(--neon-purple)', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
            }} />
            Loading...
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 40px', color: 'var(--text-dim)' }}>
            <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '16px', opacity: 0.4 }}>🎰</span>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.8rem', letterSpacing: '2px' }}>
              {tab === 'active' ? 'No active giveaways yet. Be the first!' : 'No ended giveaways yet.'}
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
            padding: pad,
          }}>
            {displayed.map(g => (
              <div
                key={g.id}
                onClick={() => router.push(`/giveaway/${g.id}`)}
                style={{
                  background: 'var(--dark-card)', border: '1px solid var(--border)',
                  borderRadius: '20px', padding: isMobile ? '18px' : '24px',
                  cursor: 'pointer', transition: 'all 0.3s', backdropFilter: 'blur(10px)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-5px)'
                  e.currentTarget.style.borderColor = 'rgba(178,75,255,0.35)'
                  e.currentTarget.style.boxShadow = '0 15px 50px rgba(178,75,255,0.15)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  {g.organizer_avatar && (
                    <img src={g.organizer_avatar} alt={g.organizer_username} referrerPolicy="no-referrer" style={{
                      width: 30, height: 30, borderRadius: '50%', border: '2px solid rgba(178,75,255,0.4)',
                    }} />
                  )}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                    @{g.organizer_username}
                  </span>
                </div>
                <div style={{
                  fontFamily: 'Orbitron, monospace',
                  fontSize: isMobile ? '0.85rem' : '0.95rem',
                  fontWeight: 700, marginBottom: '8px', letterSpacing: '1px',
                }}>
                  {g.title}
                </div>
                {g.description && (
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-dim)', marginBottom: '14px', lineHeight: 1.5 }}>
                    {g.description.length > 80 ? g.description.slice(0, 80) + '...' : g.description}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {g.status === 'ended' ? (
                    <span style={{
                      padding: '4px 12px', borderRadius: '50px', fontSize: '0.7rem', fontWeight: 700,
                      background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)',
                      border: '1px solid var(--border)', letterSpacing: '1px',
                    }}>ENDED</span>
                  ) : (
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '4px 12px', borderRadius: '50px', fontSize: '0.7rem', fontWeight: 700,
                      background: 'rgba(0,255,136,0.08)', color: 'var(--neon-green)',
                      border: '1px solid rgba(0,255,136,0.2)', letterSpacing: '1px',
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'var(--neon-green)', boxShadow: '0 0 6px var(--neon-green)',
                        animation: 'blink 1.5s infinite', display: 'inline-block',
                      }} />
                      LIVE
                    </span>
                  )}
                  <span style={{
                    fontFamily: 'Orbitron, monospace', fontSize: '0.75rem',
                    color: 'var(--neon-blue)', letterSpacing: '1px',
                  }}>
                    ⏱ {timers[g.id] || timeLeft(g.ends_at, g.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />

      {showCreate && user && (
        <CreateGiveawayModal
          user={user}
          onClose={() => setShowCreate(false)}
          onCreated={onGiveawayCreated}
        />
      )}
    </>
  )
}
