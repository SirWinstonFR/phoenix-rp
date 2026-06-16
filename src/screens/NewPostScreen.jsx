import { useState, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'

export default function NewPostScreen({ onBack }) {
  const { user } = useAuth()
  const [caption, setCaption] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef()

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handlePost() {
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
        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('post-images')
          .getPublicUrl(path)
        imageUrl = urlData.publicUrl
      }

      const { error: insertError } = await supabase.from('posts').insert({
        user_id: user.id,
        caption,
        image_url: imageUrl,
        likes: 0,
        comments_count: 0
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
          <span className="app-header-title">Nouveau post</span>
          <button
            className="icon-btn"
            style={{ fontWeight: 700, color: '#185fa5' }}
            onClick={handlePost}
            disabled={loading || (!caption && !imageFile)}
          >
            {loading ? '…' : 'Publier'}
          </button>
        </div>

        <div className="form-screen" style={{ gap: 12 }}>
          <div className="img-upload-zone" onClick={() => inputRef.current.click()}>
            {preview
              ? <img src={preview} alt="aperçu" />
              : <><span style={{ fontSize: 32 }}>🖼️</span><span>Appuie pour ajouter une photo</span></>
            }
            <input ref={inputRef} type="file" accept="image/*" onChange={handleImageChange} />
          </div>

          <div className="form-group">
            <label>Légende</label>
            <textarea
              placeholder="Écris quelque chose… #valoria"
              value={caption}
              onChange={e => setCaption(e.target.value)}
            />
          </div>

          {error && <p className="form-error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
