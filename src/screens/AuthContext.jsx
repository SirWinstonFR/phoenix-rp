import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchOrCreateProfile(session.user)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        await fetchOrCreateProfile(session.user)
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchOrCreateProfile(user) {
    // Cherche le profil existant
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (existing) {
      setProfile(existing)
      setLoading(false)
      return
    }

    // Pas de profil → on le crée
    // Discord met le vrai nom dans full_name ou name (pas dans custom_claims)
    const discordUsername =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.user_metadata?.global_name ||
      user.email?.split('@')[0] ||
      'joueur'

    const discordAvatar =
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      null

    const cleanUsername = discordUsername.replace(/[^a-zA-Z0-9_.\- ]/g, '').slice(0, 30).trim()
    const initials = cleanUsername.slice(0, 2).toUpperCase()
    const color = randomColor()

    const { data: newProfile, error } = await supabase
      .from('profiles')
      .insert({
        id:            user.id,
        username:      cleanUsername,
        bio:           '',
        location:      '',
        avatar_color:  color,
        avatar_url:    discordAvatar,
        initials:      initials,
        unlocked_apps: ['messages', 'phone', 'instagrim', 'notes', 'camera', 'settings'],
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur création profil:', error)
      // Retente un fetch au cas où il aurait été créé entre temps
      const { data: retry } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      if (retry) setProfile(retry)
    } else {
      setProfile(newProfile)
    }

    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function updateProfile(updates) {
    if (!user) throw new Error('Non connecté')
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
    if (error) throw error
    setProfile(prev => ({ ...prev, ...updates }))
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

function randomColor() {
  const colors = ['#7c3aed', '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#c026d3']
  return colors[Math.floor(Math.random() * colors.length)]
}
