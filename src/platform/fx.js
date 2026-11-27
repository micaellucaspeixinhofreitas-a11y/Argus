// Efeitos de interação da plataforma (leves e sem bibliotecas):
// - luz que segue o mouse nos cartões (--mx/--my)
// - "ondinha" ao clicar em botões
// - pílula deslizante nos seletores (.seg-tabs, .period-toggle)
// - confete para momentos de comemoração
const calm = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const SEG = '.seg-tabs, .period-toggle'

// posiciona a pílula do seletor sobre o botão ativo
function placePill(group) {
  const on = group.querySelector(':scope > .is-on')
  if (!on) { group.style.setProperty('--pill-o', '0'); return }
  group.style.setProperty('--pill-x', `${on.offsetLeft}px`)
  group.style.setProperty('--pill-y', `${on.offsetTop}px`)
  group.style.setProperty('--pill-w', `${on.offsetWidth}px`)
  group.style.setProperty('--pill-h', `${on.offsetHeight}px`)
  group.style.setProperty('--pill-o', '1')
  // a primeira posição aparece sem deslizar
  if (!group.classList.contains('has-pill')) requestAnimationFrame(() => group.classList.add('has-pill'))
}
const placeAll = root => root.querySelectorAll(SEG).forEach(placePill)

export function initFx(root = document) {
  if (typeof window === 'undefined') return () => {}
  let frame = 0
  let last = null

  // luz que acompanha o ponteiro dentro do cartão
  const onMove = e => {
    if (e.pointerType !== 'mouse') return
    last = e
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      const card = last.target.closest?.('.app .card, .app .stat-card')
      if (!card) return
      const r = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${last.clientX - r.left}px`)
      card.style.setProperty('--my', `${last.clientY - r.top}px`)
    })
  }

  // ondinha no clique
  const onDown = e => {
    if (calm()) return
    const btn = e.target.closest?.('.app .btn, .app .btn-mini, .app .chip')
    if (!btn || btn.disabled) return
    const r = btn.getBoundingClientRect()
    const size = Math.max(r.width, r.height) * 2
    const dot = document.createElement('span')
    dot.className = 'fx-ripple'
    dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`
    btn.appendChild(dot)
    setTimeout(() => dot.remove(), 650)
  }

  // pílulas: reposiciona quando a classe ativa muda, quando entra conteúdo novo e no redimensionamento
  const mo = new MutationObserver(list => {
    const groups = new Set()
    for (const m of list) {
      const el = m.target.nodeType === 1 ? m.target : m.target.parentElement
      const g = el?.closest?.(SEG)
      if (g) groups.add(g)
      if (m.type === 'childList') m.addedNodes.forEach(n => n.nodeType === 1 && (n.matches?.(SEG) ? groups.add(n) : n.querySelectorAll?.(SEG).forEach(x => groups.add(x))))
    }
    groups.forEach(placePill)
  })
  mo.observe(root.body || root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] })
  const onResize = () => placeAll(root)
  placeAll(root)

  root.addEventListener('pointermove', onMove, { passive: true })
  root.addEventListener('pointerdown', onDown, { passive: true })
  window.addEventListener('resize', onResize)
  document.fonts?.ready?.then(onResize)
  return () => {
    mo.disconnect()
    root.removeEventListener('pointermove', onMove)
    root.removeEventListener('pointerdown', onDown)
    window.removeEventListener('resize', onResize)
  }
}

// Confete: pequenas partículas que saem de um ponto (ou do centro da tela)
export function burst(x, y, count = 28) {
  if (typeof document === 'undefined' || calm()) return
  const cx = x ?? window.innerWidth / 2
  const cy = y ?? window.innerHeight / 3
  const colors = ['#a78bfa', '#c4b5fd', '#8b5cf6', '#f0abfc', '#34d399', '#fde68a']
  const layer = document.createElement('div')
  layer.className = 'fx-burst'
  layer.setAttribute('aria-hidden', 'true')
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i')
    const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4
    const dist = 80 + Math.random() * 120
    p.style.cssText = `left:${cx}px;top:${cy}px;background:${colors[i % colors.length]};` +
      `--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist - 40}px;--r:${Math.random() * 540 - 270}deg;` +
      `animation-delay:${Math.random() * 60}ms;${i % 3 === 0 ? 'border-radius:50%;' : ''}`
    layer.appendChild(p)
  }
  document.body.appendChild(layer)
  setTimeout(() => layer.remove(), 1400)
}
