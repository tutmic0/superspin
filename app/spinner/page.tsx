'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const COLORS = ['#b24bff', '#00d4ff', '#ff2d78', '#00ff88', '#ff9f00', '#7c3aed', '#06b6d4', '#ec4899', '#f43f5e', '#10b981']
const SLOT_THRESHOLD = 50

function spawnConfetti() {
  const colors = ['#b24bff', '#00d4ff', '#ff2d78', '#00ff88', '#ffd700']
  for (let i = 0; i < 70; i++) {
    const el = document.createElement('div')
    el.style.cssText = `
      position:fixed;width:${6 + Math.random() * 10}px;height:${6 + Math.random() * 10}px;
      top:-10px;left:${Math.random() * 100}vw;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      pointer-events:none;z-index:9999;
      animation:confetti-fall ${2.5 + Math.random() * 2}s linear forwards;
      animation-delay:${Math.random() * 0.6}s;
    `
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 5000)
  }
}

export default function SpinnerPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const angleRef = useRef(0)
  const spinningRef = useRef(false)

  const [participants, setParticipants] = useState<string[]>([])
  const [winners, setWinners] = useState<string[]>([])
  const [inputText, setInputText] = useState('')
  const [prizeCount, setPrizeCount] = useState(1)
  const [gwMode, setGwMode] = useState(false)
  const [currentWinner, setCurrentWinner] = useState<string | null>(null)
  const [spinStatus, setSpinStatus] = useState('')

  const drawWheel = useCallback((list: string[], angle = 0) => {
    const canvas = canvasRef.current
    if (!canvas || list.length === 0) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const cx = W / 2, cy = H / 2, r = cx - 10
    const n = list.length

    ctx.clearRect(0, 0, W, H)

    if (n > SLOT_THRESHOLD) {
      // Slot mode
      ctx.fillStyle = '#050510'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = 'var(--text-dim)'
      ctx.font = 'bold 14px Orbitron, monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`${n} PARTICIPANTS`, cx, cy - 20)
      ctx.fillStyle = 'var(--neon-purple)'
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
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'
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
  }, [participants, drawWheel])

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
      const target = angleRef.current + 360 * 8 + (360 - idx * sl - sl / 2 - (angleRef.current % 360))
      const start = angleRef.current
      const t0 = Date.now()
      const dur = 4500

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
      // Slot animation
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
      <main style={{ flex: 1, padding: '40px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>

        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'transparent', border: 'none',
            color: 'var(--text-dim)', cursor: 'pointer',
            fontFamily: 'Orbitron, monospace',
            fontSize: '0.65rem', letterSpacing: '2px',
            marginBottom: '32px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
        >
          ← BACK
        </button>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 420px',
          gap: '0',
        }}>
          {/* Left — Wheel */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '32px', paddingRight: '40px',
          }}>
            <div style={{
              fontFamily: 'Orbitron, monospace', fontSize: '0.7rem',
              letterSpacing: '4px', color: 'rgba(255,255,255,0.4)',
            }}>
              ✦ Spin to select a winner ✦
            </div>

            {participants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
                <span style={{ fontSize: '4rem', display: 'block', marginBottom: '16px', opacity: 0.3 }}>🎰</span>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.8rem', letterSpacing: '2px' }}>
                  Add participants to spin
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative', width: 440, height: 440 }}>
                <div style={{
                  position: 'absolute', inset: -20, borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(178,75,255,0.2) 0%, transparent 70%)',
                  animation: 'pulse-glow 2s ease-in-out infinite',
                  pointerEvents: 'none',
                }} />
                <canvas
                  ref={canvasRef}
                  width={440}
                  height={440}
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
                      position: 'absolute', top: '50%', right: -24,
                      transform: 'translateY(-50%)',
                      width: 0, height: 0,
                      borderTop: '18px solid transparent',
                      borderBottom: '18px solid transparent',
                      borderRight: '36px solid var(--neon-pink)',
                      filter: 'drop-shadow(0 0 10px var(--neon-pink))',
                      zIndex: 10,
                    }} />
                    <div
                      onClick={() => canSpin && doSpin()}
                      style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 70, height: 70, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                        border: '3px solid var(--neon-purple)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: canSpin ? 'pointer' : 'default',
                        zIndex: 10,
                        boxShadow: '0 0 20px rgba(178,75,255,0.4)',
                        transition: 'all 0.3s',
                      }}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
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
                background: canSpin
                  ? 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))'
                  : 'rgba(178,75,255,0.2)',
                border: 'none', borderRadius: '50px', color: '#fff',
                fontFamily: 'Orbitron, monospace',
                fontSize: '1rem', fontWeight: 700, letterSpacing: '3px',
                cursor: canSpin ? 'pointer' : 'not-allowed',
                boxShadow: canSpin ? '0 0 30px rgba(178,75,255,0.4)' : 'none',
                transition: 'all 0.3s',
              }}
            >
              ⚡ SPIN
            </button>

            {spinStatus && (
              <div style={{
                fontFamily: 'Orbitron, monospace', fontSize: '0.7rem',
                letterSpacing: '2px', color: 'var(--text-dim)',
              }}>
                {spinStatus}
              </div>
            )}
          </div>

          {/* Right — Sidebar */}
          <div style={{
            borderLeft: '1px solid var(--border)',
            paddingLeft: '40px',
            display: 'flex', flexDirection: 'column', gap: '24px',
          }}>
            {/* Giveaway mode toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 18px',
              background: 'rgba(178,75,255,0.06)',
              border: '1px solid rgba(178,75,255,0.15)',
              borderRadius: '14px',
            }}>
              <span style={{
                fontFamily: 'Orbitron, monospace', fontSize: '0.6rem',
                letterSpacing: '2px', color: 'var(--neon-purple)',
              }}>GIVEAWAY MODE</span>
              <div
                onClick={() => {
                  setGwMode(!gwMode)
                  setWinners([])
                }}
                style={{
                  width: 40, height: 22, borderRadius: '11px',
                  background: gwMode ? 'var(--neon-purple)' : 'rgba(255,255,255,0.1)',
                  border: '1px solid var(--border)',
                  position: 'relative', cursor: 'pointer',
                  transition: 'background 0.3s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 3,
                  left: gwMode ? 19 : 3,
                  width: 14, height: 14, borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.3s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }} />
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                {gwMode ? 'ON' : 'OFF'}
              </span>
            </div>

            {/* Participants input */}
            <div style={{
              background: 'var(--dark-card)', border: '1px solid var(--border)',
              borderRadius: '20px', padding: '24px', backdropFilter: 'blur(10px)',
            }}>
              <div style={{
                fontFamily: 'Orbitron, monospace', fontSize: '0.65rem',
                letterSpacing: '3px', color: 'var(--neon-blue)', marginBottom: '14px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neon-blue)', boxShadow: '0 0 8px var(--neon-blue)', display: 'inline-block' }} />
                PARTICIPANTS
              </div>
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={'Enter names, one per line:\nAlice\nBob\nCharlie'}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '120px',
                  transition: 'border-color 0.3s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--neon-purple)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <button
                onClick={loadParticipants}
                style={{
                  width: '100%', padding: '10px', marginTop: '8px',
                  background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))',
                  border: 'none', borderRadius: '10px', color: '#fff',
                  fontFamily: 'Orbitron, monospace', fontSize: '0.65rem',
                  fontWeight: 700, letterSpacing: '2px', cursor: 'pointer',
                  boxShadow: '0 0 15px rgba(178,75,255,0.3)',
                }}
              >
                ✓ LOAD PARTICIPANTS
              </button>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                {participants.length} participants
              </div>
            </div>

            {/* Prize count (giveaway mode) */}
            {gwMode && (
              <div style={{
                background: 'var(--dark-card)', border: '1px solid var(--border)',
                borderRadius: '20px', padding: '24px', backdropFilter: 'blur(10px)',
              }}>
                <div style={{
                  fontFamily: 'Orbitron, monospace', fontSize: '0.65rem',
                  letterSpacing: '3px', color: 'var(--neon-blue)', marginBottom: '14px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neon-blue)', boxShadow: '0 0 8px var(--neon-blue)', display: 'inline-block' }} />
                  PRIZES TO GIVE
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{
                    fontFamily: 'Orbitron, monospace', fontSize: '2.5rem',
                    fontWeight: 900, color: 'var(--neon-purple)',
                    textShadow: '0 0 20px rgba(178,75,255,0.5)',
                  }}>{prizeCount}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button
                      onClick={() => setPrizeCount(p => Math.min(participants.length || 10, p + 1))}
                      style={{
                        width: 30, height: 30,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px', color: '#fff', fontSize: '1rem', cursor: 'pointer',
                      }}
                    >▲</button>
                    <button
                      onClick={() => setPrizeCount(p => Math.max(1, p - 1))}
                      style={{
                        width: 30, height: 30,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px', color: '#fff', fontSize: '1rem', cursor: 'pointer',
                      }}
                    >▼</button>
                  </div>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>winners</span>
                </div>
              </div>
            )}

            {/* Winners list */}
            <div style={{
              background: 'var(--dark-card)', border: '1px solid var(--border)',
              borderRadius: '20px', padding: '24px', backdropFilter: 'blur(10px)',
            }}>
              <div style={{
                fontFamily: 'Orbitron, monospace', fontSize: '0.65rem',
                letterSpacing: '3px', color: 'var(--neon-blue)', marginBottom: '14px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neon-blue)', boxShadow: '0 0 8px var(--neon-blue)', display: 'inline-block' }} />
                WINNERS
                {gwMode && winners.length > 0 && (
                  <span style={{ color: 'var(--neon-purple)', marginLeft: '4px' }}>
                    ({winners.length}/{prizeCount})
                  </span>
                )}
              </div>

              <div style={{
                display: 'flex', flexDirection: 'column', gap: '8px',
                maxHeight: '200px', overflowY: 'auto',
              }}>
                {winners.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textAlign: 'center', padding: '12px' }}>
                    No winners yet
                  </div>
                ) : winners.map((w, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    animation: 'slide-in 0.2s ease-out',
                  }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: COLORS[i % COLORS.length], flexShrink: 0,
                    }} />
                    <span style={{ flex: 1, fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                      {w}
                    </span>
                  </div>
                ))}
              </div>

              {gwMode && winners.length >= prizeCount && prizeCount > 0 && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    onClick={shareX}
                    style={{
                      flex: 1, padding: '9px',
                      borderRadius: '10px', border: '1px solid var(--border)',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600,
                    }}
                  >
                    𝕏 Share
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(`Winners:\n${winners.map((w, i) => `#${i + 1} ${w}`).join('\n')}`)}
                    style={{
                      flex: 1, padding: '9px',
                      borderRadius: '10px', border: '1px solid var(--border)',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600,
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Winner modal */}
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
            boxShadow: '0 0 80px rgba(178,75,255,0.3)',
            animation: 'winner-appear 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <span style={{
              fontSize: '4rem', marginBottom: '16px', display: 'block',
              animation: 'trophy-bounce 1s ease-in-out infinite alternate',
            }}>🎉</span>
            <div style={{
              fontFamily: 'Orbitron, monospace', fontSize: '0.65rem',
              letterSpacing: '4px', color: 'var(--gold)', marginBottom: '16px',
            }}>
              {gwMode ? `PRIZE #${winners.length} OF ${prizeCount}` : 'WINNER!'}
            </div>
            <div style={{
              fontFamily: 'Orbitron, monospace', fontSize: '1.8rem', fontWeight: 900,
              background: 'linear-gradient(135deg, var(--gold), #ffed8a)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              marginBottom: '32px',
            }}>
              {currentWinner}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={closeWinner}
                style={{
                  padding: '12px 32px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border)',
                  borderRadius: '50px', color: 'rgba(255,255,255,0.7)',
                  fontFamily: 'Orbitron, monospace',
                  fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
              {gwMode && remaining > 0 && (
                <button
                  onClick={nextSpin}
                  style={{
                    padding: '12px 32px',
                    background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))',
                    border: 'none', borderRadius: '50px', color: '#fff',
                    fontFamily: 'Orbitron, monospace',
                    fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px',
                    cursor: 'pointer',
                    boxShadow: '0 0 20px rgba(178,75,255,0.4)',
                  }}
                >
                  Next Spin ({remaining} left)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
