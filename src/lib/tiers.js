// Faixas de créditos por busca (o servidor envia as atuais em credits.tiers).
// Máximo de 100 empresas por busca; a cobrança final é proporcional ao que veio de novo.
export const TIERS = [{ max: 20, cost: 150 }, { max: 50, cost: 300 }, { max: 100, cost: 450 }]
export const tierOf = (n, tiers = TIERS) => tiers.find(t => (n || 100) <= t.max) || tiers[tiers.length - 1]
