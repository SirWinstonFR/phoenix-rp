import { useState, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'

export default function NewPostScreen({ onBack }) {
  const { user, profile } = useAuth()
  const [caption, setCaption]     = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview]     = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const inputRef = useRef()

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handlePost() {
    // Vérifications de base
    if (!user) { setError('Tu n\'es pas connecté.'); return }
    if (!caption.trim() && !imageFile) { setError('Ajoute une photo ou une légende.'); return }

    setError('')
    setLoading(true)

    try {
      let imageUrl = null

      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(path, imageFile)

        if (uploadError) throw new Error('Erreur upload image : ' + uploadError.message)

        const { data: urlData } = supabase.storage
          .from('post-images')
          .getPublicUrl(path)

        imageUrl = urlData.publicUrl
      }

      const { error: insertError } = await supabase.from('posts').insert({
        user_id:        profile.id,
        caption:        caption.trim(),
        image_url:      imageUrl,
        likes:          0,
        comments_count: 0,
      })

      if (insertError) throw new Error('Erreur publication : ' + insertError.message)

      onBack()

    } catch (e) {
      setError(e.message)
    }

    setLoading(false)
  }

  return (
    <div className="phone">
      <StatusBar />
      <div className="screen">
        <div className="app-header">
          <button className="icon-btn" onClick={onBack}>←</button>
          <span className="app-header-title">Nouveau post</span>
          <button
            className="icon-btn"
            style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}
            onClick={handlePost}
            disabled={loading}
          >
            {loading ? '…' : 'Publier'}
          </button>
        </div>

        <div className="form-screen" style={{ gap: 14 }}>

          {/* Profil affiché */}
          {profile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: profile.avatar_color, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0
              }}>
                {profile.initials}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{profile.username}</p>
                {profile.location && <p style={{ fontSize: 11, color: 'var(--t3)' }}>📍 {profile.location}</p>}
              </div>
            </div>
          )}

          {/* Zone image */}
          <div className="img-upload-zone" onClick={() => inputRef.current.click()}>
            {preview
              ? <img src={preview} alt="aperçu" />
              : <>
                  <span style={{ fontSize: 36 }}>📸</span>
                  <span>Appuie pour ajouter une photo</span>
                  <span style={{ fontSize: 11, color: 'var(--t3)' }}>JPG, PNG, WEBP</span>
                </>
            }
            <input ref={inputRef} type="file" accept="image/*" onChange={handleImageChange} />
          </div>

          {/* Légende */}
          <div className="form-group">
            <label>Légende</label>
            <textarea
              placeholder="Écris quelque chose… #valoria"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              style={{ height: 90 }}
            />
          </div>

          {error && <p className="form-error">{error}</p>}

        </div>
      </div>
    </div>
  )
}
