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

  // Resize depuis le coin bas-droit
  function onResizeMouseDown(e) {
    e.stopPropagation()
    if (maximized) return
    const startX = e.clientX
    const startY = e.clientY
    const startW = size.w
    const startH = size.h

    function onMove(e) {
      setSize({
        w: Math.max(320, startW + e.clientX - startX),
        h: Math.max(240, startH + e.clientY - startY),
      })
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

      {/* Poignée de redimensionnement */}
      {!maximized && (
        <div
          onMouseDown={onResizeMouseDown}
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 16, height: 16, cursor: 'se-resize',
            background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.1) 50%)',
            borderRadius: '0 0 12px 0',
          }}
        />
      )}
    </div>
  )
}
