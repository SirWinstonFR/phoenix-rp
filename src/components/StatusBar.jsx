import Clock from './Clock'

export default function StatusBar() {
  return (
    <div className="status-bar">
      <Clock />
      <div className="status-icons">
        <span>▲</span>
        <span>🔋</span>
      </div>
    </div>
  )
}
