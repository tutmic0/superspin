'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const COLORS = ['#b24bff', '#00d4ff', '#ff2d78', '#00ff88', '#ff9f00', '#7c3aed', '#06b6d4', '#ec4899', '#f43f5e', '#10b981']
const SLOT_THRESHOLD = 50

function spawnConfetti() {
  const colors = ['#b24bff', '#00d4ff', '#ff2d78', '#00ff88', '#ffd700', '#ff6b6b', '#4ecdc4']
  for (let i = 0; i < 120; i++) {
    const el = document.createElement('div')
    const size = 6 + Math.random() * 12
    el.style.cssText = `
      position:fixed;
      width:${size}px;height:${size}px;
      top:-20px;left:${Math.random() * 100}vw;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      pointer-events:none;z-index:9999;
      animation:confetti-fall ${2 + Math.random() * 3}s linear forwards;
      animation-delay:${Math.random() * 0.8}s;
      transform:rotate(${Math.random() * 360}deg);
    `
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 6000)
  }
}

function getAudioContext(): AudioContext | null {
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext)
    return new AC()
  } catch (e) {
    return null
  }
}

function playSpinSound(duration: number) {
  const ctx = getAudioContext()
  if (!ctx) return
  const startInterval = 0.05
  const endInterval = 0.4
  let elapsed = 0

  const scheduleTick = () => {
    if (elapsed >= duration) return
    const progress = elapsed / duration
    const eased = 1 - Math.pow(1 - progress, 2)
    const interval = startInterval + (endInterval - startInterval) * eased
    const volume = Math.min(0.7, 0.3 + (1 - eased) * 0.4)

    // Create tick noise
    const bufferSize = Math.floor(ctx.sampleRate * 0.03)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1))
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const gain = ctx.createGain()
    gain.gain.value = volume
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 800
    source.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    source.start(ctx.currentTime)

    elapsed += interval
    setTimeout(scheduleTick, interval * 1000)
  }
  scheduleTick()
}

function playFireworkSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  // Whistle up
  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()
  osc.connect(oscGain)
  oscGain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(300, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3)
  oscGain.gain.setValueAtTime(0.2, ctx.currentTime)
  oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.35)

  // Explosion pops
  const delays = [0.3, 0.4, 0.5, 0.65, 0.8]
  delays.forEach((delay, i) => {
    const bufSize = Math.floor(ctx.sampleRate * 0.15)
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let j = 0; j < bufSize; j++) {
      data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufSize * 0.12))
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    const g = ctx.createGain()
    g.gain.value = 0.5 - i * 0.06
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 500 + Math.random() * 400
    src.connect(f)
    f.connect(g)
    g.connect(ctx.destination)
    src.start(ctx.currentTime + delay)
  })

  // Fanfare
  const notes = [523, 659, 784, 1047, 1319]
  notes.forEach((freq, i) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g)
    g.connect(ctx.destination)
    o.type = 'sine'
    o.frequency.value = freq
    const t = ctx.currentTime + 1.0 + i * 0.13
    g.gain.setValueAtTime(0.25, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
    o.start(t)
    o.stop(t + 0.4)
  })
}

