import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)

const ACTIVE_CHAR_KEY = 'rp_active_character'

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null)
  const [characters, setCharacters] = useState([])       // tous les persos du compte
  const [activeId, setActiveId]     = useState(null)      // id du perso actif
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchCharacters(session.user)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        await fetchCharacters(session.user)
      } else {
        setUser(null)
        setCharacters([])
        setActiveId(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchCharacters(authUser) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .order('created_at', { ascending: true })

    let list = existing ?? []

    // Aucun perso encore → on crée le premier automatiquement depuis Discord
    if (list.length === 0) {
      const created = await createFirstCharacter(authUser)
      if (created) list = [created]
    }

    setCharacters(list)

    // Restaurer le perso actif choisi précédemment (session navigateur)
    const savedId = localStorage.getItem(ACTIVE_CHAR_KEY)
    const savedStillValid = list.find(c => c.id === savedId)

    if (savedStillValid) {
      setActiveId(savedId)
    } else if (list.length === 1) {
      // Un seul perso → sélection automatique, pas besoin de choisir
      setActiveId(list[0].id)
      localStorage.setItem(ACTIVE_CHAR_KEY, list[0].id)
    } else {
      // Plusieurs persos, aucun choisi → l'écran de sélection s'affichera
      setActiveId(null)
    }

    setLoading(false)
  }

  async function createFirstCharacter(authUser) {
    const discordUsername =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.user_metadata?.global_name ||
      authUser.email?.split('@')[0] ||
      'joueur'

    const discordAvatar =
      authUser.user_metadata?.avatar_url ||
      authUser.user_metadata?.picture ||
      null

    const cleanUsername = discordUsername.replace(/[^a-zA-Z0-9_.\- ]/g, '').slice(0, 30).trim()
    const initials = cleanUsername.slice(0, 2).toUpperCase()
    const color = randomColor()

    const { data: newProfile, error } = await supabase
      .from('profiles')
      .insert({
        auth_user_id:   authUser.id,
        username:       cleanUsername,
        bio:            '',
        location:       '',
        avatar_color:   color,
        avatar_url:     discordAvatar,
        initials:       initials,
        setup_complete: false,
        unlocked_apps:  ['messages', 'phone', 'instagrim', 'map', 'crush', 'notes', 'settings'],
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur création personnage:', error)
      return null
    }
    return newProfile
  }

  function selectCharacter(id) {
    setActiveId(id)
    localStorage.setItem(ACTIVE_CHAR_KEY, id)
  }

  function switchCharacter() {
    // Revenir à l'écran de sélection sans se déconnecter de Discord
    setActiveId(null)
    localStorage.removeItem(ACTIVE_CHAR_KEY)
  }

  async function signOut() {
    localStorage.removeItem(ACTIVE_CHAR_KEY)
    await supabase.auth.signOut()
  }

  async function updateProfile(updates) {
    if (!activeId) throw new Error('Aucun personnage actif')
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', activeId)
    if (error) throw error
    setCharacters(prev => prev.map(c => c.id === activeId ? { ...c, ...updates } : c))
  }

  async function refreshCharacters() {
    if (user) await fetchCharacters(user)
  }

  const profile = characters.find(c => c.id === activeId) ?? null

  return (
    <AuthContext.Provider value={{
      user,
      profile,          // le personnage ACTUELLEMENT utilisé (compatible avec tout le code existant)
      characters,        // tous les personnages du compte
      activeId,
      loading,
      signOut,
      updateProfile,
      selectCharacter,
      switchCharacter,
      refreshCharacters,
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
