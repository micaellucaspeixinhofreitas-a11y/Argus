import { useEffect, useRef, useState } from 'react'
import { fmtInt } from '../lib/api'

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Número que conta até o valor quando aparece (e anima a diferença quando muda)
export default function CountUp({ value, duration = 900, suffix = '', format = fmtInt }) {
  const target = Number(value) || 0
  const [shown, setShown] = useState(reduced() ? target : 0)
  const from = useRef(reduced() ? target : 0)
  useEffect(() => {
    if (reduced()) { setShown(target); return }
    const start = performance.now()
    const begin = from.current
    let raf
    const step = now => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = begin + (target - begin) * eased
      setShown(v)
      if (t < 1) raf = requestAnimationFrame(step)
      else from.current = target
    }
    raf = requestAnimationFrame(step)
    return () => { cancelAnimationFrame(raf); from.current = target }
  }, [target, duration])
  return <>{format(Math.round(shown))}{suffix}</>
}
