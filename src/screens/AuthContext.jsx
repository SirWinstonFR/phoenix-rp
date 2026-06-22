import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Récupère la session existante au démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Écoute tous les changements de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()   // ne plante pas si absent

    setProfile(data ?? null)
    setLoading(false)
    return data
  }

  // Inscription : crée le compte + le profil en une fois
  async function signUp(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Pas de confirmation email requise (désactive dans Supabase Auth settings)
        emailRedirectTo: undefined,
      }
    })
    if (error) throw error
    if (!data.user) throw new Error('Compte créé, vérifie ta boite mail pour confirmer.')

    const color = randomColor()
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      username: username.trim(),
      bio: '',
      location: '',
      avatar_color: color,
      initials: username.trim().slice(0, 2).toUpperCase(),
      unlocked_apps: ['messages', 'phone', 'instagrim', 'notes', 'camera', 'settings'],
    })

    if (profileError) throw profileError

    // Force le chargement du profil tout de suite
    await fetchProfile(data.user.id)
    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // fetchProfile est appelé automatiquement par onAuthStateChange
    return data
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
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

function randomColor() {
  const colors = ['#7c3aed', '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#c026d3']
  return colors[Math.floor(Math.random() * colors.length)]
}
