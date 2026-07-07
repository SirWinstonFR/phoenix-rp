import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'

// Style unique : Relief
const MAP_STYLE = 'mapbox://styles/mapbox/outdoors-v12'

// Centre : Phoenix, Arizona
const PHOENIX = { lat: 33.4484, lng: -112.0740 }

export default function MapScreen({ onBack }) {
  const { profile, user, updateProfile } = useAuth()
  const mapContainer = useRef(null)
  const mapRef       = useRef(null)
  const markersRef   = useRef({})

  const [players, setPlayers]         = useState([])
  const [locations, setLocations]     = useState([])
  const [showStylePicker, setShowStylePicker] = useState(false)
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [newLocation, setNewLocation] = useState({ name: '', description: '', icon: '📍', color: '#b96eff' })
  const [pendingCoords, setPendingCoords] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [infoPopup, setInfoPopup]               = useState(null)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [locationPlayers, setLocationPlayers]   = useState([])
  const [reviews, setReviews]                   = useState([])
  const [showAdmin, setShowAdmin]               = useState(false)
  const [unplacedLocs, setUnplacedLocs]         = useState([])
  const [editingDesc, setEditingDesc]           = useState(false)
  const [editDesc, setEditDesc]                 = useState('')
  const [showAddReview, setShowAddReview]       = useState(false)
  const [newReview, setNewReview]               = useState({ content: '', type: 'joueur', author_name: '', rating: 5 })
  const [hoveredPlayer, setHoveredPlayer]       = useState(null)
  const [shareToast, setShareToast]             = useState(false)

  // Seul le MJ peut voir la vue admin
  const MJ_DISCORD_ID = '804959890291294209'
  const isMJ = profile?.discord_id === MJ_DISCORD_ID

  useEffect(() => {
    initMap()
    fetchPlayers()
    fetchLocations()

    // Polling toutes les 10 secondes pour les positions joueurs
    const interval = setInterval(() => fetchPlayers(), 10000)

    const channel = supabase
      .channel('map-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchPlayers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'map_locations' }, () => fetchLocations())
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
      mapRef.current?.remove()
    }
  }, [])

  async function initMap() {
    // Charger Mapbox GL JS dynamiquement
    if (!window.mapboxgl) {
      await loadScript('https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js')
      await loadCSS('https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css')
    }

    const mapboxgl = window.mapboxgl
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [PHOENIX.lng, PHOENIX.lat],
      zoom: 11,
      attributionControl: false,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')

    // Clic sur la carte → déplacer son personnage ou ajouter un lieu
    map.on('click', e => {
      const coords = { lat: e.lngLat.lat, lng: e.lngLat.lng }
      setPendingCoords(coords)
    })

    map.on('load', () => {
      setLoading(false)
      // Réappliquer les marqueurs une fois la carte prête
      fetchPlayers()
      fetchLocations()
    })

    mapRef.current = map
  }

  function loadScript(src) {
    return new Promise(resolve => {
      const s = document.createElement('script')
      s.src = src
      s.onload = resolve
      document.head.appendChild(s)
    })
  }

  function loadCSS(href) {
    return new Promise(resolve => {
      const l = document.createElement('link')
      l.rel = 'stylesheet'
      l.href = href
      l.onload = resolve
      document.head.appendChild(l)
    })
  }

  async function fetchPlayers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, initials, avatar_color, avatar_url, map_lat, map_lng, map_visible')
      .eq('map_visible', true)
      .not('map_lat', 'is', null)
    setPlayers(data ?? [])
    updatePlayerMarkers(data ?? [])
  }

  async function fetchLocations() {
    const { data } = await supabase
      .from('map_locations')
      .select('*')
      .order('created_at', { ascending: true })

    const placed   = (data ?? []).filter(l => l.lat !== null && l.lng !== null)
    const unplaced = (data ?? []).filter(l => l.lat === null || l.lng === null)

    setLocations(placed)
    setUnplacedLocs(unplaced)
    updateLocationMarkers(placed)
  }

  function updatePlayerMarkers(players) {
    if (!mapRef.current || !window.mapboxgl) return
    const map = mapRef.current

    // Nettoyer les anciens marqueurs joueurs
    Object.entries(markersRef.current).forEach(([key, marker]) => {
      if (key.startsWith('player-')) marker.remove()
    })

    players.forEach(p => {
      const el = document.createElement('div')
      el.style.cssText = `
        width: 36px; height: 36px; border-radius: 50%;
        background: ${p.avatar_color ?? '#555'};
        border: 3px solid ${p.id === user?.id ? '#b96eff' : '#fff'};
        display: flex; align-items: center; justify-content: center;
        font-size: 13px; font-weight: 700; color: white;
        cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        overflow: hidden;
        ${p.id === user?.id ? 'box-shadow: 0 0 0 2px #b96eff, 0 2px 12px rgba(185,110,255,0.5);' : ''}
      `

      if (p.avatar_url) {
        el.innerHTML = `<img src="${p.avatar_url}" style="width:100%;height:100%;object-fit:cover;" />`
      } else {
        el.textContent = p.initials ?? '?'
      }

      // Label sous le marqueur
      const label = document.createElement('div')
      label.style.cssText = `
        position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.75); color: white; font-size: 10px; font-weight: 600;
        padding: 2px 6px; border-radius: 6px; white-space: nowrap;
        font-family: Inter, sans-serif;
      `
      label.textContent = p.id === user?.id ? 'Toi' : p.username

      const wrapper = document.createElement('div')
      wrapper.style.cssText = 'position: relative; display: flex; flex-direction: column; align-items: center;'
      wrapper.appendChild(el)
      wrapper.appendChild(label)

      wrapper.addEventListener('click', e => {
        e.stopPropagation()
        setInfoPopup({ type: 'player', data: p })
      })

      const marker = new window.mapboxgl.Marker({ element: wrapper, anchor: 'bottom' })
        .setLngLat([p.map_lng, p.map_lat])
        .addTo(map)

      markersRef.current[`player-${p.id}`] = marker
    })
  }

  function updateLocationMarkers(locations) {
    if (!mapRef.current || !window.mapboxgl) return
    const map = mapRef.current

    Object.entries(markersRef.current).forEach(([key, marker]) => {
      if (key.startsWith('loc-')) marker.remove()
    })

    locations.forEach(loc => {
      const el = document.createElement('div')
      el.style.cssText = `
        width: 34px; height: 34px; border-radius: 50%;
        background: ${loc.color ?? '#b96eff'};
        display: flex; align-items: center; justify-content: center;
        font-size: 16px; cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        border: 2px solid rgba(255,255,255,0.3);
      `
      el.textContent = loc.icon ?? '📍'

      const label = document.createElement('div')
      label.style.cssText = `
        position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%);
        background: ${loc.color ?? '#b96eff'}cc; color: white; font-size: 10px; font-weight: 600;
        padding: 2px 6px; border-radius: 6px; white-space: nowrap;
        font-family: Inter, sans-serif;
      `
      label.textContent = loc.name

      const wrapper = document.createElement('div')
      wrapper.style.cssText = 'position: relative; display: flex; flex-direction: column; align-items: center;'
      wrapper.appendChild(el)
      wrapper.appendChild(label)

      wrapper.addEventListener('click', e => {
        e.stopPropagation()
        openLocationSheet(loc)
      })

      const marker = new window.mapboxgl.Marker({ element: wrapper, anchor: 'bottom' })
        .setLngLat([loc.lng, loc.lat])
        .addTo(map)

      markersRef.current[`loc-${loc.id}`] = marker
    })
  }

  async function moveMyCharacter() {
    if (!pendingCoords || !user) return
    await updateProfile({ map_lat: pendingCoords.lat, map_lng: pendingCoords.lng })
    setPendingCoords(null)
    fetchPlayers()
  }

  async function addLocation() {
    if (!pendingCoords || !newLocation.name.trim()) return
    await supabase.from('map_locations').insert({
      name:        newLocation.name.trim(),
      description: newLocation.description.trim(),
      icon:        newLocation.icon,
      color:       newLocation.color,
      lat:         pendingCoords.lat,
      lng:         pendingCoords.lng,
      created_by:  user.id,
    })
    setShowAddLocation(false)
    setNewLocation({ name: '', description: '', icon: '📍', color: '#b96eff' })
    setPendingCoords(null)
    fetchLocations()
  }

  async function openLocationSheet(loc) {
    setSelectedLocation(loc)
    setEditingDesc(false)
    setShowAddReview(false)
    setNewReview({ content: '', type: 'joueur', author_name: profile?.username ?? '', rating: 5 })

    // Joueurs proches
    if (loc.lat && loc.lng) {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, initials, avatar_color, avatar_url, map_lat, map_lng')
        .eq('map_visible', true)
        .not('map_lat', 'is', null)
      const nearby = (data ?? []).filter(p => {
        const dist = Math.sqrt(
          Math.pow((p.map_lat - loc.lat) * 111000, 2) +
          Math.pow((p.map_lng - loc.lng) * 111000 * Math.cos(loc.lat * Math.PI / 180), 2)
        )
        return dist < 500
      })
      setLocationPlayers(nearby)
    }

    // Générer un téléphone fixe si pas encore fait
    if (!loc.phone) {
      const phone = generatePhone()
      await supabase.from('map_locations').update({ phone }).eq('id', loc.id)
      setSelectedLocation(prev => ({ ...prev, phone }))
    }

    // Charger les avis
    const { data: reviewsData } = await supabase
      .from('location_reviews')
      .select('*')
      .eq('location_id', loc.id)
      .order('created_at', { ascending: false })
    setReviews(reviewsData ?? [])
  }

  function generatePhone() {
    const area = Math.floor(Math.random() * 900) + 100
    const mid  = Math.floor(Math.random() * 900) + 100
    const end  = Math.floor(Math.random() * 9000) + 1000
    return `(${area}) ${mid}-${end}`
  }

  async function saveDescription() {
    await supabase.from('map_locations').update({ description: editDesc }).eq('id', selectedLocation.id)
    setSelectedLocation(prev => ({ ...prev, description: editDesc }))
    setEditingDesc(false)
    fetchLocations()
  }

  async function addReview() {
    if (!newReview.content.trim()) return
    const authorName = newReview.type === 'pnj' ? newReview.author_name : (profile?.username ?? 'Joueur')
    await supabase.from('location_reviews').insert({
      location_id:  selectedLocation.id,
      user_id:      user.id,
      author_name:  authorName,
      content:      newReview.content.trim(),
      type:         newReview.type,
      rating:       newReview.rating,
    })
    setShowAddReview(false)
    setNewReview({ content: '', type: 'joueur', author_name: '', rating: 5 })
    const { data } = await supabase.from('location_reviews').select('*').eq('location_id', selectedLocation.id).order('created_at', { ascending: false })
    setReviews(data ?? [])
  }

  async function deleteReview(id) {
    await supabase.from('location_reviews').delete().eq('id', id)
    setReviews(prev => prev.filter(r => r.id !== id))
  }

  function shareLocation() {
    const text = `📍 ${selectedLocation.name} — Phoenix RP`
    navigator.clipboard?.writeText(text)
    setShareToast(true)
    setTimeout(() => setShareToast(false), 2000)
  }

  async function placeUnplacedLocation(loc) {
    if (!pendingCoords) return
    await supabase
      .from('map_locations')
      .update({ lat: pendingCoords.lat, lng: pendingCoords.lng })
      .eq('id', loc.id)
    setPendingCoords(null)
    setShowAdmin(false)
    fetchLocations()
  }

  async function deleteLocation(id) {
    await supabase.from('map_locations').delete().eq('id', id)
    setInfoPopup(null)
    fetchLocations()
  }

  function centerOnMe() {
    if (!profile?.map_lat || !mapRef.current) return
    mapRef.current.flyTo({
      center: [profile.map_lng, profile.map_lat],
      zoom: 14, duration: 1000,
    })
  }

  return (
    <div className="phone">
      <StatusBar />
      <div className="screen" style={{ position: 'relative' }}>

        <div className="app-header">
          <button className="icon-btn" onClick={onBack}>←</button>
          <span className="app-header-title">Carte</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {isMJ && unplacedLocs.length > 0 && (
              <button
                onClick={() => { setShowAdmin(!showAdmin); setShowStylePicker(false) }}
                style={{
                  position: 'relative',
                  background: showAdmin ? 'var(--accent)' : 'var(--glass2)',
                  border: '1px solid var(--border2)',
                  borderRadius: 10, padding: '5px 10px',
                  color: showAdmin ? '#fff' : 'var(--t1)',
                  fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                🏛️ À placer
                <span style={{
                  background: 'var(--danger)', color: '#fff',
                  borderRadius: '50%', width: 16, height: 16,
                  fontSize: 9, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {unplacedLocs.length}
                </span>
              </button>
            )}
            <button className="icon-btn" onClick={() => { setShowStylePicker(!showStylePicker); setShowAdmin(false) }}>🗺️</button>
          </div>
        </div>

        {/* Panneau admin — visible MJ uniquement */}
        {isMJ && showAdmin && unplacedLocs.length > 0 && (
          <div style={{
            position: 'absolute', top: 52, left: 0, right: 0,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: '0 0 20px 20px', zIndex: 100,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            maxHeight: 280, overflowY: 'auto',
          }}>
            <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                🏛️ Lieux à placer sur la carte
              </p>
              <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3 }}>
                {pendingCoords
                  ? '👆 Maintenant clique sur un lieu ci-dessous pour le placer ici'
                  : 'Clique d\'abord sur la carte pour choisir un emplacement'}
              </p>
            </div>

            {unplacedLocs.map(loc => (
              <div
                key={loc.id}
                onClick={() => pendingCoords && placeUnplacedLocation(loc)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border)',
                  cursor: pendingCoords ? 'pointer' : 'default',
                  background: pendingCoords ? 'var(--glass)' : 'transparent',
                  transition: 'background 0.15s',
                  opacity: pendingCoords ? 1 : 0.6,
                }}
                onMouseEnter={e => pendingCoords && (e.currentTarget.style.background = 'var(--glass2)')}
                onMouseLeave={e => pendingCoords && (e.currentTarget.style.background = 'var(--glass)')}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: loc.color ?? 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  {loc.icon ?? '📍'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{loc.name}</p>
                  {loc.discord_channel && (
                    <p style={{ fontSize: 11, color: 'var(--t3)' }}>#{loc.discord_channel}</p>
                  )}
                  {loc.description && (
                    <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>{loc.description}</p>
                  )}
                </div>
                {pendingCoords && (
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: 'var(--accent)', flexShrink: 0,
                  }}>
                    Placer ici →
                  </span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); deleteLocation(loc.id) }}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--danger)', fontSize: 14,
                    cursor: 'pointer', padding: 4, flexShrink: 0,
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Carte */}
        <div ref={mapContainer} style={{ flex: 1, position: 'relative' }}>
          {loading && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg)', zIndex: 10,
            }}>
              <div className="spinner" />
            </div>
          )}
        </div>

        {/* Boutons flottants */}
        <div style={{
          position: 'absolute', bottom: 16, left: 12,
          display: 'flex', flexDirection: 'column', gap: 8, zIndex: 50,
        }}>
          {/* Centrer sur moi */}
          {profile?.map_lat && (
            <button onClick={centerOnMe} style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--bg3)', border: '1px solid var(--border)',
              color: 'var(--t1)', fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}>
              🎯
            </button>
          )}

          {/* Ajouter un lieu */}
          <button onClick={() => { setShowAddLocation(true); setPendingCoords(null) }} style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--bg3)', border: '1px solid var(--border)',
            color: 'var(--accent)', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}>
            ➕
          </button>
        </div>

        {/* Popup clic sur la carte */}
        {pendingCoords && !showAddLocation && (
          <div style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '12px 16px', zIndex: 50,
            display: 'flex', gap: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            minWidth: 220,
          }}>
            <button className="btn-primary" style={{ flex: 1, padding: '8px', fontSize: 12 }} onClick={moveMyCharacter}>
              📍 Me placer ici
            </button>
            <button onClick={() => { setShowAddLocation(true) }} style={{
              flex: 1, padding: '8px', fontSize: 12,
              background: 'var(--glass2)', border: '1px solid var(--border2)',
              borderRadius: 10, color: 'var(--t1)', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 600,
            }}>
              🏛️ Lieu RP
            </button>
            <button onClick={() => setPendingCoords(null)} style={{
              padding: '8px 10px', background: 'none',
              border: '1px solid var(--border)', borderRadius: 10,
              color: 'var(--t2)', cursor: 'pointer', fontSize: 12,
            }}>✕</button>
          </div>
        )}

        {/* Formulaire ajout lieu */}
        {showAddLocation && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: '20px 20px 0 0', padding: '16px',
            zIndex: 60, boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', gap: 10,
            animation: 'slideUp 0.25s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>
                {pendingCoords ? '🏛️ Nouveau lieu RP' : '👆 Clique d\'abord sur la carte'}
              </p>
              <button onClick={() => { setShowAddLocation(false); setPendingCoords(null) }}
                style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 18, cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            {pendingCoords && (
              <>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    value={newLocation.icon}
                    onChange={e => setNewLocation(p => ({ ...p, icon: e.target.value }))}
                    style={{
                      width: 44, height: 44, textAlign: 'center',
                      fontSize: 22, border: '1px solid var(--border2)',
                      borderRadius: 10, background: 'var(--bg3)',
                      color: 'var(--t1)', fontFamily: 'inherit',
                    }}
                  />
                  <input
                    className="form-group input"
                    placeholder="Nom du lieu (ex: Quartier Nord)"
                    value={newLocation.name}
                    onChange={e => setNewLocation(p => ({ ...p, name: e.target.value }))}
                    style={{
                      flex: 1, border: '1px solid var(--border2)',
                      borderRadius: 10, padding: '10px 12px',
                      background: 'var(--bg3)', color: 'var(--t1)',
                      fontSize: 13, fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                </div>

                <input
                  placeholder="Description (optionnel)"
                  value={newLocation.description}
                  onChange={e => setNewLocation(p => ({ ...p, description: e.target.value }))}
                  style={{
                    border: '1px solid var(--border2)', borderRadius: 10,
                    padding: '10px 12px', background: 'var(--bg3)',
                    color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />

                {/* Couleur */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--t3)' }}>Couleur :</span>
                  {['#b96eff', '#7b9fff', '#ff6eb4', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'].map(c => (
                    <div key={c} onClick={() => setNewLocation(p => ({ ...p, color: c }))} style={{
                      width: 22, height: 22, borderRadius: '50%', background: c,
                      cursor: 'pointer',
                      border: newLocation.color === c ? '2px solid #fff' : '2px solid transparent',
                    }} />
                  ))}
                </div>

                <button className="btn-primary" onClick={addLocation} disabled={!newLocation.name.trim()}>
                  Ajouter le lieu
                </button>
              </>
            )}
          </div>
        )}

        {/* Popup joueur (simple, en haut) */}
        {infoPopup?.type === 'player' && (
          <div style={{
            position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '12px 16px', zIndex: 60,
            minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            animation: 'fadeDown 0.2s ease',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: infoPopup.data.avatar_color ?? '#555',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
              overflow: 'hidden',
            }}>
              {infoPopup.data.avatar_url
                ? <img src={infoPopup.data.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : infoPopup.data.initials
              }
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                {infoPopup.data.id === user?.id ? 'Toi' : infoPopup.data.username}
              </p>
              <p style={{ fontSize: 11, color: 'var(--t3)' }}>Joueur actif</p>
            </div>
            <button onClick={() => setInfoPopup(null)} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 16, cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Panneau latéral gauche — Fiche lieu style Google Maps */}
        {selectedLocation && (
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            width: 260,
            background: 'rgba(10,10,18,0.97)',
            borderRight: '1px solid var(--border)',
            zIndex: 60,
            display: 'flex', flexDirection: 'column',
            boxShadow: '4px 0 24px rgba(0,0,0,0.6)',
            animation: 'slideInLeft 0.3s cubic-bezier(0.22,1,0.36,1)',
            backdropFilter: 'blur(20px)',
          }}>

            {/* Image de couverture */}
            <div style={{
              width: '100%', height: 140,
              background: selectedLocation.cover_url
                ? `url(${selectedLocation.cover_url}) center/cover`
                : `linear-gradient(135deg, ${selectedLocation.color ?? '#b96eff'}44, ${selectedLocation.color ?? '#7b9fff'}22)`,
              position: 'relative', flexShrink: 0,
            }}>
              {/* Bouton fermer */}
              <button
                onClick={() => { setSelectedLocation(null); setLocationPlayers([]) }}
                style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)', border: 'none',
                  color: '#fff', fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>

              {/* Icône du lieu */}
              {!selectedLocation.cover_url && (
                <div style={{
                  position: 'absolute', bottom: 12, left: 16,
                  fontSize: 40,
                }}>
                  {selectedLocation.icon ?? '📍'}
                </div>
              )}
            </div>

            {/* Contenu */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* Infos principales */}
              <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: selectedLocation.color ?? '#b96eff', flexShrink: 0 }} />
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--t1)', lineHeight: 1.2, flex: 1 }}>
                    {selectedLocation.name}
                  </h2>
                </div>
                {selectedLocation.discord_channel && (
                  <p style={{ fontSize: 11, color: 'var(--t3)', marginLeft: 18, marginBottom: 8 }}>#{selectedLocation.discord_channel}</p>
                )}

                {/* Téléphone */}
                {selectedLocation.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>📞</span>
                    <p style={{ fontSize: 13, color: 'var(--t2)', fontFamily: 'monospace' }}>{selectedLocation.phone}</p>
                  </div>
                )}

                {/* Boutons actions */}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button onClick={shareLocation} style={{
                    flex: 1, padding: '7px 0', borderRadius: 10,
                    background: 'var(--glass)', border: '1px solid var(--border)',
                    color: 'var(--t1)', fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}>
                    🔗 Partager
                  </button>
                  <button onClick={() => { setShowAddReview(!showAddReview) }} style={{
                    flex: 1, padding: '7px 0', borderRadius: 10,
                    background: 'var(--glass)', border: '1px solid var(--border)',
                    color: 'var(--t1)', fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}>
                    ✍️ Avis
                  </button>
                </div>
              </div>

              {/* Description */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Description</p>
                  {isMJ && !editingDesc && (
                    <button onClick={() => { setEditDesc(selectedLocation.description ?? ''); setEditingDesc(true) }} style={{
                      background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                    }}>✏️ Modifier</button>
                  )}
                </div>
                {editingDesc ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      placeholder="Décris ce lieu..."
                      style={{
                        width: '100%', height: 80, resize: 'none',
                        background: 'var(--bg3)', border: '1px solid var(--border2)',
                        borderRadius: 10, padding: '8px 10px',
                        color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit',
                        outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={saveDescription} className="btn-primary" style={{ flex: 1, padding: '7px', fontSize: 12 }}>Sauvegarder</button>
                      <button onClick={() => setEditingDesc(false)} style={{ padding: '7px 12px', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--t2)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: selectedLocation.description ? 'var(--t2)' : 'var(--t3)', lineHeight: 1.6, fontStyle: selectedLocation.description ? 'normal' : 'italic' }}>
                    {selectedLocation.description || 'Aucune description.'}
                  </p>
                )}
              </div>

              {/* Joueurs présents */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  {locationPlayers.length > 0 ? `${locationPlayers.length} joueur${locationPlayers.length > 1 ? 's' : ''} ici` : 'Aucun joueur ici'}
                </p>
                {locationPlayers.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, position: 'relative' }}>
                    {locationPlayers.map(p => (
                      <div key={p.id} style={{ position: 'relative' }}>
                        <div
                          onMouseEnter={() => setHoveredPlayer(p.id)}
                          onMouseLeave={() => setHoveredPlayer(null)}
                          style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: p.avatar_color ?? '#555',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, color: '#fff',
                            overflow: 'hidden', cursor: 'default',
                            border: p.id === user?.id ? '2px solid var(--accent)' : '2px solid transparent',
                          }}
                        >
                          {p.avatar_url
                            ? <img src={p.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : p.initials ?? '?'
                          }
                        </div>
                        {hoveredPlayer === p.id && (
                          <div style={{
                            position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
                            background: 'rgba(0,0,0,0.85)', color: '#fff',
                            fontSize: 11, fontWeight: 600, padding: '4px 8px',
                            borderRadius: 8, whiteSpace: 'nowrap', zIndex: 10,
                            pointerEvents: 'none',
                          }}>
                            {p.id === user?.id ? 'Toi' : p.username}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Formulaire avis */}
              {showAddReview && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)' }}>Laisser un avis</p>

                  {/* Type joueur/PNJ */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['joueur', 'pnj'].map(t => (
                      <button key={t} onClick={() => setNewReview(p => ({ ...p, type: t }))} style={{
                        flex: 1, padding: '6px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                        background: newReview.type === t ? 'var(--accent)' : 'var(--glass)',
                        border: `1px solid ${newReview.type === t ? 'var(--accent)' : 'var(--border)'}`,
                        color: newReview.type === t ? '#fff' : 'var(--t2)',
                      }}>
                        {t === 'joueur' ? '👤 Joueur' : '🎭 PNJ'}
                      </button>
                    ))}
                  </div>

                  {/* Nom PNJ */}
                  {newReview.type === 'pnj' && (
                    <input
                      placeholder="Nom du PNJ"
                      value={newReview.author_name}
                      onChange={e => setNewReview(p => ({ ...p, author_name: e.target.value }))}
                      style={{ border: '1px solid var(--border2)', borderRadius: 8, padding: '7px 10px', background: 'var(--bg3)', color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
                    />
                  )}

                  {/* Note */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1,2,3,4,5].map(n => (
                      <span key={n} onClick={() => setNewReview(p => ({ ...p, rating: n }))}
                        style={{ fontSize: 18, cursor: 'pointer', opacity: n <= newReview.rating ? 1 : 0.3 }}>⭐</span>
                    ))}
                  </div>

                  {/* Texte */}
                  <textarea
                    placeholder="Ton avis sur ce lieu..."
                    value={newReview.content}
                    onChange={e => setNewReview(p => ({ ...p, content: e.target.value }))}
                    style={{ width: '100%', height: 70, resize: 'none', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, padding: '8px 10px', color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
                  />

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={addReview} className="btn-primary" style={{ flex: 1, padding: '7px', fontSize: 12 }}>Publier</button>
                    <button onClick={() => setShowAddReview(false)} style={{ padding: '7px 12px', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--t2)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
                  </div>
                </div>
              )}

              {/* Avis */}
              {reviews.length > 0 && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    Avis ({reviews.length})
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {reviews.map(r => (
                      <div key={r.id} style={{ background: 'var(--bg2)', borderRadius: 12, padding: '10px 12px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12 }}>{r.type === 'pnj' ? '🎭' : '👤'}</span>
                            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)' }}>{r.author_name}</p>
                            {r.type === 'pnj' && (
                              <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(185,110,255,0.2)', color: 'var(--accent)', padding: '1px 5px', borderRadius: 4 }}>PNJ</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, color: 'var(--t3)' }}>{'⭐'.repeat(r.rating)}</span>
                            {(r.user_id === user?.id || isMJ) && (
                              <button onClick={() => deleteReview(r.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer', padding: 0 }}>🗑️</button>
                            )}
                          </div>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>{r.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin MJ */}
              {isMJ && (
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Admin MJ</p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'var(--glass)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12, color: 'var(--t2)' }}>
                    🖼️ {selectedLocation.cover_url ? 'Changer la couverture' : 'Ajouter une couverture'}
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={async e => {
                        const file = e.target.files[0]
                        if (!file) return
                        const ext = file.name.split('.').pop()
                        const path = `covers/${selectedLocation.id}.${ext}`
                        const { error: upErr } = await supabase.storage.from('post-images').upload(path, file, { upsert: true })
                        if (upErr) return
                        const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path)
                        const url = urlData.publicUrl + '?t=' + Date.now()
                        await supabase.from('map_locations').update({ cover_url: url }).eq('id', selectedLocation.id)
                        setSelectedLocation(prev => ({ ...prev, cover_url: url }))
                        fetchLocations()
                      }}
                    />
                  </label>
                  <button onClick={() => { deleteLocation(selectedLocation.id); setSelectedLocation(null) }} style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    🗑️ Supprimer ce lieu
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Toast partage */}
        {shareToast && (
          <div style={{
            position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '10px 18px',
            fontSize: 13, fontWeight: 600, color: 'var(--t1)',
            zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            animation: 'fadeDown 0.2s ease',
            whiteSpace: 'nowrap',
          }}>
            ✅ Nom du lieu copié !
          </div>
        )}

      </div>
    </div>
  )
}

