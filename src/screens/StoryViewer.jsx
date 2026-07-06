import { useState, useEffect } from 'react'
import Avatar from '../components/Avatar'

export default function StoryViewer({ stories, startIndex = 0, onClose }) {
  const [current, setCurrent] = useState(startIndex)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          if (current < stories.length - 1) {
            setCurrent(c => c + 1)
          } else {
            onClose()
          }
          return 0
        }
        return prev + 2
      })
    }, 100)
    return () => clearInterval(interval)
  }, [current])

  const story = stories[current]
  if (!story) return null

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: '#000',
      display: 'flex', flexDirection: 'column',
      animation: 'screenIn 0.25s ease',
    }}>

      {/* Barres de progression */}
      <div style={{
        display: 'flex', gap: 3,
        padding: '12px 10px 8px',
        position: 'absolute', top: 0, left: 0, right: 0,
        zIndex: 10,
      }}>
        {stories.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 2.5, borderRadius: 2,
            background: 'rgba(255,255,255,0.3)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              background: '#fff',
              width: i < current ? '100%' : i === current ? `${progress}%` : '0%',
              transition: i === current ? 'none' : 'none',
            }} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '36px 14px 10px',
        position: 'absolute', top: 0, left: 0, right: 0,
        zIndex: 10,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
      }}>
        <Avatar profile={story.profiles} size={36} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
            {story.profiles?.username ?? 'Joueur'}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
            {timeAgo(story.created_at)}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none',
            color: '#fff', fontSize: 22, cursor: 'pointer', padding: 4,
          }}
        >
          ✕
        </button>
      </div>

      {/* Image */}
      <div
        style={{ flex: 1, display: 'flex', position: 'relative' }}
        onClick={e => {
          const x = e.clientX
          const w = e.currentTarget.offsetWidth
          if (x < w / 2) {
            // Tap gauche → précédent
            if (current > 0) setCurrent(c => c - 1)
            else onClose()
          } else {
            // Tap droit → suivant
            if (current < stories.length - 1) setCurrent(c => c + 1)
            else onClose()
          }
        }}
      >
        <img
          src={story.image_url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

    </div>
  )
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60)    return "à l'instant"
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  return `il y a ${Math.floor(diff / 86400)}j`
}
