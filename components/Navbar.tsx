'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
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
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const avatar = user?.user_metadata?.avatar_url
  const username = user?.user_metadata?.user_name || user?.user_metadata?.name

  const isGiveaway = pathname === '/' || pathname.startsWith('/giveaway')
  const isSpinner = pathname === '/spinner'

  return (
    <header style={{
      padding: isMobile ? '14px 16px' : '20px 40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--border)',
      backdropFilter: 'blur(10px)',
      background: 'rgba(5,5,16,0.6)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      gap: '8px',
    }}>
      <Link href="/" style={{
        fontFamily: 'Orbitron, monospace',
        fontSize: isMobile ? '1.1rem' : '1.6rem',
        fontWeight: 900,
        letterSpacing: isMobile ? '1px' : '2px',
        textDecoration: 'none',
        flexShrink: 0,
      }}>
        <span style={{ background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Super</span>
        <span style={{ background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Spin</span>
      </Link>

      <nav style={{ display: 'flex', gap: '2px' }}>
        <Link href="/" style={{
          padding: isMobile ? '6px 10px' : '8px 20px',
          borderRadius: '10px',
          background: isGiveaway ? 'rgba(178,75,255,0.12)' : 'transparent',
          color: isGiveaway ? 'var(--neon-purple)' : 'var(--text-dim)',
          fontFamily: 'Orbitron, monospace',
          fontSize: isMobile ? '0.5rem' : '0.65rem',
          fontWeight: 700,
          letterSpacing: isMobile ? '1px' : '2px',
          boxShadow: isGiveaway ? '0 0 15px rgba(178,75,255,0.2)' : 'none',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          🎁 {isMobile ? 'GW' : 'GIVEAWAY'}
        </Link>
        <Link href="/spinner" style={{
          padding: isMobile ? '6px 10px' : '8px 20px',
          borderRadius: '10px',
          background: isSpinner ? 'rgba(178,75,255,0.12)' : 'transparent',
          color: isSpinner ? 'var(--neon-purple)' : 'var(--text-dim)',
          fontFamily: 'Orbitron, monospace',
          fontSize: isMobile ? '0.5rem' : '0.65rem',
          fontWeight: 700,
          letterSpacing: isMobile ? '1px' : '2px',
          boxShadow: isSpinner ? '0 0 15px rgba(178,75,255,0.2)' : 'none',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          🎰 SPIN
        </Link>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {loading ? (
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--border)' }} />
        ) : user ? (
          <>
            {avatar && (
              <img src={avatar} alt={username} style={{
                width: isMobile ? 28 : 34, height: isMobile ? 28 : 34,
                borderRadius: '50%', border: '2px solid var(--neon-purple)',
                boxShadow: '0 0 12px rgba(178,75,255,0.4)',
              }} referrerPolicy="no-referrer" />
            )}
            {!isMobile && (
              <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: 600 }}>@{username}</span>
            )}
            <button onClick={handleLogout} style={{
              padding: isMobile ? '5px 8px' : '6px 14px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-dim)',
              fontSize: isMobile ? '0.65rem' : '0.8rem',
              cursor: 'pointer',
            }}>
              {isMobile ? '✕' : 'Logout'}
            </button>
          </>
        ) : (
          <button onClick={handleLogin} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: isMobile ? '7px 12px' : '10px 22px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)',
            borderRadius: '50px', color: '#fff',
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: isMobile ? '0.8rem' : '1rem',
            fontWeight: 600, letterSpacing: '1px', cursor: 'pointer',
          }}>
            <span>𝕏</span> {isMobile ? '' : 'Login with X'}
          </button>
        )}
      </div>
    </header>
  )
}
