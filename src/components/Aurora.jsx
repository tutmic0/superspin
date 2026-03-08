export default function Aurora() {
  return (
    <>
      <div style={{ position:'fixed', inset:0, zIndex:0, overflow:'hidden', pointerEvents:'none' }}>
        {[
          { color:'#b24bff', top:'-100px', left:'-100px', dur:'14s' },
          { color:'#00d4ff', top:'20%', right:'-80px', dur:'10s', delay:'-3s' },
          { color:'#ff2d78', bottom:'-50px', left:'30%', dur:'16s', delay:'-6s' },
          { color:'#00ff88', bottom:'20%', right:'20%', dur:'11s', delay:'-2s' },
        ].map((b, i) => (
          <div key={i} style={{
            position:'absolute', width:500, height:500, borderRadius:'50%',
            background:`radial-gradient(circle, ${b.color}, transparent)`,
            filter:'blur(80px)', opacity:0.12,
            top:b.top, left:b.left, right:b.right, bottom:b.bottom,
            animation:`drift ${b.dur} ease-in-out infinite alternate`,
            animationDelay: b.delay || '0s'
          }} />
        ))}
      </div>
      <div style={{
        position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
        backgroundImage:'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
        backgroundSize:'60px 60px'
      }} />
      <style>{`@keyframes drift { 0%{transform:translate(0,0) scale(1)} 100%{transform:translate(30px,40px) scale(1.1)} }`}</style>
    </>
  )
}
