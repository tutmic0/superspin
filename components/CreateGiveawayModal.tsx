'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createGiveaway } from '@/lib/db'
import type { GiveawayRequirement } from '@/types'

interface Props {
  user: User
  onClose: () => void
  onCreated: (id: string) => void
}

export default function CreateGiveawayModal({ user, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [winnerCount, setWinnerCount] = useState(1)
  const [hours, setHours] = useState(24)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Requirements
  const [reqFollow, setReqFollow] = useState(true)
  const [followUsername, setFollowUsername] = useState(user.user_metadata?.user_name || '')
  const [reqLike, setReqLike] = useState(false)
  const [reqRetweet, setReqRetweet] = useState(false)
  const [tweetUrl, setTweetUrl] = useState('')

  const handleLaunch = async () => {
    if (!title.trim()) { setError('Title is required'); return }
    if (reqFollow && !followUsername.trim()) { setError('Enter username for Follow requirement'); return }
    if ((reqLike || reqRetweet) && !tweetUrl.trim()) { setError('Enter tweet URL for Like/Retweet requirement'); return }

    setLoading(true)
    setError('')

    const requirements: GiveawayRequirement[] = []
    if (reqFollow) requirements.push({ type: 'follow', username: followUsername.replace('@', '').trim() })
    if (reqLike) requirements.push({ type: 'like', tweet_url: tweetUrl.trim() })
    if (reqRetweet) requirements.push({ type: 'retweet', tweet_url: tweetUrl.trim() })

    try {
      const ends_at = new Date(Date.now() + hours * 3600000).toISOString()
      const giveaway = await createGiveaway({
        title: title.trim(),
        description: description.trim(),
        winner_count: winnerCount,
        ends_at,
        organizer_id: user.id,
        organizer_username: user.user_metadata?.user_name || user.user_metadata?.name || 'unknown',
        organizer_avatar: user.user_metadata?.avatar_url || '',
        requirements,
      })

      const reqText = requirements.map(r => {
        if (r.type === 'follow') return `• Follow @${r.username}`
        if (r.type === 'like') return `• Like this tweet`
        if (r.type === 'retweet') return `• Retweet this tweet`
        return ''
      }).join('\n')

      const tweetText = `🎰 I'm hosting a giveaway on @superspinonline!\n\n${title}${description ? `\n${description}` : ''}\n\n🏆 ${winnerCount} winner${winnerCount > 1 ? 's' : ''}\n\nTo enter:\n${reqText}\n\nJoin 👉 ${window.location.origin}/giveaway/${giveaway.id}`
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank')

      onCreated(giveaway.id)
    } catch (e) {
      setError('Failed to create giveaway. Please try again.')
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '13px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.3s',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: 'Orbitron, monospace',
    fontSize: '0.62rem',
    letterSpacing: '2px',
    color: 'var(--neon-blue)',
    marginBottom: '8px',
    textTransform: 'uppercase',
  }

  const CheckRow = ({ checked, onChange, label }: { checked: boolean, onChange: () => void, label: string }) => (
    <div
      onClick={onChange}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px',
        background: checked ? 'rgba(178,75,255,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${checked ? 'rgba(178,75,255,0.35)' : 'var(--border)'}`,
        borderRadius: '10px', cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '5px', flexShrink: 0,
        background: checked ? '#b24bff' : 'transparent',
        border: `2px solid ${checked ? '#b24bff' : 'rgba(255,255,255,0.2)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
      }}>
        {checked && <span style={{ color: '#fff', fontSize: '11px', lineHeight: 1 }}>✓</span>}
      </div>
      <span style={{ fontSize: '0.9rem', color: checked ? '#fff' : 'rgba(255,255,255,0.6)' }}>{label}</span>
    </div>
  )

  const needsTweetUrl = reqLike || reqRetweet

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,16,0.92)', backdropFilter: 'blur(20px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'linear-gradient(135deg, rgba(178,75,255,0.1), rgba(0,212,255,0.06))',
        border: '1px solid rgba(178,75,255,0.25)',
        borderRadius: '24px', padding: '44px',
        width: '100%', maxWidth: '520px',
        boxShadow: '0 0 80px rgba(178,75,255,0.2)',
      }}>
        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '2px', background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: '32px' }}>
          HOST A GIVEAWAY
        </div>

        {/* Title */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Title *</label>
          <input style={inputStyle} placeholder="e.g. PS5 Giveaway 🎮" maxLength={80} value={title} onChange={e => setTitle(e.target.value)}
            onFocus={e => e.target.style.borderColor = 'var(--neon-purple)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Description</label>
          <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="Describe the prize..." value={description} onChange={e => setDescription(e.target.value)}
            onFocus={e => e.target.style.borderColor = 'var(--neon-purple)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>

        {/* Winners + Duration */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={labelStyle}>Winners</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={winnerCount} onChange={e => setWinnerCount(Number(e.target.value))}>
              {[1,2,3,5,10].map(n => <option key={n} value={n} style={{ background: '#0d0d20' }}>{n} winner{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Duration</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={hours} onChange={e => setHours(Number(e.target.value))}>
              {[[1,'1 hour'],[6,'6 hours'],[12,'12 hours'],[24,'24 hours'],[48,'48 hours'],[72,'72 hours']].map(([val, label]) => (
                <option key={val} value={val} style={{ background: '#0d0d20' }}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Requirements */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Entry Requirements</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <CheckRow checked={reqFollow} onChange={() => setReqFollow(!reqFollow)} label="Follow on X" />
            {reqFollow && (
              <div style={{ paddingLeft: '12px' }}>
                <input
                  style={{ ...inputStyle, fontSize: '0.9rem', padding: '10px 14px' }}
                  placeholder="@username"
                  value={followUsername}
                  onChange={e => setFollowUsername(e.target.value)}
                  onFocus={e => e.target.style.borderColor = 'var(--neon-purple)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            )}
            <CheckRow checked={reqLike} onChange={() => setReqLike(!reqLike)} label="Like the tweet" />
            <CheckRow checked={reqRetweet} onChange={() => setReqRetweet(!reqRetweet)} label="Retweet the tweet" />
            {needsTweetUrl && (
              <div style={{ paddingLeft: '12px' }}>
                <input
                  style={{ ...inputStyle, fontSize: '0.9rem', padding: '10px 14px' }}
                  placeholder="https://x.com/username/status/..."
                  value={tweetUrl}
                  onChange={e => setTweetUrl(e.target.value)}
                  onFocus={e => e.target.style.borderColor = 'var(--neon-purple)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            )}
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', marginBottom: '20px', background: 'rgba(255,45,120,0.1)', border: '1px solid rgba(255,45,120,0.3)', borderRadius: '10px', color: 'var(--neon-pink)', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleLaunch} disabled={loading}
            style={{ flex: 1, padding: '14px', background: loading ? 'rgba(178,75,255,0.3)' : 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))', border: 'none', borderRadius: '12px', color: '#fff', fontFamily: 'Orbitron, monospace', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 0 25px rgba(178,75,255,0.3)', transition: 'all 0.3s' }}>
            {loading ? 'LAUNCHING...' : '🚀 LAUNCH GIVEAWAY'}
          </button>
          <button onClick={onClose}
            style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-dim)', fontSize: '0.9rem', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
