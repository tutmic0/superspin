import { Link, useNavigate } from 'react-router-dom'
import { loginWithX, logout } from '../lib/auth'

export default function Navbar({ user }) {
  const navigate = useNavigate()
  const avatar = user?.user_metadata?.avatar_url
  const username = user?.user_metadata?.user_name || user?.user_metadata?.name

  return (
    <nav style={{
      position:'relative', zIndex:10, padding:'16px 40px',
      display:'flex', alignItems:'center', justifyContent:'space-between',
      borderBottom:'1px solid var(--border)', backdropFilter:'blur(10px)',
      background:'rgba(5,5,16,0.6)'
    }}>
      <Link to="/" style={{
        fontFamily:'Orbitron', fontSize:'1.5rem', fontWeight:900,
        background:'linear-gradient(135deg, var(--blue), var(--purple))',
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'
      }}>
        Super<span style={{
          background:'linear-gradient(135deg, var(--purple), var(--pink))',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'
        }}>Spin</span>
      </Link>

      <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
        {user ? (
          <>
            <button onClick={() => navigate('/create')} style={{
              padding:'10px 24px',
              background:'linear-gradient(135deg, var(--purple), var(--blue))',
              border:'none', borderRadius:'50px', color:'#fff',
              fontFamily:'Orbitron', fontSize:'0.7rem', fontWeight:700, letterSpacing:'2px',
              boxShadow:'0 0 20px rgba(178,75,255,0.4)'
            }}>+ CREATE</button>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              {avatar && <img src={avatar} style={{ width:36, height:36, borderRadius:'50%', border:'2px solid var(--purple)' }} />}
              <span style={{ fontSize:'0.9rem', color:'rgba(255,255,255,0.6)', fontWeight:600 }}>@{username}</span>
            </div>
            <button onClick={logout} style={{
              padding:'8px 16px', background:'rgba(255,255,255,0.05)',
              border:'1px solid var(--border)', borderRadius:'8px',
              color:'rgba(255,255,255,0.4)', fontSize:'0.85rem'
            }}>Logout</button>
          </>
        ) : (
          <button onClick={loginWithX} style={{
            display:'flex', alignItems:'center', gap:'8px', padding:'10px 24px',
            background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.15)',
            borderRadius:'50px', color:'#fff', fontFamily:'Rajdhani', fontSize:'1rem', fontWeight:600
          }}>
            <span style={{ fontSize:'1.1rem' }}>𝕏</span> Login with X
          </button>
        )}
      </div>
    </nav>
  )
}
