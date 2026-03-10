'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function AboutPage() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const CA = '4GHUKi882wGbnyKSMugoNvfLXmb3MPDAcdWkVEqKBAGS'

  return (
    <>
      <Navbar />
      <main style={{ flex: 1, padding: isMobile ? '32px 16px' : '60px 40px', maxWidth: 860, margin: '0 auto', width: '100%' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '48px' : '72px' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: isMobile ? '0.65rem' : '0.7rem', letterSpacing: '4px', color: 'var(--neon-blue)', marginBottom: '16px' }}>
            ABOUT THE PROJECT
          </div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: isMobile ? '1.8rem' : '3rem', fontWeight: 900, letterSpacing: '2px', lineHeight: 1.2, marginBottom: '24px' }}>
            <span style={{ background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Super</span>
            <span style={{ background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Spin</span>
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: isMobile ? '1rem' : '1.2rem', lineHeight: 1.8, maxWidth: 600, margin: '0 auto' }}>
            The fairest, most transparent giveaway platform built for X. No fakes. No favorites. Just the spin.
          </p>
        </div>

        {/* What is SuperSpin */}
        <Section title="What is SuperSpin?" icon="🎰">
          <p>SuperSpin is a live giveaway platform built on top of X (Twitter). Hosts create giveaways, set entry requirements, and winners are picked in real time using a spinning wheel or slot machine — all verifiable, all live.</p>
          <p style={{ marginTop: '12px' }}>No more "DM me to claim." No more rigged picks. No more fake winners. Just spin.</p>
        </Section>

        {/* How it works */}
        <Section title="How it works" icon="⚙️">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { step: '01', text: 'Host logs in with their X account' },
              { step: '02', text: 'Creates a giveaway — sets title, reward, number of winners, duration and entry requirements (follow, like, reply)' },
              { step: '03', text: 'Shares the giveaway link on X — participants join with one click' },
              { step: '04', text: 'When time expires, the wheel or slot machine spins live and picks the winner(s)' },
              { step: '05', text: 'Results are posted instantly to X with a share button' },
            ].map(({ step, text }) => (
              <div key={step} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '16px 20px', background: 'rgba(178,75,255,0.04)', border: '1px solid var(--border)', borderRadius: '14px' }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', color: 'var(--neon-purple)', minWidth: 28, paddingTop: '2px' }}>{step}</span>
                <span style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>{text}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* $SUPERSPIN token */}
        <Section title="$SUPERSPIN Token" icon="🪙">
          <p>SuperSpin is live on <a href="https://bags.fm" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--neon-purple)', textDecoration: 'none' }}>Bags.fm</a> — a token launchpad where creators share fees with their community.</p>
          <p style={{ marginTop: '12px' }}>
            <strong style={{ color: '#fff' }}>80% of all $SUPERSPIN trading fees</strong> are distributed daily through live giveaways on superspin.online. Every day at 9:00 AM UTC, a new "Daily Fees Sharing Giveaway" goes live — anyone can enter, one lucky winner takes the pot.
          </p>
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Daily giveaway', value: 'Every day at 9:00 AM UTC' },
              { label: 'Fee share', value: '80% of all trading fees' },
              { label: 'Duration', value: '24 hours per giveaway' },
              { label: 'Platform', value: 'Bags.fm' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: '10px' }}>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>{label}</span>
                <span style={{ color: 'var(--neon-blue)', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'Orbitron, monospace', letterSpacing: '1px' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* CA Box */}
          <div style={{ marginTop: '20px', padding: '20px 24px', background: 'rgba(0,200,80,0.06)', border: '1px solid rgba(0,200,80,0.2)', borderRadius: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <img src="/bags-logo.jpg" alt="Bags.fm" style={{ width: 24, height: 24, borderRadius: '50%' }} />
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.6rem', letterSpacing: '3px', color: '#00c850' }}>CONTRACT ADDRESS</div>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: isMobile ? '0.65rem' : '0.8rem', color: '#fff', wordBreak: 'break-all', marginBottom: '12px' }}>{CA}</div>
            <a
              href={`https://bags.fm/token/${CA}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '8px 20px',
                background: 'rgba(0,200,80,0.12)',
                border: '1px solid rgba(0,200,80,0.3)',
                borderRadius: '50px',
                color: '#00c850',
                fontFamily: 'Orbitron, monospace',
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '1px',
                textDecoration: 'none',
              }}
            >
              <img src="/bags-logo.jpg" alt="Bags" style={{ width: 14, height: 14, borderRadius: '50%' }} />
              BUY ON BAGS.FM
            </a>
          </div>
        </Section>

        {/* Why SuperSpin */}
        <Section title="Why SuperSpin?" icon="🏆">
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
            {[
              { icon: '🎰', title: 'Live & transparent', desc: 'Winners picked in real time, on screen, verifiable by anyone watching.' },
              { icon: '🔒', title: 'Login with X', desc: 'No bots, no fake accounts. Every participant is a real X user.' },
              { icon: '⚡', title: 'One click to join', desc: 'Participants join via a single link. No forms, no wallets needed.' },
              { icon: '📹', title: 'Record & share', desc: 'Host can record the spin and share the video to X instantly.' },
              { icon: '🎯', title: 'Custom requirements', desc: 'Follow, like, reply — hosts set their own entry conditions.' },
              { icon: '🪙', title: 'Fee sharing', desc: '80% of $SUPERSPIN trading fees go back to the community daily.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ padding: '20px', background: 'var(--dark-card)', border: '1px solid var(--border)', borderRadius: '16px' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{icon}</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1px', color: '#fff', marginBottom: '6px' }}>{title}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: isMobile ? '48px' : '72px', marginBottom: '80px', padding: '48px 32px', background: 'linear-gradient(135deg, rgba(178,75,255,0.08), rgba(0,212,255,0.05))', border: '1px solid rgba(178,75,255,0.2)', borderRadius: '24px' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: isMobile ? '1.2rem' : '1.8rem', fontWeight: 900, marginBottom: '16px' }}>
            Ready to spin?
          </div>
          <p style={{ color: 'var(--text-dim)', marginBottom: '28px', fontSize: '1rem' }}>
            Host your first giveaway in seconds. It's free.
          </p>
          <a href="/" style={{ display: 'inline-block', padding: '14px 40px', background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))', border: 'none', borderRadius: '50px', color: '#fff', fontFamily: 'Orbitron, monospace', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px', textDecoration: 'none', boxShadow: '0 0 30px rgba(178,75,255,0.3)' }}>
            🎰 START NOW
          </a>
        </div>

      </main>
      <Footer />
    </>
  )
}

function Section({ title, icon, children }: { title: string, icon: string, children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <span style={{ fontSize: '1.4rem' }}>{icon}</span>
        <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '3px', color: 'var(--neon-blue)', textTransform: 'uppercase' as const }}>{title}</h2>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, fontSize: '0.95rem' }}>
        {children}
      </div>
    </div>
  )
}
