'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase'
import { getGiveaway, getParticipants, getWinners, joinGiveaway, saveWinner, updateGiveawayStatus } from '@/lib/db'
import type { Giveaway, Participant, Winner } from '@/types'
import type { User } from '@supabase/supabase-js'

const WHEEL_COLORS = ['#b24bff', '#00d4ff', '#ff2d78', '#00ff88', '#ff9f00', '#7c3aed', '#06b6d4', '#ec4899', '#f43f5e', '#10b981']
const SLOT_THRESHOLD = 50

function timeLeft(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return '00:00:00'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function spawnConfetti() {
  const colors = ['#b24bff', '#00d4ff', '#ff2d78', '#00ff88', '#ffd700']
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div')
    el.style.cssText = `
      position:fixed;
      width:${6 + Math.random() * 10}px;
      height:${6 + Math.random() * 10}px;
      top:-10px;
      left:${Math.random() * 100}vw;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      pointer-events:none;
      z-index:9999;
      animation:confetti-fall ${2.5 + Math.random() * 2}s linear forwards;
      animation-delay:${Math.random() * 0.5}s;
    `
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 5000)
  }
}

export default function GiveawayPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const angleRef = useRef(0)
  const spinningRef = useRef(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const [user, setUser] = useState<User | null>(null)
  const [giveaway, setGiveaway] = useState<Giveaway | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [winners, setWinners] = useState<Winner[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [countdown, setCountdown] = useState('')
  const [currentWinner, setCurrentWinner] = useState<(Participant & { prizeNum: number }) | null>(null)
  const [allWinnersModal, setAllWinnersModal] = useState(false)
  const [isSpinSequenceRunning, setIsSpinSequenceRunning] = useState(false)
  const [winnersQueue, setWinnersQueue] = useState<Winner[]>([])

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  // Load data
  useEffect(() => {
    if (!id) return
    Promise.all([getGiveaway(id), getParticipants(id), getWinners(id)]).then(([g, p, w]) => {
      if (!g) { router.push('/'); return }
      setGiveaway(g)
      setParticipants(p)
      setWinners(w)
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    if (user && participants.length) {
      setHasJoined(participants.some(p => p.user_id === user.id))
    }
  }, [user, participants])

  // Real-time participants
  useEffect(() => {
    if (!id) return
    const channel = supabase.channel(`giveaway-${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'participants',
        filter: `giveaway_id=eq.${id}`,
      }, payload => {
        setParticipants(prev => [...prev, payload.new as Participant])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  // Countdown
  useEffect(() => {
    if (!giveaway) return
    if (giveaway.status === 'ended' || giveaway.status === 'in_progress') {
      setCountdown('00:00:00')
      return
    }
    const tick = () => setCountdown(timeLeft(giveaway.ends_at))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [giveaway])

  // Auto-spin when timer hits zero
  useEffect(() => {
    if (!giveaway || giveaway.status !== 'active') return
    if (countdown === '00:00:00' && !isSpinSequenceRunning) {
      const isOrg = user?.id === giveaway.organizer_id
      if (isOrg) startSpinSequence()
    }
  }, [countdown, giveaway, isSpinSequenceRunning])

  // Draw wheel
  const drawWheel = useCallback((participantList: Participant[], angle = 0) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const cx = W / 2, cy = H / 2, r = cx - 10
    const n = participantList.length

    ctx.clearRect(0, 0, W, H)
    if (n === 0) return

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle)
    ctx.translate(-cx, -cy)

    const sl = (Math.PI * 2) / n
    for (let i = 0; i < n; i++) {
      const start = i * sl - Math.PI / 2
      const end = start + sl
      const mid = start + sl / 2

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, end)
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length]
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(mid)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#fff'
      const fontSize = Math.min(13, 120 / n)
      ctx.font = `bold ${fontSize}px Rajdhani, sans-serif`
      const label = ('@' + participantList[i].username).slice(0, 14)
      ctx.fillText(label, r - 10, 4)
      ctx.restore()
    }

    // Center
    ctx.beginPath()
    ctx.arc(cx, cy, 28, 0, Math.PI * 2)
    ctx.fillStyle = '#050510'
    ctx.fill()
    ctx.strokeStyle = 'rgba(178,75,255,0.5)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.restore()
  }, [])

  useEffect(() => {
    if (participants.length > 0 && participants.length <= SLOT_THRESHOLD) {
      drawWheel(participants, angleRef.current)
    }
  }, [participants, drawWheel])

  // Spin single winner
  const spinForWinner = (eligible: Participant[]): Promise<Participant> => {
    return new Promise(resolve => {
      const winner = eligible[Math.floor(Math.random() * eligible.length)]

      if (eligible.length <= SLOT_THRESHOLD) {
        const idx = eligible.findIndex(p => p.user_id === winner.user_id)
        const sl = 360 / eligible.length
        const target = angleRef.current + 360 * 8 + (360 - idx * sl - sl / 2 - (angleRef.current % 360))
        const start = angleRef.current
        const t0 = Date.now()
        const dur = 4500

        const anim = () => {
          const progress = Math.min((Date.now() - t0) / dur, 1)
          const eased = 1 - Math.pow(1 - progress, 4)
          const angle = (start + (target - start) * eased) * Math.PI / 180
          angleRef.current = start + (target - start) * eased
          drawWheel(eligible, angle)
          if (progress < 1) requestAnimationFrame(anim)
          else resolve(winner)
        }
        requestAnimationFrame(anim)
      } else {
        // Slot machine animation
        let count = 0
        const max = 25 + Math.floor(Math.random() * 15)
        const canvas = canvasRef.current!
        const ctx = canvas.getContext('2d')!

        const tick = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          const r = eligible[Math.floor(Math.random() * eligible.length)]
          ctx.fillStyle = '#050510'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.fillStyle = WHEEL_COLORS[Math.floor(Math.random() * WHEEL_COLORS.length)]
          ctx.font = 'bold 18px Rajdhani, sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('@' + r.username, canvas.width / 2, canvas.height / 2)

          if (++count < max) {
            setTimeout(tick, 60 + count * 4)
          } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.fillStyle = '#050510'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.fillStyle = 'var(--neon-purple)'
            ctx.font = 'bold 22px Orbitron, monospace'
            ctx.textAlign = 'center'
            ctx.fillText('@' + winner.username, canvas.width / 2, canvas.height / 2)
            setTimeout(() => resolve(winner), 400)
          }
        }
        tick()
      }
    })
  }

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' } as any,
        audio: false,
        preferCurrentTab: true,
      } as any)
      streamRef.current = stream
      recordedChunksRef.current = []
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
      recorder.ondataavailable = e => { if (e.data.size > 0) recordedChunksRef.current.push(e.data) }
      recorder.start()
      mediaRecorderRef.current = recorder
    } catch (e) {
      console.warn('Recording not available:', e)
    }
  }

  // Stop recording and get blob
  const stopRecording = (): Promise<Blob | null> => {
    return new Promise(resolve => {
      const recorder = mediaRecorderRef.current
      const stream = streamRef.current
      if (!recorder) { resolve(null); return }
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        stream?.getTracks().forEach(t => t.stop())
        resolve(blob)
      }
      recorder.stop()
    })
  }

  // Full spin sequence
  const startSpinSequence = async () => {
    if (!giveaway || spinningRef.current) return
    spinningRef.current = true
    setIsSpinSequenceRunning(true)

    await updateGiveawayStatus(giveaway.id, 'in_progress')
    setGiveaway(prev => prev ? { ...prev, status: 'in_progress' } : prev)

    await startRecording()

    const allWinners: Winner[] = []
    let remaining = [...participants]

    for (let i = 0; i < giveaway.winner_count; i++) {
      const eligible = remaining.filter(p => !allWinners.some(w => w.user_id === p.user_id))
      if (eligible.length === 0) break

      const winner = await spinForWinner(eligible)
      spawnConfetti()

      const saved = await saveWinner({
        giveaway_id: giveaway.id,
        user_id: winner.user_id,
        username: winner.username,
        name: winner.name,
        avatar_url: winner.avatar_url,
        prize_number: i + 1,
      })

      allWinners.push(saved)
      setWinners(prev => [...prev, saved])
      setCurrentWinner({ ...winner, prizeNum: i + 1 })

      // Wait for user to dismiss popup (2s auto-dismiss between spins)
      await new Promise(res => setTimeout(res, 3000))
      setCurrentWinner(null)
      await new Promise(res => setTimeout(res, 500))
    }

    // Stop recording
    const videoBlob = await stopRecording()

    // Update status to ended
    await updateGiveawayStatus(giveaway.id, 'ended')
    setGiveaway(prev => prev ? { ...prev, status: 'ended' } : prev)

    // Show all winners modal
    setWinnersQueue(allWinners)
    setAllWinnersModal(true)
    spinningRef.current = false
    setIsSpinSequenceRunning(false)

    // TODO: Upload video to @superspinonline (requires X API setup)
    if (videoBlob) {
      console.log('Video ready for upload:', videoBlob.size, 'bytes')
      // Will be implemented when @superspinonline X API is configured
    }
  }

  const handleJoin = async () => {
    if (!user) {
      const returnTo = `/giveaway/${id}`
      await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: { redirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}` },
      })
      return
    }
    setJoining(true)
    try {
      await joinGiveaway({
        giveaway_id: id,
        user_id: user.id,
        username: user.user_metadata?.user_name || user.user_metadata?.name || 'unknown',
        name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        avatar_url: user.user_metadata?.avatar_url || '',
      })
      setHasJoined(true)
      setParticipants(prev => [...prev, {
        id: 'temp',
        giveaway_id: id,
        user_id: user.id,
        username: user.user_metadata?.user_name || '',
        name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url || '',
        joined_at: new Date().toISOString(),
      }])
    } catch (e) {
      console.error(e)
    }
    setJoining(false)
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, height: '60vh' }}>
          <div style={{
            width: 40, height: 40,
            border: '3px solid var(--border)',
            borderTopColor: 'var(--neon-purple)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      </>
    )
  }

  if (!giveaway) return null

  const isOrg = user?.id === giveaway.organizer_id
  const isActive = giveaway.status === 'active'
  const isEnded = giveaway.status === 'ended'
  const useSlots = participants.length > SLOT_THRESHOLD

  return (
    <>
      <Navbar />
      <main style={{ flex: 1, padding: isMobile ? '20px 16px' : '40px', maxWidth: 1300, margin: '0 auto', width: '100%' }}>

        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'transparent', border: 'none',
            color: 'var(--text-dim)', cursor: 'pointer',
            fontFamily: 'Orbitron, monospace',
            fontSize: '0.65rem', letterSpacing: '2px',
            marginBottom: isMobile ? '20px' : '32px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
        >
          ← BACK
        </button>

        {/* Header */}
        <div style={{ marginBottom: isMobile ? '24px' : '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            {giveaway.organizer_avatar && (
              <img src={giveaway.organizer_avatar} alt={giveaway.organizer_username}
                referrerPolicy="no-referrer"
                style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)' }} />
            )}
            <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>by @{giveaway.organizer_username}</span>
          </div>
          <h1 style={{
            fontFamily: 'Orbitron, monospace', fontSize: isMobile ? '1.3rem' : '2rem',
            fontWeight: 900, letterSpacing: '2px', marginBottom: '10px',
          }}>
            {giveaway.title}
          </h1>
          {giveaway.description && (
            <p style={{ color: 'var(--text-dim)', lineHeight: 1.7, maxWidth: 600 }}>{giveaway.description}</p>
          )}
        </div>

        {/* Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 360px',
          gap: isMobile ? '24px' : '40px',
        }}>
          {/* Left — Wheel */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '20px' : '28px' }}>

            {/* Wheel container */}
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: -20, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(178,75,255,0.2), transparent 70%)',
                animation: 'pulse-glow 2s ease-in-out infinite',
                pointerEvents: 'none',
              }} />
              <canvas
                ref={canvasRef}
                width={isMobile ? 300 : 380}
                height={isMobile ? 300 : 380}
                style={{
                  borderRadius: useSlots ? '20px' : '50%',
                  filter: 'drop-shadow(0 0 30px rgba(178,75,255,0.5)) drop-shadow(0 0 60px rgba(0,212,255,0.2))',
                }}
              />
              {!useSlots && (
                <div style={{
                  position: 'absolute', top: '50%', right: isMobile ? -18 : -22,
                  transform: 'translateY(-50%)',
                  width: 0, height: 0,
                  borderTop: `${isMobile ? 12 : 16}px solid transparent`,
                  borderBottom: `${isMobile ? 12 : 16}px solid transparent`,
                  borderRight: `${isMobile ? 24 : 30}px solid var(--neon-pink)`,
                  filter: 'drop-shadow(0 0 10px var(--neon-pink))',
                  zIndex: 10,
                }} />
              )}
            </div>

            {/* Countdown */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '16px 28px',
              background: 'var(--dark-card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              backdropFilter: 'blur(10px)',
            }}>
              <span style={{
                fontFamily: 'Orbitron, monospace',
                fontSize: '0.65rem', letterSpacing: '2px', color: 'var(--text-dim)',
              }}>TIME LEFT</span>
              <span style={{
                fontFamily: 'Orbitron, monospace',
                fontSize: '1.5rem', fontWeight: 700,
                color: 'var(--neon-blue)',
                textShadow: '0 0 20px rgba(0,212,255,0.5)',
              }}>
                {countdown}
              </span>
            </div>

            {/* Winners so far */}
            {winners.length > 0 && (
              <div style={{ width: '100%' }}>
                <div style={{
                  fontFamily: 'Orbitron, monospace', fontSize: '0.65rem',
                  letterSpacing: '3px', color: 'var(--gold)',
                  marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', boxShadow: '0 0 8px var(--gold)', display: 'inline-block' }} />
                  WINNERS ({winners.length}/{giveaway.winner_count})
                </div>
                {winners.map(w => (
                  <div key={w.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px', marginBottom: '8px',
                    background: 'rgba(255,215,0,0.05)',
                    border: '1px solid rgba(255,215,0,0.12)',
                    borderRadius: '12px',
                  }}>
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', color: 'var(--gold)', minWidth: 24 }}>#{w.prize_number}</span>
                    {w.avatar_url && <img src={w.avatar_url} referrerPolicy="no-referrer" style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(255,215,0,0.3)' }} />}
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>@{w.username}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Spin Now button (organizer only) */}
            {isOrg && isActive && !isSpinSequenceRunning && (
              <button
                onClick={startSpinSequence}
                style={{
                  padding: '16px 60px',
                  background: 'linear-gradient(135deg, var(--neon-pink), var(--neon-purple))',
                  border: 'none', borderRadius: '50px', color: '#fff',
                  fontFamily: 'Orbitron, monospace',
                  fontSize: '0.9rem', fontWeight: 900, letterSpacing: '4px',
                  cursor: 'pointer',
                  boxShadow: '0 0 40px rgba(255,45,120,0.4)',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = '0 0 60px rgba(255,45,120,0.6)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(255,45,120,0.4)'
                }}
              >
                🎰 SPIN NOW
              </button>
            )}

            {isSpinSequenceRunning && (
              <div style={{
                fontFamily: 'Orbitron, monospace', fontSize: '0.75rem',
                letterSpacing: '3px', color: 'var(--neon-purple)',
                animation: 'blink 1s infinite',
              }}>
                SPINNING...
              </div>
            )}

            {/* Join button */}
            {!isOrg && isActive && (
              hasJoined ? (
                <div style={{
                  fontFamily: 'Orbitron, monospace', fontSize: '0.75rem',
                  letterSpacing: '2px', color: 'var(--neon-green)',
                  textShadow: '0 0 15px rgba(0,255,136,0.5)',
                }}>
                  ✓ YOU'RE IN!
                </div>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  style={{
                    padding: '14px 40px',
                    background: 'linear-gradient(135deg, var(--neon-green), #00b4d8)',
                    border: 'none', borderRadius: '50px',
                    color: '#000', fontFamily: 'Orbitron, monospace',
                    fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px',
                    cursor: joining ? 'not-allowed' : 'pointer',
                    boxShadow: '0 0 30px rgba(0,255,136,0.3)',
                    opacity: joining ? 0.7 : 1,
                  }}
                >
                  {joining ? 'JOINING...' : user ? '🎯 JOIN GIVEAWAY' : '𝕏 LOGIN & JOIN'}
                </button>
              )
            )}

            {/* Share ended giveaway */}
            {isEnded && winnersQueue.length > 0 && (
              <button
                onClick={() => {
                  const winnersList = winnersQueue.map(w => `@${w.username}`).join(', ')
                  const text = `🎉 Winners of "${giveaway.title}": ${winnersList}\n\nHosted on @superspinonline`
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 24px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border)',
                  borderRadius: '50px', color: '#fff',
                  fontSize: '0.9rem', cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                𝕏 Share Results
              </button>
            )}
          </div>

          {/* Right — Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Prize pool */}
            <div style={{
              background: 'var(--dark-card)', border: '1px solid var(--border)',
              borderRadius: '20px', padding: '24px', backdropFilter: 'blur(10px)',
            }}>
              <div style={{
                fontFamily: 'Orbitron, monospace', fontSize: '0.65rem',
                letterSpacing: '3px', color: 'var(--neon-blue)', marginBottom: '16px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neon-blue)', boxShadow: '0 0 8px var(--neon-blue)', display: 'inline-block' }} />
                PRIZE POOL
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '2rem' }}>🏆</span>
                <div>
                  <div style={{
                    fontFamily: 'Orbitron, monospace', fontSize: '1.8rem',
                    fontWeight: 700, color: 'var(--neon-purple)',
                    textShadow: '0 0 20px rgba(178,75,255,0.5)',
                  }}>{giveaway.winner_count - winners.length}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>prizes remaining</div>
                </div>
              </div>
            </div>

            {/* Participants */}
            <div style={{
              background: 'var(--dark-card)', border: '1px solid var(--border)',
              borderRadius: '20px', padding: '24px', backdropFilter: 'blur(10px)', flex: 1,
            }}>
              <div style={{
                fontFamily: 'Orbitron, monospace', fontSize: '0.65rem',
                letterSpacing: '3px', color: 'var(--neon-purple)', marginBottom: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neon-purple)', boxShadow: '0 0 8px var(--neon-purple)', display: 'inline-block' }} />
                  PARTICIPANTS
                </span>
                <span style={{
                  padding: '3px 10px', borderRadius: '20px',
                  background: 'rgba(178,75,255,0.1)',
                  border: '1px solid rgba(178,75,255,0.2)',
                  fontSize: '0.65rem',
                }}>{participants.length}</span>
              </div>

              <div style={{
                display: 'flex', flexDirection: 'column', gap: '8px',
                maxHeight: 360, overflowY: 'auto', paddingRight: '4px',
              }}>
                {participants.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                    No participants yet
                  </div>
                ) : participants.map(p => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    animation: 'slide-in 0.3s ease-out',
                    opacity: winners.some(w => w.user_id === p.user_id) ? 0.5 : 1,
                  }}>
                    {p.avatar_url ? (
                      <img src={p.avatar_url} referrerPolicy="no-referrer" style={{
                        width: 32, height: 32, borderRadius: '50%',
                        border: '2px solid rgba(178,75,255,0.3)',
                      }} />
                    ) : (
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {p.username[0]?.toUpperCase()}
                      </div>
                    )}
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                      @{p.username}
                      {winners.some(w => w.user_id === p.user_id) && ' 🏆'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Winner popup */}
      {currentWinner && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(5,5,16,0.92)',
          backdropFilter: 'blur(20px)',
          zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(178,75,255,0.15), rgba(0,212,255,0.1))',
            border: '1px solid rgba(178,75,255,0.4)',
            borderRadius: '28px', padding: '52px',
            textAlign: 'center', maxWidth: 440, width: '90%',
            boxShadow: '0 0 80px rgba(178,75,255,0.3), 0 0 160px rgba(0,212,255,0.1)',
            animation: 'winner-appear 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <span style={{
              fontSize: '4rem', marginBottom: '16px', display: 'block',
              animation: 'trophy-bounce 1s ease-in-out infinite alternate',
            }}>🏆</span>
            <div style={{
              fontFamily: 'Orbitron, monospace', fontSize: '0.65rem',
              letterSpacing: '4px', color: 'var(--gold)', marginBottom: '12px',
            }}>
              {giveaway.winner_count > 1
                ? `PRIZE #${currentWinner.prizeNum} OF ${giveaway.winner_count}`
                : 'WINNER!'}
            </div>
            {currentWinner.avatar_url ? (
              <img src={currentWinner.avatar_url} referrerPolicy="no-referrer" style={{
                width: 90, height: 90, borderRadius: '50%',
                border: '3px solid var(--gold)',
                boxShadow: '0 0 30px rgba(255,215,0,0.4)',
                margin: '0 auto 16px', display: 'block',
              }} />
            ) : (
              <div style={{
                width: 90, height: 90, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Orbitron, monospace', fontSize: '1.8rem', fontWeight: 700,
                border: '3px solid var(--gold)',
                boxShadow: '0 0 30px rgba(255,215,0,0.4)',
                margin: '0 auto 16px',
              }}>
                {currentWinner.username[0]?.toUpperCase()}
              </div>
            )}
            <div style={{
              fontFamily: 'Orbitron, monospace', fontSize: '1.8rem', fontWeight: 900,
              background: 'linear-gradient(135deg, var(--gold), #ffed8a)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              marginBottom: '8px',
            }}>
              @{currentWinner.username}
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              Spinning next winner...
            </div>
          </div>
        </div>
      )}

      {/* All winners modal */}
      {allWinnersModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(5,5,16,0.92)',
          backdropFilter: 'blur(20px)',
          zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(178,75,255,0.15), rgba(0,212,255,0.1))',
            border: '1px solid rgba(178,75,255,0.4)',
            borderRadius: '28px', padding: '52px',
            textAlign: 'center', maxWidth: 500, width: '90%',
            boxShadow: '0 0 80px rgba(178,75,255,0.3)',
            animation: 'winner-appear 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '16px' }}>🎊</span>
            <div style={{
              fontFamily: 'Orbitron, monospace', fontSize: '0.65rem',
              letterSpacing: '4px', color: 'var(--neon-blue)', marginBottom: '8px',
            }}>
              {giveaway.title}
            </div>
            <div style={{
              fontFamily: 'Orbitron, monospace', fontSize: '1.4rem', fontWeight: 900,
              background: 'linear-gradient(135deg, var(--gold), #ffed8a)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              marginBottom: '32px',
            }}>
              ALL {winnersQueue.length} WINNERS!
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
              {winnersQueue.map(w => (
                <div key={w.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px',
                  background: 'rgba(255,215,0,0.06)',
                  border: '1px solid rgba(255,215,0,0.15)',
                  borderRadius: '14px',
                  textAlign: 'left',
                }}>
                  <span style={{
                    fontFamily: 'Orbitron, monospace', fontSize: '0.65rem',
                    color: 'var(--gold)', minWidth: 24,
                  }}>#{w.prize_number}</span>
                  {w.avatar_url ? (
                    <img src={w.avatar_url} referrerPolicy="no-referrer" style={{
                      width: 36, height: 36, borderRadius: '50%',
                      border: '2px solid rgba(255,215,0,0.4)',
                    }} />
                  ) : (
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.9rem',
                    }}>{w.username[0]?.toUpperCase()}</div>
                  )}
                  <span style={{ fontWeight: 700 }}>@{w.username}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  const winnersList = winnersQueue.map(w => `@${w.username}`).join(', ')
                  const text = `🎉 Winners of "${giveaway.title}": ${winnersList}\n\nHosted on @superspinonline`
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
                }}
                style={{
                  padding: '12px 28px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border)',
                  borderRadius: '50px', color: '#fff',
                  fontFamily: 'Orbitron, monospace',
                  fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px',
                  cursor: 'pointer',
                }}
              >
                𝕏 Share
              </button>
              <button
                onClick={() => { setAllWinnersModal(false); router.push('/') }}
                style={{
                  padding: '12px 28px',
                  background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))',
                  border: 'none', borderRadius: '50px', color: '#fff',
                  fontFamily: 'Orbitron, monospace',
                  fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px',
                  cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(178,75,255,0.4)',
                }}
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
