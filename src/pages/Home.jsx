import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveGiveaways } from '../lib/supabase'
import { loginWithX } from '../lib/auth'

export default function Home({ user }) {
  const [giveaways, setGiveaways] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getActiveGiveaways().then(d => { setGiveaways(d || []); setLoading(false) })
  }, [])

  const timeLeft = (endsAt) => {
    const diff = new Date(endsAt) - new Date()
    if (diff <= 0) return 'Ended'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return h > 24 ? `${Math.floor(h/24)}d ${h%24}h` : `${h}h ${m}m`
  }

  return (
    <div style={{ position:'relative', zIndex:1, maxWidth:1200, margin:'0 auto', padding:'60px 40px' }}>
      {/* Hero */}
      <div style={{ textAlign:'center', marginBottom:'80px' }}>
        <div style={{ fontFamily:'Orbitron', fontSize:'0.65rem', letterSpacing:'6px', color:'var(--blue)', marginBottom:'20px' }}>
          ✦ THE ULTIMATE GIVEAWAY PLATFORM ✦
        </div>
        <h1 style={{ fontFamily:'Orbitron', fontSize:'clamp(2.5rem,6vw,5rem)', fontWeight:900, lineHeight:1.1, marginBottom:'24px' }}>
          <span style={{ background:'linear-gradient(135deg,var(--blue),var(--purple))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Super</span>
          <span style={{ background:'linear-gradient(135deg,var(--purple),var(--pink))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Spin</span>
        </h1>
        <p style={{ fontSize:'1.2rem', color:'rgba(255,255,255,0.4)', maxWidth:500, margin:'0 auto 40px', lineHeight:1.6 }}>
          Create giveaways, spin the wheel, find your winners — live on X.
        </p>
        {!user ? (
          <button onClick={loginWithX} style={{
            display:'inline-flex', alignItems:'center', gap:'10px', padding:'16px 40px',
            background:'linear-gradient(135deg,var(--purple),var(--blue))',
            border:'none', borderRadius:'50px', color:'#fff',
            fontFamily:'Orbitron', fontSize:'0.85rem', fontWeight:700, letterSpacing:'2px',
            boxShadow:'0 0 30px rgba(178,75,255,0.4)'
          }}>
            <span style={{ fontSize:'1.2rem' }}>𝕏</span> START WITH X
          </button>
        ) : (
          <button onClick={() => navigate('/create')} style={{
            display:'inline-flex', alignItems:'center', gap:'10px', padding:'16px 40px',
            background:'linear-gradient(135deg,var(--purple),var(--blue))',
            border:'none', borderRadius:'50px', color:'#fff',
            fontFamily:'Orbitron', fontSize:'0.85rem', fontWeight:700, letterSpacing:'2px',
            boxShadow:'0 0 30px rgba(178,75,255,0.4)'
          }}>+ CREATE GIVEAWAY</button>
        )}
      </div>

      {/* Giveaways */}
      <div>
        <div style={{ fontFamily:'Orbitron', fontSize:'0.65rem', letterSpacing:'4px', color:'var(--purple)', marginBottom:'24px', display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--purple)', boxShadow:'0 0 8px var(--purple)', display:'inline-block' }} />
          ACTIVE GIVEAWAYS
        </div>

        {loading ? (
          <div style={{ textAlign:'center', color:'rgba(255,255,255,0.2)', padding:'60px', fontFamily:'Orbitron', letterSpacing:'3px', fontSize:'0.8rem' }}>LOADING...</div>
        ) : giveaways.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px', background:'rgba(255,255,255,0.02)', border:'1px dashed rgba(255,255,255,0.08)', borderRadius:'20px' }}>
            <div style={{ fontSize:'3rem', marginBottom:'16px' }}>🎡</div>
            <div style={{ color:'rgba(255,255,255,0.3)' }}>No active giveaways yet — be the first!</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px,1fr))', gap:'20px' }}>
            {giveaways.map(g => (
              <div key={g.id} onClick={() => navigate(`/giveaway/${g.id}`)}
                style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'16px', padding:'24px', cursor:'pointer', transition:'all 0.3s', backdropFilter:'blur(10px)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(178,75,255,0.4)'; e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 10px 40px rgba(178,75,255,0.2)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none' }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
                  {g.organizer_avatar
                    ? <img src={g.organizer_avatar} style={{ width:36, height:36, borderRadius:'50%', border:'2px solid var(--purple)' }} />
                    : <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,var(--purple),var(--blue))', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{g.organizer_name?.charAt(0)}</div>
                  }
                  <span style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.4)', fontWeight:600 }}>@{g.organizer_name}</span>
                </div>
                <div style={{ fontFamily:'Orbitron', fontSize:'1rem', fontWeight:700, marginBottom:'12px' }}>{g.title}</div>
                {g.description && <div style={{ fontSize:'0.9rem', color:'rgba(255,255,255,0.4)', marginBottom:'16px', lineHeight:1.5 }}>{g.description}</div>}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:'16px', borderTop:'1px solid var(--border)' }}>
                  <span style={{ color:'var(--gold)', fontWeight:700 }}>🏆 {g.prize_count} prize{g.prize_count > 1 ? 's' : ''}</span>
                  <span style={{ padding:'4px 12px', borderRadius:'20px', background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.2)', fontSize:'0.75rem', color:'var(--blue)', fontFamily:'Orbitron' }}>⏱ {timeLeft(g.ends_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
