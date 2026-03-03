import { useEffect } from 'react'
import './Toast.css'

export function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => onClose?.(), 4000)
    return () => clearTimeout(t)
  }, [message, onClose])

  if (!message) return null

  return (
    <div className={`toast toast--${type}`} role="alert">
      <span className="toast__message">{message}</span>
      <button type="button" className="toast__close" onClick={onClose} aria-label="Close">×</button>
    </div>
  )
}
