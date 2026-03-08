import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, getGiveaway, getParticipants, joinGiveaway, saveWinner, getWinners, closeGiveaway } from '../lib/supabase'
import { loginWithX } from '../lib/auth'

const COLORS = [
  ['#b24bff','#8a2be2'],['#00d4ff','#0099cc'],['#ff2d78','#cc0055'],
  ['#00ff88','#00cc66'],['#ff9500','#cc7700'],['#ff6b6b','#cc4444'],
  ['#4ecdc4','#3aada5'],['#ffe66d','#ccb844'],['#a8e6cf','#7abf9e'],['#ffd93d','#ccaa2a']
]
const MAX_SLICES = 50
const SLOT_H = 70

export default function GiveawayPage({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const angleRef = useRef(0)
  const slotOffsetRef = useRef(0)
  const isSpinningRef = useRef(false)

  const [giveaway, setGiveaway] = useState(null)
  const [participants, setParticipants] = useState([])
  const [winners, setWinners] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [winnerModal, setWinnerModal] = useState(null)
  const [finaleModal, setFinaleModal] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [spinTick, setSpinTick] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const [g, p, w] = await Promise.all([getGiveaway(id), getParticipants(id), getWinners(id)])
        setGiveaway(g); setParticipants(p); setWinners(w)
        if (user) setHasJoined(p.some(x => x.user_id === user.id))
      } catch { navigate('/') }
      setLoading(false)
    }
    load()
  }, [id, user])

  useEffect(() => {
    const ch = supabase.channel(`giveaway-${id}`)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'participants', filter:`giveaway_id=eq.${id}` },
        p => setParticipants(prev => [...prev, p.new]))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [id])

  useEffect(() => {
    if (!giveaway) return
    const tick = () => {
      const diff = new Date(giveaway.ends_at) - new Date()
      if (diff <= 0) { setTimeLeft('Ended'); return }
      const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000), s = Math.floor((diff%60000)/1000)
      setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t)
  }, [giveaway])

  const isOrganizer = user && giveaway && user.id === giveaway.organizer_id
  const eligible = participants.filter(p => !winners.some(w => w.user_id === p.user_id))

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height, cx = W/2, cy = H/2

    ctx.clearRect(0, 0, W, H)

    if (eligible.length === 0) {
      ctx.beginPath(); ctx.arc(cx, cy, cx-10, 0, Math.PI*2)
      ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fill()
      ctx.strokeStyle = 'rgba(178,75,255,0.3)'; ctx.lineWidth = 3; ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = "14px 'Rajdhani',sans-serif"
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('Waiting for participants...', cx, cy)
      return
    }

    if (eligible.length > MAX_SLICES) { drawSlot(ctx, W, H); return }

    const r = cx - 10, sliceAngle = (Math.PI*2) / eligible.length
    eligible.forEach((p, i) => {
      const start = angleRef.current + i*sliceAngle, end = start + sliceAngle
      const color = COLORS[i % COLORS.length], mid = start + sliceAngle/2
      ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, end); ctx.closePath()
      const grad = ctx.createRadialGradient(cx+Math.cos(mid)*r*0.4, cy+Math.sin(mid)*r*0.4, 0, cx, cy, r)
      grad.addColorStop(0, color[0]); grad.addColorStop(1, color[1])
      ctx.fillStyle = grad; ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore()
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(mid); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
      const fs = eligible.length <= 20 ? 13 : eligible.length <= 35 ? 11 : 9
      ctx.font = `bold ${fs}px 'Rajdhani',sans-serif`
      let name = '@'+p.username
      while (ctx.measureText(name).width > r*0.62 && name.length > 3) name = name.slice(0,-1)
      if (name !== '@'+p.username) name += '…'
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(name, r*0.88+1, 1)
      ctx.fillStyle = '#fff'; ctx.fillText(name, r*0.88, 0); ctx.restore()
    })

    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r+2, 0, Math.PI*2)
    ctx.strokeStyle = 'rgba(178,75,255,0.4)'; ctx.lineWidth = 2
    ctx.shadowColor = 'rgba(178,75,255,0.8)'; ctx.shadowBlur = 15; ctx.stroke(); ctx.restore()

    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 36, 0, Math.PI*2)
    ctx.fillStyle = '#050510'; ctx.fill()
    ctx.strokeStyle = 'rgba(178,75,255,0.6)'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore()
  }, [eligible, spinTick])

  const drawSlot = (ctx, W, H) => {
    const offset = slotOffsetRef.current, centerY = H/2
    ctx.fillStyle = 'rgba(5,5,16,0.95)'; ctx.fillRect(0, 0, W, H)
    const visCount = Math.ceil(H/SLOT_H)+2, startIdx = Math.floor(offset/SLOT_H)
    const offsetY = -(offset % SLOT_H)
    for (let i = 0; i < visCount; i++) {
      const idx = ((startIdx+i) % eligible.length + eligible.length) % eligible.length
      const e = eligible[idx], color = COLORS[idx % COLORS.length]
      const y = offsetY + i*SLOT_H, dist = Math.abs((y+SLOT_H/2)-centerY)
      ctx.save(); ctx.globalAlpha = Math.max(0.15, 1-dist/(H*0.55))
      const grad = ctx.createLinearGradient(0,y,W,y+SLOT_H)
      grad.addColorStop(0,color[1]+'cc'); grad.addColorStop(0.5,color[0]+'ee'); grad.addColorStop(1,color[1]+'cc')
      ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(20,y+4,W-40,SLOT_H-8,10); ctx.fill()
      if (dist < SLOT_H/2) { ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.shadowColor=color[0]; ctx.shadowBlur=15; ctx.stroke() }
      ctx.fillStyle='#fff'; ctx.font="bold 16px 'Rajdhani',sans-serif"; ctx.textAlign='center'; ctx.textBaseline='middle'
      ctx.fillText('@'+e.username, W/2, y+SLOT_H/2); ctx.restore()
    }
    const ft = ctx.createLinearGradient(0,0,0,H*0.35); ft.addColorStop(0,'rgba(5,5,16,1)'); ft.addColorStop(1,'rgba(5,5,16,0)')
    ctx.fillStyle=ft; ctx.fillRect(0,0,W,H*0.35)
    const fb = ctx.createLinearGradient(0,H*0.65,0,H); fb.addColorStop(0,'rgba(5,5,16,0)'); fb.addColorStop(1,'rgba(5,5,16,1)')
    ctx.fillStyle=fb; ctx.fillRect(0,H*0.65,W,H*0.35)
    ctx.save(); ctx.strokeStyle='rgba(178,75,255,0.8)'; ctx.lineWidth=2; ctx.shadowColor='rgba(178,75,255,1)'; ctx.shadowBlur=10
    ctx.beginPath(); ctx.moveTo(10,centerY-SLOT_H/2); ctx.lineTo(W-10,centerY-SLOT_H/2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(10,centerY+SLOT_H/2); ctx.lineTo(W-10,centerY+SLOT_H/2); ctx.stroke(); ctx.restore()
  }

  useEffect(() => { drawWheel() }, [drawWheel])

  const spin = () => {
    if (isSpinningRef.current || !isOrganizer || eligible.length < 2) return
    const winner = eligible[Math.floor(Math.random() * eligible.length)]
    isSpinningRef.current = true

    if (eligible.length > MAX_SLICES) {
      const winIdx = eligible.findIndex(p => p.user_id === winner.user_id)
      const target = (8+Math.floor(Math.random()*6)) * eligible.length * SLOT_H + winIdx*SLOT_H + SLOT_H/2 - 220
      const duration = 4000+Math.random()*2000, startOff = slotOffsetRef.current
      let start = null
      const animate = ts => {
        if (!start) start = ts
        const p = Math.min((ts-start)/duration, 1), e = 1-Math.pow(1-p,3)
        slotOffsetRef.current = startOff + e*(target-startOff)
        setSpinTick(t => t+1)
        if (p < 1) requestAnimationFrame(animate)
        else { isSpinningRef.current = false; handleWinner(winner) }
      }
      requestAnimationFrame(animate)
    } else {
      const winIdx = eligible.findIndex(p => p.user_id === winner.user_id)
      const sliceAngle = (Math.PI*2)/eligible.length
      const target = Math.PI*2*(5+Math.floor(Math.random()*5)) - (winIdx*sliceAngle+sliceAngle/2) + (Math.random()-0.5)*sliceAngle*0.6
      const duration = 4500+Math.random()*1500
      let start = null
      const animate = ts => {
        if (!start) start = ts
        const p = Math.min((ts-start)/duration, 1), e = 1-Math.pow(1-p,3)
        angleRef.current = e * target
        setSpinTick(t => t+1)
        if (p < 1) requestAnimationFrame(animate)
        else { isSpinningRef.current = false; handleWinner(winner) }
      }
      requestAnimationFrame(animate)
    }
  }

  const handleWinner = async (winner) => {
    spawnConfetti()
    const prizeNum = winners.length + 1
    try {
      await saveWinner({ giveaway_id:id, user_id:winner.user_id, username:winner.username, avatar_url:winner.avatar_url, prize_number:prizeNum })
      const newWinners = [...winners, {...winner, prize_number:prizeNum}]
      setWinners(newWinners)
      setWinnerModal({...winner, prizeNum})
      if (newWinners.length >= giveaway.prize_count) {
        await closeGiveaway(id)
        setTimeout(() => { setWinnerModal(null); setFinaleModal(true) }, 3000)
      }
    } catch(e) { console.error(e) }
  }

  const handleJoin = async () => {
    if (!user) { localStorage.setItem('returnTo', `/giveaway/${id}`); loginWithX(); return }
    if (!agreed) return
    setJoining(true)
    try {
      await joinGiveaway({ giveaway_id:id, user_id:user.id, username:user.user_metadata?.user_name||user.user_metadata?.name, avatar_url:user.user_metadata?.avatar_url })
      setHasJoined(true)
    } catch(e) { console.error(e) }
    setJoining(false)
  }

  const spawnConfetti = () => {
    const colors = ['#b24bff','#00d4ff','#ff2d78','#00ff88','#ffd700','#ff9500']
    for (let i = 0; i < 80; i++) {
      setTimeout(() => {
        const p = document.createElement('div')
        p.style.cssText = `position:fixed;width:${6+Math.random()*10}px;height:${6+Math.random()*10}px;top:-10px;left:${Math.random()*100}vw;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${Math.random()>.5?'50%':'2px'};pointer-events:none;z-index:9999;animation:cfetti ${2+Math.random()*2}s linear forwards`
        document.body.appendChild(p); setTimeout(() => p.remove(), 4000)
      }, i*30)
    }
  }

  const shareOnX = () => {
    const winnerNames = winners.map((w,i) => `#${i+1} @${w.username}`).join(' ')
    const text = `🎉 ${giveaway.title} Winners!\n\n${winnerNames}\n\nSpun with SuperSpin.online 🎡`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  const shareGiveaway = () => {
    const text = `🎡 Join my giveaway!\n\n${giveaway.title}\n👉 ${window.location.href}\n\n🏆 ${giveaway.prize_count} prize${giveaway.prize_count>1?'s':''}\nPowered by SuperSpin.online`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh' }}><div style={{ fontFamily:'Orbitron', color:'var(--purple)', letterSpacing:'4px' }}>LOADING...</div></div>

  const isSlot = eligible.length > MAX_SLICES

  return (
    <div style={{ position:'relative', zIndex:1, maxWidth:1200, margin:'0 auto', padding:'40px' }}>
      <style>{`
        @keyframes cfetti { 0%{transform:translateY(0) rotate(0);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
        @keyframes winPop { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'16px', marginBottom:'32px' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
            {giveaway.organizer_avatar && <img src={giveaway.organizer_avatar} style={{ width:32, height:32, borderRadius:'50%', border:'2px solid var(--purple)' }} />}
            <span style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.4)' }}>@{giveaway.organizer_name}</span>
          </div>
          <h1 style={{ fontFamily:'Orbitron', fontSize:'clamp(1.2rem,3vw,2rem)', fontWeight:900, marginBottom:'8px' }}>{giveaway.title}</h1>
          {giveaway.description && <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.95rem', maxWidth:500 }}>{giveaway.description}</p>}
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'12px' }}>
          <div style={{ padding:'12px 24px', background:'rgba(0,212,255,0.08)', border:'1px solid rgba(0,212,255,0.2)', borderRadius:'12px', fontFamily:'Orbitron', fontSize:'1.4rem', color:'var(--blue)', letterSpacing:'3px' }}>{timeLeft}</div>
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={shareGiveaway} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'rgba(255,255,255,0.06)', border:'1px solid var(--border)', borderRadius:'8px', color:'#fff', fontSize:'0.85rem' }}>𝕏 Share</button>
            <div style={{ padding:'8px 16px', background:'rgba(255,215,0,0.08)', border:'1px solid rgba(255,215,0,0.2)', borderRadius:'8px', color:'var(--gold)', fontSize:'0.85rem', fontWeight:700 }}>🏆 {giveaway.prize_count} prize{giveaway.prize_count>1?'s':''}</div>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:'32px' }}>
        {/* Wheel */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'24px' }}>
          <div style={{ position:'relative', width:440, height:440 }}>
            <div style={{ position:'absolute', inset:-20, borderRadius:'50%', background:'radial-gradient(circle,rgba(178,75,255,0.2) 0%,transparent 70%)', pointerEvents:'none' }} />
            <canvas ref={canvasRef} width={440} height={440}
              style={{ borderRadius:isSlot?'16px':'50%', filter:'drop-shadow(0 0 30px rgba(178,75,255,0.5))', cursor:isOrganizer&&eligible.length>=2?'pointer':'default' }}
              onClick={isOrganizer ? spin : undefined} />
            {!isSlot && isOrganizer && (
              <>
                <div style={{ position:'absolute', top:'50%', right:-24, transform:'translateY(-50%)', width:0, height:0, borderTop:'18px solid transparent', borderBottom:'18px solid transparent', borderRight:'36px solid var(--pink)', filter:'drop-shadow(0 0 10px var(--pink))' }} />
                <div onClick={spin} style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:70, height:70, borderRadius:'50%', background:'#050510', border:'3px solid var(--purple)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:10, boxShadow:'0 0 20px rgba(178,75,255,0.4)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </>
            )}
          </div>

          {isOrganizer && (
            <button onClick={spin} disabled={eligible.length < 2} style={{
              padding:'16px 60px', background:eligible.length<2?'rgba(178,75,255,0.2)':'linear-gradient(135deg,var(--purple),var(--blue))',
              border:'none', borderRadius:'50px', color:'#fff', fontFamily:'Orbitron', fontSize:'1rem', fontWeight:700,
              letterSpacing:'3px', cursor:eligible.length<2?'not-allowed':'pointer',
              boxShadow:eligible.length<2?'none':'0 0 30px rgba(178,75,255,0.4)'
            }}>⚡ SPIN</button>
          )}

          {winners.length > 0 && (
            <div style={{ width:'100%', background:'rgba(255,215,0,0.05)', border:'1px solid rgba(255,215,0,0.2)', borderRadius:'16px', padding:'20px' }}>
              <div style={{ fontFamily:'Orbitron', fontSize:'0.65rem', letterSpacing:'3px', color:'var(--gold)', marginBottom:'12px' }}>🏆 WINNERS</div>
              {winners.map((w,i) => (
                <div key={w.id||i} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 0', borderBottom:i<winners.length-1?'1px solid rgba(255,215,0,0.1)':'none' }}>
                  <span style={{ fontFamily:'Orbitron', fontSize:'0.7rem', color:'var(--gold)', minWidth:24 }}>#{w.prize_number}</span>
                  {w.avatar_url ? <img src={w.avatar_url} style={{ width:32, height:32, borderRadius:'50%', border:'2px solid var(--gold)' }} /> :
                    <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,var(--purple),var(--blue))', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{w.username.charAt(0).toUpperCase()}</div>}
                  <span style={{ fontWeight:700 }}>@{w.username}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
          {!isOrganizer && (
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'16px', padding:'24px', backdropFilter:'blur(10px)' }}>
              <div style={{ fontFamily:'Orbitron', fontSize:'0.65rem', letterSpacing:'3px', color:'var(--blue)', marginBottom:'16px' }}>● PARTICIPATE</div>
              {hasJoined ? (
                <div style={{ textAlign:'center', padding:'20px', background:'rgba(0,255,136,0.08)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:'12px' }}>
                  <div style={{ fontSize:'2rem', marginBottom:'8px' }}>✅</div>
                  <div style={{ color:'var(--green)', fontWeight:700 }}>You're in!</div>
                  <div style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.85rem', marginTop:'4px' }}>Good luck! 🍀</div>
                </div>
              ) : (
                <>
                  <label style={{ display:'flex', alignItems:'flex-start', gap:'10px', cursor:'pointer', marginBottom:'16px' }}>
                    <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop:3, accentColor:'var(--purple)', width:16, height:16 }} />
                    <span style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.6)', lineHeight:1.5 }}>
                      I confirm I follow <strong>@{giveaway.organizer_name}</strong> and have commented on their post.
                    </span>
                  </label>
                  <button onClick={handleJoin} disabled={joining||!agreed} style={{
                    width:'100%', padding:'14px', background:!agreed?'rgba(178,75,255,0.2)':'linear-gradient(135deg,var(--purple),var(--blue))',
                    border:'none', borderRadius:'12px', color:'#fff', fontFamily:'Orbitron', fontSize:'0.8rem', fontWeight:700,
                    letterSpacing:'2px', cursor:!agreed?'not-allowed':'pointer', boxShadow:!agreed?'none':'0 0 20px rgba(178,75,255,0.3)'
                  }}>{joining?'JOINING...':user?'🎡 JOIN GIVEAWAY':'𝕏 LOGIN & JOIN'}</button>
                </>
              )}
            </div>
          )}

          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'16px', padding:'24px', backdropFilter:'blur(10px)', flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
              <div style={{ fontFamily:'Orbitron', fontSize:'0.65rem', letterSpacing:'3px', color:'var(--purple)' }}>● PARTICIPANTS</div>
              <div style={{ padding:'4px 12px', borderRadius:'20px', background:'rgba(178,75,255,0.1)', border:'1px solid rgba(178,75,255,0.2)', fontFamily:'Orbitron', fontSize:'0.65rem', color:'var(--purple)' }}>{participants.length}</div>
            </div>
            <div style={{ maxHeight:400, overflowY:'auto', display:'flex', flexDirection:'column', gap:'8px' }}>
              {participants.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px', color:'rgba(255,255,255,0.2)' }}>No participants yet</div>
              ) : [...participants].reverse().map(p => (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)', borderRadius:'10px', opacity:winners.some(w=>w.user_id===p.user_id)?0.4:1 }}>
                  {p.avatar_url ? <img src={p.avatar_url} style={{ width:32, height:32, borderRadius:'50%', border:'2px solid var(--purple)', flexShrink:0 }} /> :
                    <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,var(--purple),var(--blue))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', fontWeight:700, flexShrink:0 }}>{p.username.charAt(0).toUpperCase()}</div>}
                  <span style={{ fontWeight:600, color:winners.some(w=>w.user_id===p.user_id)?'var(--gold)':'#fff', fontSize:'0.9rem' }}>
                    @{p.username}{winners.some(w=>w.user_id===p.user_id)&&' 🏆'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Winner Modal */}
      {winnerModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(5,5,16,0.92)', backdropFilter:'blur(20px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'linear-gradient(135deg,rgba(178,75,255,0.15),rgba(0,212,255,0.1))', border:'1px solid rgba(178,75,255,0.4)', borderRadius:'24px', padding:'48px', textAlign:'center', maxWidth:420, width:'90%', boxShadow:'0 0 80px rgba(178,75,255,0.3)', animation:'winPop 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <div style={{ fontSize:'3.5rem', marginBottom:'16px' }}>🏆</div>
            <div style={{ fontFamily:'Orbitron', fontSize:'0.65rem', letterSpacing:'4px', color:'var(--gold)', marginBottom:'12px' }}>✦ PRIZE #{winnerModal.prizeNum} WINNER ✦</div>
            {winnerModal.avatar_url
              ? <img src={winnerModal.avatar_url} style={{ width:80, height:80, borderRadius:'50%', border:'3px solid var(--gold)', boxShadow:'0 0 30px rgba(255,215,0,0.4)', marginBottom:16 }} />
              : <div style={{ width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,var(--purple),var(--blue))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem', fontWeight:700, border:'3px solid var(--gold)', margin:'0 auto 16px' }}>{winnerModal.username.charAt(0).toUpperCase()}</div>
            }
            <div style={{ fontFamily:'Orbitron', fontSize:'1.6rem', fontWeight:900, background:'linear-gradient(135deg,var(--gold),#ffed8a)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:'32px' }}>@{winnerModal.username}</div>
            <button onClick={() => setWinnerModal(null)} style={{ padding:'12px 40px', background:'linear-gradient(135deg,var(--purple),var(--blue))', border:'none', borderRadius:'50px', color:'#fff', fontFamily:'Orbitron', fontSize:'0.75rem', fontWeight:700, letterSpacing:'2px' }}>CONTINUE</button>
          </div>
        </div>
      )}

      {/* Finale Modal */}
      {finaleModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(5,5,16,0.92)', backdropFilter:'blur(20px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'linear-gradient(135deg,rgba(178,75,255,0.15),rgba(0,212,255,0.1))', border:'1px solid rgba(178,75,255,0.4)', borderRadius:'24px', padding:'48px', textAlign:'center', maxWidth:520, width:'90%', boxShadow:'0 0 80px rgba(178,75,255,0.3)' }}>
            <div style={{ fontSize:'3rem', marginBottom:'12px' }}>🎊</div>
            <div style={{ fontFamily:'Orbitron', fontSize:'0.65rem', letterSpacing:'4px', color:'var(--blue)', marginBottom:'8px' }}>✦ {giveaway.title} ✦</div>
            <div style={{ fontFamily:'Orbitron', fontSize:'1.2rem', fontWeight:900, background:'linear-gradient(135deg,var(--gold),#ffed8a)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:'24px' }}>All {winners.length} Winners!</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'28px' }}>
              {winners.map((w,i) => (
                <div key={w.id||i} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 16px', background:'rgba(255,215,0,0.07)', border:'1px solid rgba(255,215,0,0.2)', borderRadius:'12px' }}>
                  <span style={{ fontFamily:'Orbitron', fontSize:'0.7rem', color:'var(--gold)', minWidth:24 }}>#{i+1}</span>
                  {w.avatar_url ? <img src={w.avatar_url} style={{ width:36, height:36, borderRadius:'50%', border:'2px solid var(--gold)' }} /> :
                    <div style={{ width:36, height:36, borderRadius:'50%', background:`linear-gradient(135deg,${COLORS[i%COLORS.length][0]},${COLORS[i%COLORS.length][1]})`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, border:'2px solid var(--gold)' }}>{w.username.charAt(0).toUpperCase()}</div>}
                  <span style={{ fontWeight:700 }}>@{w.username}</span>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap' }}>
              <button onClick={shareOnX} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'10px 20px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'50px', color:'#fff', fontSize:'0.9rem', fontWeight:600 }}>𝕏 Share Results</button>
              <button onClick={() => { setFinaleModal(false); navigate('/') }} style={{ padding:'10px 24px', background:'linear-gradient(135deg,var(--purple),var(--blue))', border:'none', borderRadius:'50px', color:'#fff', fontFamily:'Orbitron', fontSize:'0.75rem', fontWeight:700, letterSpacing:'2px' }}>CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
