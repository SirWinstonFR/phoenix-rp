import { useState, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'

export default function NewStoryScreen({ onBack }) {
  const { user, profile } = useAuth()
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

  async function handlePublish() {
    if (!imageFile || !user) return
    setLoading(true)
    setError('')
    try {
      const ext = imageFile.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(path, imageFile)
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path)
      const { error: insertError } = await supabase.from('stories').insert({
        user_id:   profile.id,
        image_url: urlData.publicUrl,
      })
      if (insertError) throw insertError
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
          <span className="app-header-title">Nouvelle story</span>
          <button
            className="icon-btn"
            style={{ fontWeight: 700, color: preview ? 'var(--accent)' : 'var(--t3)', fontSize: 14 }}
            onClick={handlePublish}
            disabled={loading || !preview}
          >
            {loading ? '…' : 'Partager'}
          </button>
        </div>

        <div className="form-screen" style={{ gap: 14 }}>
          <div className="img-upload-zone" style={{ aspectRatio: '9/16', borderRadius: 20 }} onClick={() => inputRef.current.click()}>
            {preview
              ? <img src={preview} alt="aperçu" style={{ borderRadius: 18 }} />
              : <>
                  <span style={{ fontSize: 40 }}>✨</span>
                  <span>Ajoute une photo pour ta story</span>
                  <span style={{ fontSize: 11, color: 'var(--t3)' }}>Visible 24h</span>
                </>
            }
            <input ref={inputRef} type="file" accept="image/*" onChange={handleImageChange} />
          </div>
          {error && <p className="form-error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
