import { useCallback, useRef, useState } from 'react'

export function useToast() {
  const [message, setMessage] = useState('')
  const timeoutRef = useRef(null)

  const showToast = useCallback((text) => {
    clearTimeout(timeoutRef.current)
    setMessage(text)
    timeoutRef.current = setTimeout(() => setMessage(''), 3200)
  }, [])

  return { message, showToast }
}
