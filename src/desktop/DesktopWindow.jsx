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

  // Forcer le resize de la carte Mapbox après maximize/restore
  useEffect(() => {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 50)
  }, [maximized])
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
          <div onMouseDown={e => startResize(e, 'n')} style={{ position: 'absolute', top: -3, left: 10, right: 10, height: 6, cursor: 'n-resize' }} />
          <div onMouseDown={e => startResize(e, 's')} style={{ position: 'absolute', bottom: -3, left: 10, right: 10, height: 6, cursor: 's-resize' }} />
          <div onMouseDown={e => startResize(e, 'w')} style={{ position: 'absolute', left: -3, top: 10, bottom: 10, width: 6, cursor: 'w-resize' }} />
          <div onMouseDown={e => startResize(e, 'e')} style={{ position: 'absolute', right: -3, top: 10, bottom: 10, width: 6, cursor: 'e-resize' }} />

          {/* Coins */}
          <div onMouseDown={e => startResize(e, 'nw')} style={{ position: 'absolute', top: -3, left: -3, width: 12, height: 12, cursor: 'nw-resize' }} />
          <div onMouseDown={e => startResize(e, 'ne')} style={{ position: 'absolute', top: -3, right: -3, width: 12, height: 12, cursor: 'ne-resize' }} />
          <div onMouseDown={e => startResize(e, 'sw')} style={{ position: 'absolute', bottom: -3, left: -3, width: 12, height: 12, cursor: 'sw-resize' }} />
          <div
            onMouseDown={e => startResize(e, 'se')}
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 16, height: 16, cursor: 'se-resize',
              background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.1) 50%)',
              borderRadius: '0 0 12px 0',
            }}
          />
        </>
      )}
    </div>
  )
}
