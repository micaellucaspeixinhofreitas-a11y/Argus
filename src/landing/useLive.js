import { useEffect, useRef, useState } from 'react'

const calm = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Contador que avança a cada `ms` só enquanto o elemento está na tela (e nunca com "reduzir movimento")
export function useTick(ms = 3000) {
  const ref = useRef(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el || calm()) return
    let timer = null
    const io = new IntersectionObserver(([e]) => {
      clearInterval(timer)
      if (e.isIntersecting) timer = setInterval(() => setTick(t => t + 1), ms)
    }, { rootMargin: '80px 0px' })
    io.observe(el)
    return () => { io.disconnect(); clearInterval(timer) }
  }, [ms])
  return [ref, tick]
}

// true quando o elemento está (ou esteve) visível — para montar coisas pesadas só quando preciso
export function useInView(margin = '120px 0px') {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [margin])
  return [ref, inView]
}
