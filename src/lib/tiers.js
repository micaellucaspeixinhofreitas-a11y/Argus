// Faixas padrão de créditos por busca (o servidor envia as atuais em credits.tiers)
export const TIERS = [
  { max: 20, cost: 150 }, { max: 50, cost: 300 }, { max: 100, cost: 450 },
  { max: 250, cost: 1050 }, { max: 500, cost: 2100 }, { max: 1000, cost: 4200 },
]
export const tierOf = (n, tiers = TIERS) => tiers.find(t => (n || 100) <= t.max) || tiers[tiers.length - 1]
