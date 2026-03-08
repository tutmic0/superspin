export default function Footer() {
  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      right: '20px',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '4px',
    }}>
      <a
        href="https://x.com/superspinonline"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.25)',
          fontFamily: 'Orbitron, monospace',
          letterSpacing: '1px',
          textDecoration: 'none',
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--neon-purple)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
      >
        Powered by SuperSpin.online
      </a>
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
  )
}
