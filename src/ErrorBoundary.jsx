import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('💥 Erreur capturée par ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100vw', height: '100vh',
          background: '#0a0a0a', color: '#fff',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 16, padding: 24, fontFamily: 'Inter, sans-serif', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <p style={{ fontSize: 18, fontWeight: 700 }}>Une erreur est survenue</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', maxWidth: 340 }}>
            {this.state.error?.message ?? 'Erreur inconnue'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, padding: '11px 26px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #b96eff, #7b9fff)',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Recharger la page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
