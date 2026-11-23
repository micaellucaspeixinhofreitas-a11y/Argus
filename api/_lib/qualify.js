// Qualificação de oportunidades baseada SOMENTE em dados efetivamente encontrados.
// Cada critério é verificado contra os campos reais da empresa.

export const CRITERIA = {
  has_phone: { label: 'Tem telefone', test: c => Boolean(c.phone) },
  has_email: { label: 'Tem e-mail', test: c => Boolean(c.email) },
  has_website: { label: 'Tem website', test: c => Boolean(c.website) },
  no_website: { label: 'Sem website (oportunidade digital)', test: c => !c.website },
  has_social: { label: 'Tem redes sociais', test: c => Object.keys(c.social || {}).length > 0 },
  no_social: { label: 'Sem redes sociais', test: c => Object.keys(c.social || {}).length === 0 },
  has_hours: { label: 'Horário de funcionamento informado', test: c => Boolean(c.opening_hours) },
  has_address: { label: 'Endereço completo', test: c => Boolean(c.address) },
}

export const criteriaList = () => Object.entries(CRITERIA).map(([key, v]) => ({ key, label: v.label }))

// Normaliza a configuração vinda do cliente
export function parseQualification(input = {}) {
  const selected = Array.isArray(input.criteria) ? input.criteria.filter(k => CRITERIA[k]) : []
  // critérios contraditórios: mantém o último escolhido
  const set = new Set(selected)
  if (set.has('has_website') && set.has('no_website')) set.delete('has_website')
  if (set.has('has_social') && set.has('no_social')) set.delete('has_social')
  const minScore = Math.min(100, Math.max(1, Number(input.minScore) || 100))
  return { criteria: [...set], minScore }
}

// Retorna { score (0-100) | null, highFit, matched[] }
export function qualify(company, q) {
  if (!q.criteria.length) return { score: null, highFit: false, matched: [] }
  const matched = q.criteria.filter(k => CRITERIA[k].test(company))
  const score = Math.round((matched.length / q.criteria.length) * 100)
  return { score, highFit: score >= q.minScore, matched }
}
