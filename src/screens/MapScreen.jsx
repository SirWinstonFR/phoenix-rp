import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'

// Style unique : Relief
const MAP_STYLE = 'mapbox://styles/mapbox/outdoors-v12'

// Centre : Phoenix, Arizona
const PHOENIX = { lat: 33.4484, lng: -112.0740 }

// Quartiers de Phoenix (contours approximatifs basés sur les rues officielles qui les délimitent)
const NEIGHBORHOODS = [
  {
    id: 'downtown',
    name: 'Downtown Phoenix',
    color: '#b96eff',
    // Bornes : 7th Ave (ouest) · 7th St (est) · McDowell Rd (nord) · I-10 (sud)
    coords: [
      [-112.0839, 33.4696],
      [-112.0629, 33.4696],
      [-112.0629, 33.4409],
      [-112.0839, 33.4409],
      [-112.0839, 33.4696],
    ],
  },
]

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
      pitch: 45,
      bearing: -10,
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

      // Masquer tous les points d'intérêt (commerces, hôtels, restaurants...)
      const styleLayers = map.getStyle().layers
      styleLayers.forEach(layer => {
        if (
          layer.id.includes('poi') ||
          layer.id.includes('place-') ||
          layer.id.includes('airport') ||
          (layer.type === 'symbol' && layer.id !== 'neighborhood-label' && layer['source-layer'] === 'poi_label')
        ) {
          map.setLayoutProperty(layer.id, 'visibility', 'none')
        }
      })

      // Bâtiments en 3D
      const layers = map.getStyle().layers
      const labelLayerId = layers.find(l => l.type === 'symbol' && l.layout['text-field'])?.id

      map.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': '#3a2a3e',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.85,
        },
      }, labelLayerId)

      // Ajouter les quartiers en tant que zones colorées
      map.addSource('neighborhoods', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: NEIGHBORHOODS.map(n => ({
            type: 'Feature',
            properties: { name: n.name, color: n.color },
            geometry: { type: 'Polygon', coordinates: [n.coords] },
          })),
        },
      })

      map.addLayer({
        id: 'neighborhood-fill',
        type: 'fill',
        source: 'neighborhoods',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.12,
        },
      })

      map.addLayer({
        id: 'neighborhood-line',
        type: 'line',
        source: 'neighborhoods',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2,
          'line-dasharray': [2, 1.5],
        },
      })

      map.addLayer({
        id: 'neighborhood-label',
        type: 'symbol',
        source: 'neighborhoods',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 13,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'symbol-placement': 'point',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.6)',
          'text-halo-width': 1.5,
        },
      })

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

  function toggle3D() {
    if (!mapRef.current) return
    const current = mapRef.current.getPitch()
    mapRef.current.easeTo({ pitch: current > 0 ? 0 : 45, duration: 500 })
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

          {/* Bascule vue 3D */}
          <button onClick={toggle3D} style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--bg3)', border: '1px solid var(--border)',
            color: 'var(--t1)', fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}>
            🏙️
          </button>

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

        {/* Panneau latéral gauche — Fiche lieu */}
        {selectedLocation && (
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            width: 280,
            background: 'rgba(8,8,14,0.98)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            zIndex: 60, display: 'flex', flexDirection: 'column',
            boxShadow: '8px 0 40px rgba(0,0,0,0.7)',
            animation: 'slideInLeft 0.3s cubic-bezier(0.22,1,0.36,1)',
            backdropFilter: 'blur(24px)',
          }}>

            {/* Hero */}
            <div style={{ width: '100%', height: 170, position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
              {selectedLocation.cover_url
                ? <img src={selectedLocation.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{
                    width: '100%', height: '100%',
                    background: `linear-gradient(135deg, ${selectedLocation.color ?? '#b96eff'}88, #0a0a14)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72,
                  }}>{selectedLocation.icon ?? '📍'}</div>
              }
              {/* Dégradé bas */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90, background: 'linear-gradient(0deg, rgba(8,8,14,1) 0%, transparent 100%)' }} />
              {/* Fermer */}
              <button onClick={() => { setSelectedLocation(null); setLocationPlayers([]) }} style={{
                position: 'absolute', top: 10, right: 10,
                width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(8px)',
              }}>✕</button>
              {/* Titre sur hero */}
              <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: selectedLocation.color ?? '#b96eff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  boxShadow: `0 4px 16px ${selectedLocation.color ?? '#b96eff'}66`,
                }}>{selectedLocation.icon ?? '📍'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.2, textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
                    {selectedLocation.name}
                  </p>
                  {selectedLocation.discord_channel && (
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>#{selectedLocation.discord_channel}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contenu scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>

              {/* Infos + actions */}
              <div style={{ padding: '14px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {selectedLocation.phone && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 12, marginBottom: 12,
                    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)',
                  }}>
                    <span style={{ fontSize: 16 }}>📞</span>
                    <p style={{ fontSize: 13, color: '#86efac', fontFamily: 'monospace', fontWeight: 600 }}>{selectedLocation.phone}</p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={shareLocation} style={{
                    flex: 1, padding: '10px 0', borderRadius: 12,
                    background: 'rgba(123,159,255,0.1)', border: '1px solid rgba(123,159,255,0.2)',
                    color: '#7b9fff', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>🔗 Partager</button>
                  <button onClick={() => setShowAddReview(!showAddReview)} style={{
                    flex: 1, padding: '10px 0', borderRadius: 12,
                    background: 'rgba(185,110,255,0.1)', border: '1px solid rgba(185,110,255,0.2)',
                    color: '#b96eff', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>✍️ Avis</button>
                </div>
              </div>

              {/* Description */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Description</p>
                  {isMJ && !editingDesc && (
                    <button onClick={() => { setEditDesc(selectedLocation.description ?? ''); setEditingDesc(true) }}
                      style={{ background: 'none', border: 'none', color: '#b96eff', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                      ✏️ Modifier
                    </button>
                  )}
                </div>
                {editingDesc ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Décris ce lieu..."
                      style={{ width: '100%', height: 80, resize: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 10px', color: '#e0e0e0', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={saveDescription} style={{ flex: 1, padding: '8px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #b96eff, #7b9fff)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Sauvegarder</button>
                      <button onClick={() => setEditingDesc(false)} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#666', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: selectedLocation.description ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.18)', fontStyle: selectedLocation.description ? 'normal' : 'italic' }}>
                    {selectedLocation.description || 'Aucune description pour l\'instant.'}
                  </p>
                )}
              </div>

              {/* Joueurs */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
                  {locationPlayers.length > 0 ? `${locationPlayers.length} présent${locationPlayers.length > 1 ? 's' : ''}` : 'Personne ici'}
                </p>
                {locationPlayers.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {locationPlayers.map(p => (
                      <div key={p.id} style={{ position: 'relative' }}>
                        <div onMouseEnter={() => setHoveredPlayer(p.id)} onMouseLeave={() => setHoveredPlayer(null)}
                          style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: p.avatar_color ?? '#555',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden',
                            border: p.id === user?.id ? '2.5px solid #b96eff' : '2px solid rgba(255,255,255,0.1)',
                            boxShadow: p.id === user?.id ? '0 0 12px rgba(185,110,255,0.5)' : '0 2px 8px rgba(0,0,0,0.4)',
                            cursor: 'default', transition: 'transform 0.15s',
                          }}
                        >
                          {p.avatar_url ? <img src={p.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.initials ?? '?'}
                        </div>
                        {hoveredPlayer === p.id && (
                          <div style={{
                            position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
                            background: 'rgba(0,0,0,0.92)', color: '#fff',
                            fontSize: 11, fontWeight: 700, padding: '5px 9px',
                            borderRadius: 8, whiteSpace: 'nowrap', zIndex: 10,
                            border: '1px solid rgba(255,255,255,0.1)',
                            pointerEvents: 'none',
                          }}>
                            {p.id === user?.id ? '👤 Toi' : p.username}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)', fontStyle: 'italic' }}>Aucun personnage dans ce lieu.</p>
                )}
              </div>

              {/* Formulaire avis */}
              {showAddReview && (
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(185,110,255,0.03)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#e0e0e0' }}>Laisser un avis</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['joueur', 'pnj'].map(t => (
                      <button key={t} onClick={() => setNewReview(p => ({ ...p, type: t }))} style={{
                        flex: 1, padding: '8px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        background: newReview.type === t ? (t === 'pnj' ? 'rgba(185,110,255,0.2)' : 'rgba(123,159,255,0.2)') : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${newReview.type === t ? (t === 'pnj' ? 'rgba(185,110,255,0.4)' : 'rgba(123,159,255,0.4)') : 'rgba(255,255,255,0.08)'}`,
                        color: newReview.type === t ? '#fff' : '#555',
                      }}>{t === 'joueur' ? '👤 Joueur' : '🎭 PNJ'}</button>
                    ))}
                  </div>
                  {newReview.type === 'pnj' && (
                    <input placeholder="Nom du PNJ" value={newReview.author_name} onChange={e => setNewReview(p => ({ ...p, author_name: e.target.value }))}
                      style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', color: '#e0e0e0', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
                    />
                  )}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1,2,3,4,5].map(n => (
                      <span key={n} onClick={() => setNewReview(p => ({ ...p, rating: n }))}
                        style={{ fontSize: 22, cursor: 'pointer', opacity: n <= newReview.rating ? 1 : 0.2, transition: 'opacity 0.15s' }}>⭐</span>
                    ))}
                  </div>
                  <textarea placeholder="Ton avis..." value={newReview.content} onChange={e => setNewReview(p => ({ ...p, content: e.target.value }))}
                    style={{ width: '100%', height: 70, resize: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', color: '#e0e0e0', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={addReview} style={{ flex: 1, padding: '9px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #b96eff, #7b9fff)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Publier</button>
                    <button onClick={() => setShowAddReview(false)} style={{ padding: '9px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#555', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
                  </div>
                </div>
              )}

              {/* Avis existants */}
              {reviews.length > 0 && (
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Avis ({reviews.length})</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {reviews.map(r => (
                      <div key={r.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ fontSize: 14 }}>{r.type === 'pnj' ? '🎭' : '👤'}</span>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#e0e0e0' }}>{r.author_name}</p>
                            {r.type === 'pnj' && (
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(185,110,255,0.15)', color: '#b96eff', border: '1px solid rgba(185,110,255,0.2)' }}>PNJ</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10 }}>{'⭐'.repeat(r.rating)}</span>
                            {(r.user_id === user?.id || isMJ) && (
                              <button onClick={() => deleteReview(r.id)} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.5)', fontSize: 12, cursor: 'pointer', padding: 0 }}>🗑️</button>
                            )}
                          </div>
                        </div>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{r.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin MJ */}
              {isMJ && (
                <div style={{ padding: '14px 16px' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Admin MJ</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontSize: 12, color: '#888' }}>
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
                    <button onClick={() => { deleteLocation(selectedLocation.id); setSelectedLocation(null) }} style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.12)', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                      🗑️ Supprimer ce lieu
                    </button>
                  </div>
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

