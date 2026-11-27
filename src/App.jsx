import { useCallback, useEffect, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Preloader from './components/Preloader'
import Cursor from './components/Cursor'
import LiquidEther from './components/LiquidEther'
import Header from './sections/Header'
import Hero from './sections/Hero'
import Marquee from './sections/Marquee'
import Demo from './sections/Demo'
import Steps from './sections/Steps'
import Plans from './sections/Plans'
import Faq from './sections/Faq'
import Contact from './sections/Contact'
import Footer from './sections/Footer'

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  const [ready, setReady] = useState(false)
  const done = useCallback(() => setReady(true), [])

  // sem revelação ao rolar em cada seção (o conteúdo já está lá para quem rola rápido);
  // só a barra de progresso de leitura acompanha a rolagem
  useEffect(() => {
    // barra de progresso de leitura
    const bar = gsap.to('.progress', {
      scaleX: 1, ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
    })
    return () => { bar.scrollTrigger?.kill() }
  }, [])

  useEffect(() => {
    if (ready) ScrollTrigger.refresh()
  }, [ready])

  return (
    <>
      <Preloader onDone={done} />
      <Cursor />
      <div className="progress" aria-hidden="true" />
      <div className="noise" aria-hidden="true" />
      {/* Fluido fixo atrás do site inteiro — anima sozinho, não reage ao mouse/toque */}
      <div className="ether-bg" aria-hidden="true">
        <LiquidEther
          colors={['#5227FF', '#FF9FFC', '#000000']}
          mouseForce={20}
          cursorSize={100}
          persistence={0.75}
          autoDemo
          autoSpeed={0.5}
          autoIntensity={2.2}
          intensity={1}
          viscosity={0}
          resolution={0.25}
          pressureSteps={12}
          maxFps={30}
          clickBurst
          bounceEdges={false}
          intro
          lightMode={false}
          interactive={false}
          maxDevicePixelRatio={0.5}
        />
      </div>
      <Header />
      <main>
        <Hero ready={ready} />
        <Marquee />
        <Demo />
        <Steps />
        <Plans />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
