import { useState, useEffect } from 'react'

export default function Clock({ big = false }) {
  const [time, setTime] = useState(getTime())

  useEffect(() => {
    const id = setInterval(() => setTime(getTime()), 1000)
    return () => clearInterval(id)
  }, [])

  return <span className={big ? 'big-clock' : ''}>{time}</span>
}

function getTime() {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}
