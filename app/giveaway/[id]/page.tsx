'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase'
import { getGiveaway, getParticipants, getWinners, joinGiveaway, saveWinner, updateGiveawayStatus } from '@/lib/db'
import type { Giveaway, Participant, Winner, GiveawayRequirement } from '@/types'
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
  const colors = ['#b24bff', '#00d4ff', '#ff2d78', '#00ff88', '#ffd700', '#ff6b6b', '#4ecdc4']
  for (let i = 0; i < 120; i++) {
    const el = document.createElement('div')
    const size = 6 + Math.random() * 12
    el.style.cssText = `
      position:fixed;width:${size}px;height:${size}px;
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
  } catch (e) { return null }
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
  const [showRequirements, setShowRequirements] = useState(false)
  const [reqStep, setReqStep] = useState(0)
  const [reqDone, setReqDone] = useState(false)
  const [countdown, setCountdown] = useState('')
  const [currentWinner, setCurrentWinner] = useState<(Participant & { prizeNum: number }) | null>(null)
  const [allWinnersModal, setAllWinnersModal] = useState(false)
  const [isSpinSequenceRunning, setIsSpinSequenceRunning] = useState(false)
  const [winnersQueue, setWinnersQueue] = useState<Winner[]>([])
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

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

  useEffect(() => {
    if (!giveaway || giveaway.status !== 'active') return
    if (countdown === '00:00:00' && !isSpinSequenceRunning) {
      const isOrg = user?.id === giveaway.organizer_id
      if (isOrg) startSpinSequence()
    }
  }, [countdown, giveaway, isSpinSequenceRunning])

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
    ctx.beginPath()
    ctx.arc(cx, cy, 28, 0, Math.PI * 2)
    ctx.fillStyle = '#050510'
    ctx.fill()
    ctx.strokeStyle = 'rgba(178,75,255,0.5)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  }, [])

  const drawSlotMachine = useCallback((list: string[], scrollY: number, winner: string, finished: boolean) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const cx = W / 2
    const itemH = 56
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#050510'
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(178,75,255,0.3)'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, W - 2, H - 2)
    if (finished) {
      ctx.fillStyle = 'rgba(178,75,255,0.12)'
      ctx.fillRect(0, H / 2 - itemH / 2, W, itemH)
      ctx.strokeStyle = 'rgba(178,75,255,0.6)'
      ctx.lineWidth = 2
      ctx.strokeRect(0, H / 2 - itemH / 2, W, itemH)
      ctx.fillStyle = '#b24bff'
      ctx.font = `bold ${isMobile ? '18px' : '22px'} Orbitron, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(('@' + winner).slice(0, 18), cx, H / 2)
      return
    }
    ctx.fillStyle = 'rgba(178,75,255,0.08)'
    ctx.fillRect(0, H / 2 - itemH / 2, W, itemH)
    ctx.strokeStyle = 'rgba(178,75,255,0.4)'
    ctx.lineWidth = 1
    ctx.strokeRect(0, H / 2 - itemH / 2, W, itemH)
    const startIdx = Math.floor(scrollY / itemH)
    const offsetY = -(scrollY % itemH)
    for (let i = -1; i <= Math.ceil(H / itemH) + 1; i++) {
      const idx = Math.abs((startIdx + i) % list.length)
      const name = list[idx]
      const y = offsetY + i * itemH + H / 2 - itemH / 2
      const distFromCenter = Math.abs(y + itemH / 2 - H / 2)
      const alpha = Math.max(0.08, 1 - (distFromCenter / (H / 2)) * 1.3)
      const scale = Math.max(0.65, 1 - (distFromCenter / (H / 2)) * 0.45)
      ctx.save()
      ctx.translate(cx, y + itemH / 2)
      ctx.scale(scale, scale)
      ctx.globalAlpha = alpha
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      if (distFromCenter < itemH / 2) {
        ctx.fillStyle = '#ffffff'
        ctx.font = `bold ${isMobile ? '16px' : '20px'} Orbitron, monospace`
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.font = `bold ${isMobile ? '14px' : '17px'} Rajdhani, sans-serif`
      }
      ctx.fillText(('@' + name).slice(0, 18), 0, 0)
      ctx.restore()
    }
    const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.38)
    topGrad.addColorStop(0, 'rgba(5,5,16,1)')
    topGrad.addColorStop(1, 'rgba(5,5,16,0)')
    ctx.fillStyle = topGrad
    ctx.fillRect(0, 0, W, H * 0.38)
    const botGrad = ctx.createLinearGradient(0, H * 0.62, 0, H)
    botGrad.addColorStop(0, 'rgba(5,5,16,0)')
    botGrad.addColorStop(1, 'rgba(5,5,16,1)')
    ctx.fillStyle = botGrad
    ctx.fillRect(0, H * 0.62, W, H * 0.38)
  }, [isMobile])

  useEffect(() => {
    if (participants.length > 0 && participants.length <= SLOT_THRESHOLD) {
      drawWheel(participants, angleRef.current)
    }
  }, [participants, drawWheel])

  const spinForWinner = (eligible: Participant[]): Promise<Participant> => {
    return new Promise(resolve => {
      const winner = eligible[Math.floor(Math.random() * eligible.length)]
      if (eligible.length <= SLOT_THRESHOLD) {
        const idx = eligible.findIndex(p => p.user_id === winner.user_id)
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
          if (progress < 1) requestAnimationFrame(anim)
          else resolve(winner)
        }
        requestAnimationFrame(anim)
      } else {
        const itemH = 56
        const displayList: string[] = []
        for (let i = 0; i < 60; i++) {
          displayList.push(eligible[Math.floor(Math.random() * eligible.length)].username)
        }
        displayList.push(winner.username)
        const targetScrollY = (displayList.length - 1) * itemH
        let scrollY = 0
        playSpinSound(3.5)
        const animateSlot = () => {
          const remaining = targetScrollY - scrollY
          if (remaining <= 0.5) {
            drawSlotMachine(displayList, targetScrollY, winner.username, true)
            resolve(winner)
            return
          }
          const progress = scrollY / targetScrollY
          const speed = Math.max(1.5, 38 * (1 - Math.pow(progress, 2.5)))
          scrollY = Math.min(scrollY + speed, targetScrollY)
          drawSlotMachine(displayList, scrollY, winner.username, false)
          requestAnimationFrame(animateSlot)
        }
        animateSlot()
      }
    })
  }

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

  const stopRecording = (): Promise<Blob | null> => {
    return new Promise(resolve => {
      const recorder = mediaRecorderRef.current
      const stream = streamRef.current
      if (!recorder || recorder.state === 'inactive') { resolve(null); return }
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        stream?.getTracks().forEach(t => t.stop())
        resolve(blob)
      }
      recorder.stop()
    })
  }

  const downloadVideo = (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `superspin-${giveaway?.title?.replace(/\s+/g, '-') || 'giveaway'}.webm`
    a.click()
    URL.revokeObjectURL(url)
  }

  const startSpinSequence = async () => {
    if (!giveaway || spinningRef.current) return
    spinningRef.current = true
    setIsSpinSequenceRunning(true)

    await updateGiveawayStatus(giveaway.id, 'in_progress')
    setGiveaway(prev => prev ? { ...prev, status: 'in_progress' } : prev)

    await startRecording()

    const allWinners: Winner[] = []

    for (let i = 0; i < giveaway.winner_count; i++) {
      const eligible = participants.filter(p => !allWinners.some(w => w.user_id === p.user_id))
      if (eligible.length === 0) break

      const winner = await spinForWinner(eligible)
      spawnConfetti()
      playFireworkSound()

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

      await new Promise(res => setTimeout(res, 3000))
      setCurrentWinner(null)
      await new Promise(res => setTimeout(res, 500))
    }

    const videoBlob = await stopRecording()

    await updateGiveawayStatus(giveaway.id, 'ended')
    setGiveaway(prev => prev ? { ...prev, status: 'ended' } : prev)

    setWinnersQueue(allWinners)
    if (videoBlob) setRecordedBlob(videoBlob)
    setAllWinnersModal(true)
    spinningRef.current = false
    setIsSpinSequenceRunning(false)
  }

  const shareResults = (w: Winner[]) => {
    const reward = giveaway?.description ? `\n🎁 Reward: ${giveaway.description}` : ''
    const winnerLines = w.length === 1
      ? `🏆 Winner: @${w[0].username}`
      : w.map((win, i) => `🏆 #${i + 1} @${win.username}`).join('\n')
    const text = [
      `🎉 Giveaway results for "${giveaway?.title}"!`,
      ``,
      winnerLines,
      reward,
      ``,
      `Powered by superspin.online`,
      `${window.location.origin}/giveaway/${id}`,
    ].join('\n')
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
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
    const reqs = giveaway?.requirements || []
    if (reqs.length > 0 && !reqDone) {
      setReqStep(0)
      setShowRequirements(true)
      return
    }
    await doJoin()
  }

  const doJoin = async () => {
    if (!user) return
    setJoining(true)
    setShowRequirements(false)
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

  const handleReqAction = (req: any) => {
    if (req.type === 'follow') {
      window.open(`https://twitter.com/intent/follow?screen_name=${req.username}`, '_blank')
    }
    setTimeout(() => {
      const reqs = giveaway?.requirements || []
      if (reqStep + 1 >= reqs.length) {
        setReqDone(true)
      } else {
        setReqStep(reqStep + 1)
      }
    }, req.type === 'follow' ? 1500 : 300)
  }

  const shareResults = (w: Winner[]) => {
    const reward = giveaway?.description ? `\n🎁 Reward: ${giveaway.description}` : ''
    const winnerLines = w.length === 1
      ? `🏆 Winner: @${w[0].username}`
      : w.map((win, i) => `🏆 #${i + 1} @${win.username}`).join('\n')
    const text = [
      `🎉 Giveaway results for "${giveaway?.title}"!`,
      ``,
      winnerLines,
      reward,
      ``,
      `Powered by superspin.online`,
      `${window.location.origin}/giveaway/${id}`,
    ].join('\n')
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, height: '60vh' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--neon-purple)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
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

        <button onClick={() => router.push('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', letterSpacing: '2px', marginBottom: isMobile ? '20px' : '32px', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
        >
          ← BACK
        </button>

        <div style={{ marginBottom: isMobile ? '24px' : '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            {giveaway.organizer_avatar && (
              <img src={giveaway.organizer_avatar} alt={giveaway.organizer_username} referrerPolicy="no-referrer"
                style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)' }} />
            )}
            <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>by @{giveaway.organizer_username}</span>
          </div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: isMobile ? '1.3rem' : '2rem', fontWeight: 900, letterSpacing: '2px', marginBottom: '10px' }}>
            {giveaway.title}
          </h1>
          {giveaway.description && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>🎁</span>
              <span style={{ color: 'var(--neon-purple)', fontWeight: 700, fontSize: '1rem' }}>{giveaway.description}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', gap: isMobile ? '24px' : '40px' }}>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '20px' : '28px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: -20, borderRadius: useSlots ? '24px' : '50%', background: 'radial-gradient(circle, rgba(178,75,255,0.2), transparent 70%)', animation: 'pulse-glow 2s ease-in-out infinite', pointerEvents: 'none' }} />
              <canvas ref={canvasRef} width={isMobile ? 300 : 380} height={isMobile ? 300 : 380}
                style={{ borderRadius: useSlots ? '20px' : '50%', filter: 'drop-shadow(0 0 30px rgba(178,75,255,0.5)) drop-shadow(0 0 60px rgba(0,212,255,0.2))' }} />
              {!useSlots && (
                <div style={{ position: 'absolute', top: '50%', right: isMobile ? -18 : -22, transform: 'translateY(-50%)', width: 0, height: 0, borderTop: `${isMobile ? 12 : 16}px solid transparent`, borderBottom: `${isMobile ? 12 : 16}px solid transparent`, borderRight: `${isMobile ? 24 : 30}px solid #ff2d78`, filter: 'drop-shadow(0 0 10px #ff2d78)', zIndex: 10 }} />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 28px', background: 'var(--dark-card)', border: '1px solid var(--border)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', letterSpacing: '2px', color: 'var(--text-dim)' }}>TIME LEFT</span>
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '1.5rem', fontWeight: 700, color: 'var(--neon-blue)', textShadow: '0 0 20px rgba(0,212,255,0.5)' }}>
                {isEnded ? 'ENDED' : countdown}
              </span>
            </div>

            {winners.length > 0 && (
              <div style={{ width: '100%' }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', letterSpacing: '3px', color: 'var(--gold)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block' }} />
                  WINNERS ({winners.length}/{giveaway.winner_count})
                </div>
                {winners.map(w => (
                  <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', marginBottom: '8px', background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.12)', borderRadius: '12px' }}>
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', color: 'var(--gold)', minWidth: 24 }}>#{w.prize_number}</span>
                    {w.avatar_url && <img src={w.avatar_url} referrerPolicy="no-referrer" style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(255,215,0,0.3)' }} />}
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>@{w.username}</span>
                  </div>
                ))}
              </div>
            )}

            {isOrg && isActive && !isSpinSequenceRunning && (
              <button onClick={startSpinSequence} style={{ padding: '16px 60px', background: 'linear-gradient(135deg, var(--neon-pink), var(--neon-purple))', border: 'none', borderRadius: '50px', color: '#fff', fontFamily: 'Orbitron, monospace', fontSize: '0.9rem', fontWeight: 900, letterSpacing: '4px', cursor: 'pointer', boxShadow: '0 0 40px rgba(255,45,120,0.4)', transition: 'all 0.3s' }}>
                🎰 SPIN NOW
              </button>
            )}

            {isSpinSequenceRunning && (
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.75rem', letterSpacing: '3px', color: 'var(--neon-purple)' }}>SPINNING...</div>
            )}

            {!isOrg && isActive && (
              hasJoined ? (
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.75rem', letterSpacing: '2px', color: 'var(--neon-green)', textShadow: '0 0 15px rgba(0,255,136,0.5)' }}>✔ YOU'RE IN!</div>
              ) : (
                <button onClick={handleJoin} disabled={joining} style={{ padding: '14px 40px', background: 'linear-gradient(135deg, var(--neon-green), #00b4d8)', border: 'none', borderRadius: '50px', color: '#000', fontFamily: 'Orbitron, monospace', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px', cursor: joining ? 'not-allowed' : 'pointer', boxShadow: '0 0 30px rgba(0,255,136,0.3)', opacity: joining ? 0.7 : 1 }}>
                  {joining ? 'JOINING...' : user ? '🎪 JOIN GIVEAWAY' : '🐦 LOGIN & JOIN'}
                </button>
              )
            )}

            {isEnded && winnersQueue.length > 0 && (
              <button onClick={() => shareResults(winnersQueue)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '50px', color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}>
                🐦 Share Results
              </button>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: 'var(--dark-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', letterSpacing: '3px', color: 'var(--neon-blue)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neon-blue)', display: 'inline-block' }} />
                PRIZE POOL
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '2rem' }}>🎁</span>
                <div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '1.8rem', fontWeight: 700, color: 'var(--neon-purple)', textShadow: '0 0 20px rgba(178,75,255,0.5)' }}>{giveaway.winner_count - winners.length}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>prizes remaining</div>
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--dark-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px', backdropFilter: 'blur(10px)', flex: 1 }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', letterSpacing: '3px', color: 'var(--neon-purple)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neon-purple)', display: 'inline-block' }} />
                  PARTICIPANTS
                </span>
                <span style={{ padding: '3px 10px', borderRadius: '20px', background: 'rgba(178,75,255,0.1)', border: '1px solid rgba(178,75,255,0.2)', fontSize: '0.65rem' }}>{participants.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 360, overflowY: 'auto', paddingRight: '4px' }}>
                {participants.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>No participants yet</div>
                ) : participants.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '10px', opacity: winners.some(w => w.user_id === p.user_id) ? 0.5 : 1 }}>
                    {p.avatar_url ? (
                      <img src={p.avatar_url} referrerPolicy="no-referrer" style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(178,75,255,0.3)' }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>
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

      {currentWinner && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,16,0.92)', backdropFilter: 'blur(20px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(178,75,255,0.15), rgba(0,212,255,0.1))', border: '1px solid rgba(178,75,255,0.4)', borderRadius: '28px', padding: isMobile ? '36px 24px' : '52px', textAlign: 'center', maxWidth: 440, width: '100%', boxShadow: '0 0 80px rgba(178,75,255,0.3)', animation: 'winner-appear 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <span style={{ fontSize: '4rem', marginBottom: '16px', display: 'block' }}>🏆</span>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', letterSpacing: '4px', color: 'var(--gold)', marginBottom: '12px' }}>
              {giveaway.winner_count > 1 ? `PRIZE #${currentWinner.prizeNum} OF ${giveaway.winner_count}` : 'WINNER!'}
            </div>
            {currentWinner.avatar_url ? (
              <img src={currentWinner.avatar_url} referrerPolicy="no-referrer" style={{ width: 90, height: 90, borderRadius: '50%', border: '3px solid var(--gold)', boxShadow: '0 0 30px rgba(255,215,0,0.4)', margin: '0 auto 16px', display: 'block' }} />
            ) : (
              <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron, monospace', fontSize: '1.8rem', fontWeight: 700, border: '3px solid var(--gold)', margin: '0 auto 16px' }}>
                {currentWinner.username[0]?.toUpperCase()}
              </div>
            )}
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 900, background: 'linear-gradient(135deg, var(--gold), #ffed8a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: '8px' }}>
              @{currentWinner.username}
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Spinning next winner...</div>
          </div>
        </div>
      )}

      {allWinnersModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,16,0.92)', backdropFilter: 'blur(20px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(178,75,255,0.15), rgba(0,212,255,0.1))', border: '1px solid rgba(178,75,255,0.4)', borderRadius: '28px', padding: isMobile ? '36px 24px' : '52px', textAlign: 'center', maxWidth: 500, width: '100%', boxShadow: '0 0 80px rgba(178,75,255,0.3)', animation: 'winner-appear 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '16px' }}>🎊</span>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', letterSpacing: '4px', color: 'var(--neon-blue)', marginBottom: '8px' }}>{giveaway.title}</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '1.4rem', fontWeight: 900, background: 'linear-gradient(135deg, var(--gold), #ffed8a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: '32px' }}>
              ALL {winnersQueue.length} WINNERS!
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
              {winnersQueue.map(w => (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)', borderRadius: '14px', textAlign: 'left' }}>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', color: 'var(--gold)', minWidth: 24 }}>#{w.prize_number}</span>
                  {w.avatar_url ? (
                    <img src={w.avatar_url} referrerPolicy="no-referrer" style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(255,215,0,0.4)' }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>{w.username[0]?.toUpperCase()}</div>
                  )}
                  <span style={{ fontWeight: 700 }}>@{w.username}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => shareResults(winnersQueue)}
                style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: '50px', color: '#fff', fontFamily: 'Orbitron, monospace', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px', cursor: 'pointer' }}>
                🐦 Share
              </button>
              {recordedBlob && (
                <button onClick={() => downloadVideo(recordedBlob)}
                  style={{ padding: '12px 24px', background: 'rgba(255,45,120,0.1)', border: '1px solid rgba(255,45,120,0.35)', borderRadius: '50px', color: '#ff2d78', fontFamily: 'Orbitron, monospace', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px', cursor: 'pointer' }}>
                  ⬇ Download Video
                </button>
              )}
              <button onClick={() => { setAllWinnersModal(false); router.push('/') }}
                style={{ padding: '12px 24px', background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))', border: 'none', borderRadius: '50px', color: '#fff', fontFamily: 'Orbitron, monospace', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px', cursor: 'pointer', boxShadow: '0 0 20px rgba(178,75,255,0.4)' }}>
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {showRequirements && giveaway && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,16,0.95)', backdropFilter: 'blur(20px)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(178,75,255,0.15), rgba(0,212,255,0.08))', border: '1px solid rgba(178,75,255,0.35)', borderRadius: '28px', padding: isMobile ? '32px 24px' : '48px', maxWidth: 460, width: '100%', boxShadow: '0 0 80px rgba(178,75,255,0.25)' }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', letterSpacing: '4px', color: '#00d4ff', marginBottom: '8px' }}>TO ENTER</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '1.2rem', fontWeight: 900, color: '#fff', marginBottom: '28px' }}>Complete the steps</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
              {(giveaway.requirements || []).map((req, i) => {
                const isDone = reqDone || i < reqStep
                const isCurrent = !reqDone && i === reqStep
                const label = req.type === 'follow' ? `Follow @${req.username}` : req.type === 'like' ? '❤️ Like the giveaway post' : '💬 Reply to the giveaway post'
                const icon = req.type === 'follow' ? '👤' : req.type === 'like' ? '❤️' : '💬'
                return (
                  <div key={i} onClick={() => isCurrent && handleReqAction(req)}
                    style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', background: isDone ? 'rgba(0,255,136,0.06)' : isCurrent ? 'rgba(178,75,255,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isDone ? 'rgba(0,255,136,0.3)' : isCurrent ? 'rgba(178,75,255,0.4)' : 'var(--border)'}`, borderRadius: '14px', cursor: isCurrent ? 'pointer' : 'default', transition: 'all 0.2s' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: isDone ? 'rgba(0,255,136,0.2)' : isCurrent ? 'rgba(178,75,255,0.2)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                      {isDone ? '✓' : icon}
                    </div>
                    <span style={{ flex: 1, fontWeight: 600, color: isDone ? '#00ff88' : isCurrent ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: '0.95rem' }}>{label}</span>
                    {isCurrent && <span style={{ fontSize: '0.7rem', fontFamily: 'Orbitron, monospace', color: '#b24bff', letterSpacing: '1px' }}>TAP →</span>}
                    {isDone && <span style={{ fontSize: '0.7rem', fontFamily: 'Orbitron, monospace', color: '#00ff88', letterSpacing: '1px' }}>DONE</span>}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => reqDone ? doJoin() : undefined} disabled={!reqDone}
                style={{ flex: 1, padding: '14px', background: reqDone ? 'linear-gradient(135deg, #00ff88, #00b4d8)' : 'rgba(255,255,255,0.05)', border: reqDone ? 'none' : '1px solid var(--border)', borderRadius: '12px', color: reqDone ? '#000' : 'rgba(255,255,255,0.3)', fontFamily: 'Orbitron, monospace', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px', cursor: reqDone ? 'pointer' : 'not-allowed', transition: 'all 0.3s', boxShadow: reqDone ? '0 0 25px rgba(0,255,136,0.3)' : 'none' }}>
                ✓ JOIN GIVEAWAY
              </button>
              <button onClick={() => setShowRequirements(false)}
                style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-dim)', fontSize: '0.9rem', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
