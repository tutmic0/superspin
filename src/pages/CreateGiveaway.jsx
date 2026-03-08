import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createGiveaway } from '../lib/supabase'
import { loginWithX } from '../lib/auth'

export default function CreateGiveaway({ user }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ title:'', description:'', prize_count:1, duration_hours:24 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!user) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh', flexDirection:'column', gap:'24px', position:'relative', zIndex:1 }}>
      <div style={{ fontFamily:'Orbitron', color:'rgba(255,255,255,0.5)', letterSpacing:'2px' }}>Login required</div>
      <button onClick={loginWithX} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'14px 32px', background:'linear-gradient(135deg,var(--purple),var(--blue))', border:'none', borderRadius:'50px', color:'#fff', fontFamily:'Orbitron', fontSize:'0.8rem', fontWeight:700, letterSpacing:'2px' }}>
        <span>𝕏</span> Login with X
      </button>
    </div>
  )

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return }
    setLoading(true); setError('')
    try {
      const g = await createGiveaway({
        title: form.title, description: form.description,
        prize_count: form.prize_count, duration_hours: form.duration_hours,
        organizer_id: user.id,
        organizer_name: user.user_metadata?.user_name || user.user_metadata?.name,
        organizer_avatar: user.user_metadata?.avatar_url
      })
      navigate(`/giveaway/${g.id}`)
    } catch(e) { setError('Failed to create. Try again.'); setLoading(false) }
  }

  const inp = { width:'100%', padding:'14px 18px', background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)', borderRadius:'12px', color:'#fff', fontSize:'1rem', outline:'none' }
  const lbl = { fontFamily:'Orbitron', fontSize:'0.6rem', letterSpacing:'3px', color:'var(--blue)', textTransform:'uppercase', marginBottom:'8px', display:'block' }

  return (
    <div style={{ position:'relative', zIndex:1, maxWidth:600, margin:'0 auto', padding:'60px 40px' }}>
      <div style={{ marginBottom:'40px' }}>
        <div style={{ fontFamily:'Orbitron', fontSize:'0.65rem', letterSpacing:'4px', color:'var(--purple)', marginBottom:'12px' }}>✦ NEW GIVEAWAY ✦</div>
        <h1 style={{ fontFamily:'Orbitron', fontSize:'2rem', fontWeight:900 }}>Create Giveaway</h1>
      </div>

      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'20px', padding:'32px', backdropFilter:'blur(10px)', display:'flex', flexDirection:'column', gap:'24px' }}>
        <div>
          <label style={lbl}>Title *</label>
          <input style={inp} placeholder="e.g. Lexmark Printer Giveaway" value={form.title}
            onChange={e => setForm({...form, title:e.target.value})}
            onFocus={e => e.target.style.borderColor='var(--purple)'}
            onBlur={e => e.target.style.borderColor='var(--border)'} />
        </div>

        <div>
          <label style={lbl}>Description (optional)</label>
          <textarea style={{...inp, minHeight:100, resize:'vertical'}} placeholder="What are you giving away?"
            value={form.description} onChange={e => setForm({...form, description:e.target.value})}
            onFocus={e => e.target.style.borderColor='var(--purple)'}
            onBlur={e => e.target.style.borderColor='var(--border)'} />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
          <div>
            <label style={lbl}>Number of Prizes</label>
            <input style={{...inp, textAlign:'center'}} type="number" min="1" max="50"
              value={form.prize_count} onChange={e => setForm({...form, prize_count:parseInt(e.target.value)||1})}
              onFocus={e => e.target.style.borderColor='var(--purple)'}
              onBlur={e => e.target.style.borderColor='var(--border)'} />
          </div>
          <div>
            <label style={lbl}>Duration</label>
            <select style={{...inp, cursor:'pointer'}} value={form.duration_hours} onChange={e => setForm({...form, duration_hours:parseInt(e.target.value)})}>
              <option value="1">1 hour</option>
              <option value="6">6 hours</option>
              <option value="12">12 hours</option>
              <option value="24">24 hours</option>
              <option value="48">48 hours</option>
              <option value="72">72 hours</option>
              <option value="168">1 week</option>
            </select>
          </div>
        </div>

        <div style={{ padding:'16px', background:'rgba(178,75,255,0.08)', border:'1px solid rgba(178,75,255,0.2)', borderRadius:'12px' }}>
          <div style={{ fontFamily:'Orbitron', fontSize:'0.6rem', letterSpacing:'2px', color:'var(--purple)', marginBottom:'8px' }}>HONOR SYSTEM</div>
          <div style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.5)', lineHeight:1.6 }}>
            Participants confirm they've followed your account and commented before joining.
          </div>
        </div>

        {error && <div style={{ padding:'12px 16px', background:'rgba(255,45,120,0.1)', border:'1px solid rgba(255,45,120,0.3)', borderRadius:'10px', color:'var(--pink)', fontSize:'0.9rem' }}>{error}</div>}

        <button onClick={handleSubmit} disabled={loading} style={{
          padding:'16px', background:loading ? 'rgba(178,75,255,0.3)' : 'linear-gradient(135deg,var(--purple),var(--blue))',
          border:'none', borderRadius:'12px', color:'#fff', fontFamily:'Orbitron', fontSize:'0.85rem', fontWeight:700,
          letterSpacing:'3px', cursor:loading ? 'not-allowed' : 'pointer',
          boxShadow:loading ? 'none' : '0 0 30px rgba(178,75,255,0.4)'
        }}>
          {loading ? 'CREATING...' : '🚀 CREATE GIVEAWAY'}
        </button>
      </div>
    </div>
  )
}
