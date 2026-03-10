'use client'

export default function Footer() {
  return (
    <>
      {/* Bottom LEFT - Bags.fm */}
      <div style={{
        position: 'fixed',
        bottom: '16px',
        left: '20px',
        zIndex: 50,
      }}>
        <a
          href="https://bags.fm"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            textDecoration: 'none',
            opacity: 0.5,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
        >
          <img
            src="/bags-logo.jpg"
            alt="Bags.fm"
            style={{ width: 22, height: 22, borderRadius: '50%' }}
          />
          <span style={{
            fontSize: '0.65rem',
            color: 'rgba(255,255,255,0.6)',
            fontFamily: 'Rajdhani, sans-serif',
            letterSpacing: '1px',
          }}>
            Sponsored by Bags.fm
          </span>
        </a>
      </div>

      {/* Bottom RIGHT - Created by */}
      <div style={{
        position: 'fixed',
        bottom: '16px',
        right: '20px',
        zIndex: 50,
      }}>
        <a
          href="https://x.com/tuuu995"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '0.65rem',
            color: 'rgba(255,255,255,0.18)',
            fontFamily: 'Rajdhani, sans-serif',
            letterSpacing: '1px',
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--neon-blue)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.18)')}
        >
          Created by tuuu995
        </a>
      </div>
    </>
  )
}
