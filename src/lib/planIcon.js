// Ícone 3D de cada plano: folha = grátis, diamante = Pro, coroa = Mega
export function planIcon(plan) {
  const id = String(plan?.id || '').toLowerCase()
  if (id.includes('mega')) return '/icons/coroa-mega.webp'
  if (id === 'pro' || id.includes('pro')) return '/icons/diamante.webp'
  const free = !plan?.price_monthly_cents && !plan?.price_quarterly_cents
  return free ? '/icons/folha.webp' : '/icons/diamante.webp'
}
