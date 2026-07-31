import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)

const ACTIVE_CHAR_KEY = 'rp_active_character'

// Mêmes paliers que côté bot — à garder synchronisés
const LEVEL_XP_STEP = 50
const CHARACTER_SLOT_UNLOCKS = [
  { level: 1,  slots: 1 },
  { level: 5,  slots: 2 },
  { level: 10, slots: 3 },
  { level: 15, slots: 4 },
  { level: 20, slots: 5 },
]

function slotsForLevel(level) {
  let slots = 1
  for (const tier of CHARACTER_SLOT_UNLOCKS) {
    if (level >= tier.level) slots = tier.slots
  }
  return slots
}

export function AuthProvider({ children }) {
  const [user, setUser]             = useState(null)
  const [characters, setCharacters] = useState([])   // tous les persos du compte (actifs + en attente)
  const [activeId, setActiveId]     = useState(null)
  const [xp, setXp]                 = useState(0)
  const [level, setLevel]           = useState(1)
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

  function getSnowflake(authUser) {
    return (
      authUser.user_metadata?.provider_id ||
      authUser.identities?.[0]?.id ||
      authUser.user_metadata?.sub ||
      null
    )
  }

  // Le vrai ID Discord est posé sur TOUS les persos du compte
  async function ensureDiscordIdSynced(authUser, charList) {
    const snowflake = getSnowflake(authUser)
    if (!snowflake) return charList

    const missing = charList.filter(c => c.discord_id !== snowflake)
    if (missing.length > 0) {
      await supabase.from('profiles').update({ discord_id: snowflake }).eq('auth_user_id', authUser.id)
    }
    return charList.map(c => ({ ...c, discord_id: snowflake }))
  }

  async function fetchXP(authUser) {
    const snowflake = getSnowflake(authUser)
    if (!snowflake) return
    const { data } = await supabase
      .from('discord_xp')
      .select('xp, level')
      .eq('discord_id', snowflake)
      .maybeSingle()
    setXp(data?.xp ?? 0)
    setLevel(data?.level ?? 1)
  }

  async function fetchCharacters(authUser) {
    console.log('🔍 fetchCharacters — auth_user_id recherché :', authUser.id)

    const { data: existing, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ Erreur fetchCharacters:', error.message, error.details, error.hint)
    }

    let list = existing ?? []
    list = await ensureDiscordIdSynced(authUser, list)
    setCharacters(list)
    await fetchXP(authUser)

    // Seuls les persos ACTIFS (validés par le MJ) peuvent être sélectionnés/joués
    const playable = list.filter(c => (c.character_status ?? 'active') === 'active')

    const savedId = localStorage.getItem(ACTIVE_CHAR_KEY)
    const savedStillValid = playable.find(c => c.id === savedId)

    if (savedStillValid) {
      setActiveId(savedId)
    } else if (playable.length === 1) {
      setActiveId(playable[0].id)
      localStorage.setItem(ACTIVE_CHAR_KEY, playable[0].id)
    } else {
      setActiveId(null)
    }

    setLoading(false)
  }

  function selectCharacter(id) {
    setActiveId(id)
    localStorage.setItem(ACTIVE_CHAR_KEY, id)
  }

  function switchCharacter() {
    setActiveId(null)
    localStorage.removeItem(ACTIVE_CHAR_KEY)
  }

  async function signOut() {
    localStorage.removeItem(ACTIVE_CHAR_KEY)
    await supabase.auth.signOut()
  }

  async function updateProfile(updates) {
    if (!activeId) throw new Error('Aucun personnage actif')
    const { error } = await supabase.from('profiles').update(updates).eq('id', activeId)
    if (error) throw error
    setCharacters(prev => prev.map(c => c.id === activeId ? { ...c, ...updates } : c))
  }

  // Crée une nouvelle réservation de personnage (en attente de validation MJ)
  async function reserveCharacter({ firstName, lastName, jobWish, avatarFile }) {
    if (!user) throw new Error('Non connecté')
    const snowflake = getSnowflake(user)

    let avatarUrl = null
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${user.id}/reservation-${Date.now()}.${ext}`
      await supabase.storage.from('avatars').upload(path, avatarFile)
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      avatarUrl = urlData.publicUrl
    }

    const fullName = `${firstName} ${lastName}`.trim()
    const color = randomColor()

    const { data: newProfile, error } = await supabase
      .from('profiles')
      .insert({
        auth_user_id:      user.id,
        discord_id:         snowflake,
        username:           fullName,
        first_name:         firstName.trim(),
        last_name:          lastName.trim(),
        job_wish:           jobWish.trim(),
        avatar_url:         avatarUrl,
        avatar_color:       color,
        initials:           fullName.slice(0, 2).toUpperCase(),
        bio: '', location: '',
        character_status:   'pending',
        setup_complete:     false,
        unlocked_apps:      ['messages', 'phone', 'instagrim', 'map', 'crush', 'notes', 'settings'],
      })
      .select()
      .single()

    if (error) throw error
    setCharacters(prev => [...prev, newProfile])
    return newProfile
  }

  async function refreshCharacters() {
    if (user) await fetchCharacters(user)
  }

  const profile = characters.find(c => c.id === activeId) ?? null
  const activeCharacters  = characters.filter(c => (c.character_status ?? 'active') === 'active')
  const pendingCharacters = characters.filter(c => c.character_status === 'pending')
  const maxSlots = slotsForLevel(level)
  const canReserveNew = activeCharacters.length + pendingCharacters.length < maxSlots

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      characters,
      activeCharacters,
      pendingCharacters,
      activeId,
      loading,
      xp,
      level,
      maxSlots,
      canReserveNew,
      signOut,
      updateProfile,
      selectCharacter,
      switchCharacter,
      reserveCharacter,
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
