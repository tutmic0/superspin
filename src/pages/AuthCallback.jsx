import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const returnTo = localStorage.getItem('returnTo') || '/'
      localStorage.removeItem('returnTo')
      navigate(returnTo, { replace: true })
    })
  }, [navigate])

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh', flexDirection:'column', gap:'16px' }}>
      <div style={{ fontFamily:'Orbitron', color:'var(--purple)', fontSize:'1rem', letterSpacing:'4px' }}>
        LOGGING IN...
      </div>
    </div>
  )
}