export default function SpinnerPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const angleRef = useRef(0)
  const spinningRef = useRef(false)
  const [isMobile, setIsMobile] = useState(false)

  const [participants, setParticipants] = useState<string[]>([])
  const [winners, setWinners] = useState<string[]>([])
  const [inputText, setInputText] = useState('')
  const [prizeCount, setPrizeCount] = useState(1)
  const [gwMode, setGwMode] = useState(false)
  const [currentWinner, setCurrentWinner] = useState<string | null>(null)
  const [spinStatus, setSpinStatus] = useState('')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const canvasSize = isMobile ? 300 : 440

  const drawWheel = useCallback((list: string[], angle = 0) => {
    const canvas = canvasRef.current
    if (!canvas || list.length === 0) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const cx = W / 2, cy = H / 2, r = cx - 10
    const n = list.length

    ctx.clearRect(0, 0, W, H)

    if (n > SLOT_THRESHOLD) {
      ctx.fillStyle = '#050510'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = 'bold 14px Orbitron, monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`${n} PARTICIPANTS`, cx, cy - 20)
      ctx.fillStyle = '#b24bff'
      ctx.font = 'bold 12px Orbitron, monospace'
      ctx.fillText('SLOT MODE', cx, cy + 10)
      return
    }

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
      ctx.fillStyle = COLORS[i % COLORS.length]
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(mid)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#fff'
      const fontSize = Math.min(14, 130 / n)
      ctx.font = `bold ${fontSize}px Rajdhani, sans-serif`
      ctx.fillText(list[i].slice(0, 14), r - 10, 5)
      ctx.restore()
    }

    ctx.beginPath()
    ctx.arc(cx, cy, 28, 0, Math.PI * 2)
    ctx.fillStyle = '#050510'
    ctx.fill()
    ctx.strokeStyle = 'rgba(178,75,255,0.5)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.restore()
  }, [])

  const loadParticipants = () => {
    const list = inputText.split('\n').map(s => s.trim()).filter(Boolean)
    setParticipants(list)
    setWinners([])
    angleRef.current = 0
    drawWheel(list, 0)
  }

  useEffect(() => {
    if (participants.length > 0) drawWheel(participants, angleRef.current)
  }, [participants, drawWheel, canvasSize])

  const doSpin = () => {
    if (spinningRef.current || participants.length < 1) return
    const eligible = gwMode ? participants.filter(p => !winners.includes(p)) : participants
    if (eligible.length === 0) { alert('All winners picked!'); return }

    spinningRef.current = true
    setSpinStatus('Spinning...')

    const winner = eligible[Math.floor(Math.random() * eligible.length)]

    if (participants.length <= SLOT_THRESHOLD) {
      const idx = eligible.indexOf(winner)
      const n = eligible.length
      const sl = 360 / n
      const sectorCenter = idx * sl + sl / 2
      const current = angleRef.current % 360
      const target = angleRef.current + (360 * 8) - current - sectorCenter + 90
      const start = angleRef.current
      const t0 = Date.now()
      const dur = 4500

      playSpinSound(dur / 1000)

      const anim = () => {
        const progress = Math.min((Date.now() - t0) / dur, 1)
        const eased = 1 - Math.pow(1 - progress, 4)
        const newAngle = start + (target - start) * eased
        angleRef.current = newAngle
        drawWheel(eligible, newAngle * Math.PI / 180)
        if (progress < 1) {
          requestAnimationFrame(anim)
        } else {
          spinningRef.current = false
          setSpinStatus('')
          showWinner(winner)
        }
      }
      requestAnimationFrame(anim)
    } else {
      let count = 0
      const max = 25 + Math.floor(Math.random() * 15)
      const canvas = canvasRef.current!
      const ctx = canvas.getContext('2d')!

      const tick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#050510'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        const r = eligible[Math.floor(Math.random() * eligible.length)]
        ctx.fillStyle = COLORS[Math.floor(Math.random() * COLORS.length)]
        ctx.font = 'bold 20px Rajdhani, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(r.slice(0, 16), canvas.width / 2, canvas.height / 2)

        if (++count < max) {
          setTimeout(tick, 60 + count * 4)
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.fillStyle = '#050510'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.fillStyle = '#b24bff'
          ctx.font = 'bold 22px Orbitron, monospace'
          ctx.textAlign = 'center'
          ctx.fillText(winner.slice(0, 14), canvas.width / 2, canvas.height / 2)
          spinningRef.current = false
          setSpinStatus('')
          setTimeout(() => showWinner(winner), 400)
        }
      }
      tick()
    }
  }

  const showWinner = (winner: string) => {
    if (gwMode) setWinners(prev => [...prev, winner])
    setCurrentWinner(winner)
    spawnConfetti()
    playFireworkSound()
  }

  const closeWinner = () => setCurrentWinner(null)

  const nextSpin = () => {
    setCurrentWinner(null)
    setTimeout(() => doSpin(), 300)
  }

  const shareX = () => {
    const text = `🎉 Giveaway winners:\n${winners.map((w, i) => `#${i + 1} ${w}`).join('\n')}\n\nSpun with superspin.online`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  const remaining = gwMode ? prizeCount - winners.length : 0
  const canSpin = participants.length >= 1 && !spinningRef.current

  return (
    <>
      <Navbar />
      <main style={{ flex: 1, padding: isMobile ? '20px 16px' : '40px', maxWidth: 1400, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        <button
          onClick={() => router.push('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'transparent', border: 'none',
            color: 'var(--text-dim)', cursor: 'pointer',
            fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', letterSpacing: '2px',
            marginBottom: '24px', transition: 'color 0.2s',
          }}
        >
          ← BACK
        </button>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '24px' : '0' }}>

          {/* Wheel */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '24px', paddingRight: isMobile ? '0' : '40px',
          }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.7rem', letterSpacing: '4px', color: 'rgba(255,255,255,0.4)' }}>
              ✦ Spin to select a winner ✦
            </div>

            {participants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
                <span style={{ fontSize: '4rem', display: 'block', marginBottom: '16px', opacity: 0.3 }}>🎰</span>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.8rem', letterSpacing: '2px' }}>
                  Add participants to spin
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative', width: canvasSize, height: canvasSize }}>
                <div style={{
                  position: 'absolute', inset: -20, borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(178,75,255,0.2) 0%, transparent 70%)',
                  animation: 'pulse-glow 2s ease-in-out infinite',
                  pointerEvents: 'none',
                }} />
                <canvas
                  ref={canvasRef}
                  width={canvasSize}
                  height={canvasSize}
                  onClick={() => canSpin && doSpin()}
                  style={{
                    borderRadius: participants.length > SLOT_THRESHOLD ? '20px' : '50%',
                    filter: 'drop-shadow(0 0 30px rgba(178,75,255,0.5)) drop-shadow(0 0 60px rgba(0,212,255,0.2))',
                    cursor: canSpin ? 'pointer' : 'default',
                    transition: 'filter 0.3s',
                  }}
                />
                {participants.length <= SLOT_THRESHOLD && (
                  <>
                    <div style={{
                      position: 'absolute', top: '50%', right: -28,
                      transform: 'translateY(-50%)',
                      width: 0, height: 0,
                      borderTop: '16px solid transparent',
                      borderBottom: '16px solid transparent',
                      borderRight: '32px solid #ff2d78',
                      filter: 'drop-shadow(0 0 10px #ff2d78)',
                      zIndex: 10,
                    }} />
                    <div
                      onClick={() => canSpin && doSpin()}
                      style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 60, height: 60, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                        border: '3px solid var(--neon-purple)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: canSpin ? 'pointer' : 'default',
                        zIndex: 10,
                        boxShadow: '0 0 20px rgba(178,75,255,0.4)',
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              onClick={doSpin}
              disabled={!canSpin}
              style={{
                padding: '16px 60px',
                background: canSpin ? 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))' : 'rgba(178,75,255,0.2)',
                border: 'none', borderRadius: '50px', color: '#fff',
                fontFamily: 'Orbitron, monospace', fontSize: '1rem', fontWeight: 700, letterSpacing: '3px',
                cursor: canSpin ? 'pointer' : 'not-allowed',
                boxShadow: canSpin ? '0 0 30px rgba(178,75,255,0.4)' : 'none',
                transition: 'all 0.3s',
              }}
            >
              ⚡ SPIN
            </button>

            {spinStatus && (
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.7rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.4)' }}>
                {spinStatus}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{
            width: isMobile ? '100%' : '420px',
            borderLeft: isMobile ? 'none' : '1px solid var(--border)',
            borderTop: isMobile ? '1px solid var(--border)' : 'none',
            paddingLeft: isMobile ? '0' : '40px',
            paddingTop: isMobile ? '24px' : '0',
            display: 'flex', flexDirection: 'column', gap: '16px',
          }}>

            {/* Giveaway mode */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 18px',
              background: 'rgba(178,75,255,0.06)',
              border: '1px solid rgba(178,75,255,0.15)',
              borderRadius: '14px',
            }}>
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.6rem', letterSpacing: '2px', color: '#b24bff' }}>GIVEAWAY MODE</span>
              <div onClick={() => { setGwMode(!gwMode); setWinners([]) }}
                style={{
                  width: 40, height: 22, borderRadius: '11px',
                  background: gwMode ? '#b24bff' : 'rgba(255,255,255,0.1)',
                  border: '1px solid var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.3s',
                }}>
                <div style={{
                  position: 'absolute', top: 3, left: gwMode ? 19 : 3,
                  width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.3s',
                }} />
              </div>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{gwMode ? 'ON' : 'OFF'}</span>
            </div>

            {/* Participants */}
            <div style={{ background: 'var(--dark-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '20px', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', letterSpacing: '3px', color: '#00d4ff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4ff', display: 'inline-block' }} />
                PARTICIPANTS
              </div>
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={'Enter names, one per line:\nAlice\nBob\nCharlie'}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border)', borderRadius: '10px',
                  padding: '12px 16px', color: '#fff', fontSize: '0.95rem',
                  outline: 'none', resize: 'vertical', minHeight: '120px', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#b24bff'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <button onClick={loadParticipants}
                style={{
                  width: '100%', padding: '10px', marginTop: '8px',
                  background: 'linear-gradient(135deg, #b24bff, #00d4ff)',
                  border: 'none', borderRadius: '10px', color: '#fff',
                  fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '2px', cursor: 'pointer',
                }}>
                ✔ LOAD PARTICIPANTS
              </button>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>{participants.length} participants</div>
            </div>

            {/* Prize count */}
            {gwMode && (
              <div style={{ background: 'var(--dark-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '20px', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', letterSpacing: '3px', color: '#00d4ff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4ff', display: 'inline-block' }} />
                  PRIZES TO GIVE
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '2.5rem', fontWeight: 900, color: '#b24bff' }}>{prizeCount}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button onClick={() => setPrizeCount(p => Math.min(participants.length || 10, p + 1))}
                      style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>▲</button>
                    <button onClick={() => setPrizeCount(p => Math.max(1, p - 1))}
                      style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>▼</button>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>winners</span>
                </div>
              </div>
            )}

            {/* Winners */}
            <div style={{ background: 'var(--dark-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '20px', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', letterSpacing: '3px', color: '#00d4ff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4ff', display: 'inline-block' }} />
                WINNERS
                {gwMode && winners.length > 0 && <span style={{ color: '#b24bff', marginLeft: '4px' }}>({winners.length}/{prizeCount})</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                {winners.length === 0 ? (
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textAlign: 'center', padding: '12px' }}>No winners yet</div>
                ) : winners.map((w, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{w}</span>
                  </div>
                ))}
              </div>
              {gwMode && winners.length >= prizeCount && prizeCount > 0 && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button onClick={shareX} style={{ flex: 1, padding: '9px', borderRadius: '10px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', cursor: 'pointer' }}>🐦 Share</button>
                  <button onClick={() => navigator.clipboard.writeText(`Winners:\n${winners.map((w, i) => `#${i + 1} ${w}`).join('\n')}`)}
                    style={{ flex: 1, padding: '9px', borderRadius: '10px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', cursor: 'pointer' }}>📋 Copy</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {currentWinner && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(5,5,16,0.92)', backdropFilter: 'blur(20px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(178,75,255,0.15), rgba(0,212,255,0.1))',
            border: '1px solid rgba(178,75,255,0.4)',
            borderRadius: '28px', padding: isMobile ? '36px 24px' : '52px',
            textAlign: 'center', maxWidth: 440, width: '100%',
            boxShadow: '0 0 80px rgba(178,75,255,0.3)',
            animation: 'winner-appear 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <span style={{ fontSize: '4rem', marginBottom: '16px', display: 'block' }}>🏆</span>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', letterSpacing: '4px', color: '#ffd700', marginBottom: '16px' }}>
              {gwMode ? `PRIZE #${winners.length} OF ${prizeCount}` : 'WINNER!'}
            </div>
            <div style={{
              fontFamily: 'Orbitron, monospace', fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 900,
              background: 'linear-gradient(135deg, #ffd700, #ffed8a)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              marginBottom: '32px',
            }}>
              {currentWinner}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={closeWinner}
                style={{ padding: '12px 32px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: '50px', color: 'rgba(255,255,255,0.7)', fontFamily: 'Orbitron, monospace', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px', cursor: 'pointer' }}>
                Done
              </button>
              {gwMode && remaining > 0 && (
                <button onClick={nextSpin}
                  style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #b24bff, #00d4ff)', border: 'none', borderRadius: '50px', color: '#fff', fontFamily: 'Orbitron, monospace', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px', cursor: 'pointer', boxShadow: '0 0 20px rgba(178,75,255,0.4)' }}>
                  Next ({remaining} left)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
