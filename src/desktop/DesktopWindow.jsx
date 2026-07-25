import { useRef, useState, useEffect } from 'react'

export default function DesktopWindow({
  id, title, icon, img,
  children,
  initialX = 80, initialY = 60,
  initialW = 520, initialH = 520,
  onFocus, onClose, onMinimize,
  focused, minimized, maximized,
  onMaximize,
}) {
  const [pos, setPos]   = useState({ x: initialX, y: initialY })
  const [size, setSize] = useState({ w: initialW, h: initialH })
  const dragRef = useRef(null)
  const winRef  = useRef(null)

  // Forcer le recalcul de la carte Mapbox (et autres contenus sensibles à la taille)
  // à chaque changement de dimensions de la fenêtre
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 30)
    return () => clearTimeout(timer)
  }, [maximized, size.w, size.h])
  function onTitlebarMouseDown(e) {
    if (maximized) return
    if (e.target.closest('.window-controls')) return
    onFocus(id)

    const startX = e.clientX - pos.x
    const startY = e.clientY - pos.y

    function onMove(e) {
      setPos({
        x: Math.max(0, e.clientX - startX),
        y: Math.max(0, e.clientY - startY),
      })
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Redimensionnement depuis n'importe quel bord ou coin
  function startResize(e, direction) {
    e.stopPropagation()
    if (maximized) return
    onFocus(id)

    const startX = e.clientX
    const startY = e.clientY
    const startW = size.w
    const startH = size.h
    const startPosX = pos.x
    const startPosY = pos.y

    function onMove(e) {
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      let newW = startW, newH = startH, newX = startPosX, newY = startPosY

      if (direction.includes('e')) newW = Math.max(320, startW + dx)
      if (direction.includes('s')) newH = Math.max(240, startH + dy)
      if (direction.includes('w')) {
        newW = Math.max(320, startW - dx)
        newX = startPosX + (startW - newW)
      }
      if (direction.includes('n')) {
        newH = Math.max(240, startH - dy)
        newY = startPosY + (startH - newH)
      }

      setSize({ w: newW, h: newH })
      if (direction.includes('w') || direction.includes('n')) {
        setPos({ x: Math.max(0, newX), y: Math.max(0, newY) })
      }
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  if (minimized) return null

  const style = maximized ? {
    top: 0, left: 0,
    width: '100%',
    height: 'calc(100vh - 44px)',
  } : {
    left: pos.x, top: pos.y,
    width: size.w, height: size.h,
  }

  return (
    <div
      ref={winRef}
      className={`window ${focused ? 'focused' : ''} ${maximized ? 'maximized' : ''}`}
      style={{ ...style, zIndex: focused ? 100 : 50 }}
      onMouseDown={() => onFocus(id)}
    >
      {/* Barre de titre */}
      <div className="window-titlebar" onMouseDown={onTitlebarMouseDown}>
        <div className="window-controls">
          <button className="win-btn close"    onClick={() => onClose(id)}>✕</button>
          <button className="win-btn minimize" onClick={() => onMinimize(id)}>−</button>
          <button className="win-btn maximize" onClick={() => onMaximize(id)}>+</button>
        </div>

        {/* Icône */}
        {img
          ? <img src={img} alt="" style={{ width: 18, height: 18, borderRadius: 5, objectFit: 'cover' }} />
          : <span style={{ fontSize: 16 }}>{icon}</span>
        }

        <span className="window-title">{title}</span>
      </div>

      {/* Contenu */}
      <div className="window-content">
        {children}
      </div>

      {/* Poignées de redimensionnement — 4 bords + 4 coins */}
      {!maximized && (
        <>
          {/* Bords */}
          <div onMouseDown={e => startResize(e, 'n')} style={{ position: 'absolute', top: 0, left: 12, right: 12, height: 9, cursor: 'n-resize', zIndex: 20 }} />
          <div onMouseDown={e => startResize(e, 's')} style={{ position: 'absolute', bottom: 0, left: 12, right: 12, height: 9, cursor: 's-resize', zIndex: 20 }} />
          <div onMouseDown={e => startResize(e, 'w')} style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 9, cursor: 'w-resize', zIndex: 20 }} />
          <div onMouseDown={e => startResize(e, 'e')} style={{ position: 'absolute', right: 0, top: 12, bottom: 12, width: 9, cursor: 'e-resize', zIndex: 20 }} />

          {/* Coins */}
          <div onMouseDown={e => startResize(e, 'nw')} style={{ position: 'absolute', top: 0, left: 0, width: 16, height: 16, cursor: 'nw-resize', zIndex: 21 }} />
          <div onMouseDown={e => startResize(e, 'ne')} style={{ position: 'absolute', top: 0, right: 0, width: 16, height: 16, cursor: 'ne-resize', zIndex: 21 }} />
          <div onMouseDown={e => startResize(e, 'sw')} style={{ position: 'absolute', bottom: 0, left: 0, width: 16, height: 16, cursor: 'sw-resize', zIndex: 21 }} />
          <div
            onMouseDown={e => startResize(e, 'se')}
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 18, height: 18, cursor: 'se-resize', zIndex: 21,
              background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.12) 50%)',
              borderRadius: '0 0 12px 0',
            }}
          />
        </>
      )}
    </div>
  )
}
