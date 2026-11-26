import { query } from './db.js'

// Regras de créditos (contabilizadas no servidor):
// - Créditos mensais e limite de buscas por dia vêm do plano ativo (configurável no admin).
// - Cada BUSCA (mapeamento) pede até 20, 50 ou 100 empresas e reserva o preço dessa faixa
//   (tabela SEARCH_TIERS). No fim, cobra só pelas empresas NOVAS que vieram, com preço
//   proporcional entre as faixas (20 = 150, 50 = 300, 100 = 450; 21 empresas = 155).
// - Empresa que o usuário já recebeu antes (em outra busca ou como lead) nunca é cobrada de novo.
// - Toda busca conta no limite diário do plano (mesmo sem empresas novas: as fontes são consultadas).
// - Capturar leads não consome créditos.
// - Créditos do plano pago renovam no aniversário da assinatura; no grátis, todo dia 1º.
// - Dia (limite de buscas) é contado no fuso de São Paulo.
export const TZ = 'America/Sao_Paulo'

export async function activePlan(userId, db = { query }) {
  const { rows } = await db.query(
    `select s.id as subscription_id, s.status, s.period, s.current_period_start, s.current_period_end, s.cancel_at_period_end, p.*
       from subscriptions s join plans p on p.id = s.plan_id
      where s.user_id = $1 and s.status = 'active'
        and (s.current_period_end is null or s.current_period_end > now())
      order by s.created_at desc limit 1`,
    [userId]
  )
  if (rows[0]) return rows[0]
  const def = await db.query(`select * from plans where is_default and active order by sort limit 1`)
  return def.rows[0] || { id: 'nenhum', name: 'Sem plano', monthly_credits: 0, daily_limit: 0 }
}

// Plano pago ativo (o administrador da plataforma sempre tem acesso)
export async function hasPro(user, db = { query }) {
  if (user.is_admin) return true
  const plan = await activePlan(user.id, db)
  return Boolean(plan.subscription_id) && (plan.price_monthly_cents > 0 || plan.price_quarterly_cents > 0)
}

// Quantidade de empresas por busca → créditos
export const SEARCH_TIERS = [
  { max: 20, cost: 150 },
  { max: 50, cost: 300 },
  { max: 100, cost: 450 },
]
export const MAX_PER_SEARCH = SEARCH_TIERS[SEARCH_TIERS.length - 1].max
// menor faixa que comporta n empresas
export function tierFor(n) {
  return SEARCH_TIERS.find(t => n <= t.max) || SEARCH_TIERS[SEARCH_TIERS.length - 1]
}
// preço por n empresas: exato nas faixas e proporcional entre elas (nunca degrau injusto)
export function searchCost(n) {
  n = Math.min(Math.max(0, Math.floor(n)), MAX_PER_SEARCH)
  if (!n) return 0
  let prev = { max: 0, cost: 0 }
  for (const t of SEARCH_TIERS) {
    if (n <= t.max) return Math.ceil(prev.cost + ((n - prev.max) * (t.cost - prev.cost)) / (t.max - prev.max))
    prev = t
  }
  return prev.cost
}

// soma meses mantendo o dia (31/01 + 1 mês = 28 ou 29/02)
function addMonths(date, n) {
  const d = new Date(date)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + n)
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, last))
  return d
}

// Ciclo de créditos: no plano pago, renova todo mês no "aniversário" da assinatura
// (assinou dia 28 → renova todo dia 28); no plano grátis, todo dia 1º.
export function creditCycle(plan, now = new Date()) {
  if (!plan.subscription_id || !plan.current_period_start) return null
  const anchor = new Date(plan.current_period_start)
  let k = (now.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + (now.getUTCMonth() - anchor.getUTCMonth())
  let start = addMonths(anchor, k)
  while (start > now) start = addMonths(anchor, --k)
  while (addMonths(anchor, k + 1) <= now) start = addMonths(anchor, ++k)
  return { start, end: addMonths(anchor, k + 1) }
}

export async function creditStatus(userId, db = { query }) {
  const plan = await activePlan(userId, db)
  const cycle = creditCycle(plan)
  const { rows } = await db.query(
    `with c as (select coalesce($3::timestamptz, date_trunc('month', now() at time zone $2) at time zone $2) as start)
     select
       coalesce(sum(amount) filter (where created_at >= c.start and reason <> 'lead'), 0)::int as month_net,
       coalesce(-sum(amount) filter (where amount < 0 and created_at >= c.start and reason <> 'lead'), 0)::int as month_used,
       (select count(*) from mapping_runs m where m.user_id = $1 and m.status <> 'failed'
           and m.created_at >= date_trunc('day', now() at time zone $2) at time zone $2)::int as today_used,
       coalesce($4::timestamptz, (date_trunc('month', now() at time zone $2) + interval '1 month') at time zone $2) as renews_at
     from c left join credit_ledger l on l.user_id = $1
     group by c.start`,
    [userId, TZ, cycle?.start || null, cycle?.end || null]
  )
  const r = rows[0]
  const available = Math.max(0, plan.monthly_credits + r.month_net)
  return {
    plan: { id: plan.id, name: plan.name },
    monthly_credits: plan.monthly_credits,
    daily_limit: plan.daily_limit,
    month_used: r.month_used,
    today_used: r.today_used,
    available,
    // quando os créditos do plano renovam (aniversário da assinatura ou dia 1º no grátis)
    renews_at: r.renews_at,
    today_remaining: Math.max(0, plan.daily_limit - r.today_used),
    tiers: SEARCH_TIERS,
    // pode fazer ao menos a menor busca agora (créditos e limite diário de buscas)
    can_search: available >= SEARCH_TIERS[0].cost && r.today_used < plan.daily_limit,
    searches_available: Math.floor(available / SEARCH_TIERS[0].cost),
  }
}

export async function creditHistory(userId, limit = 60) {
  const { rows } = await query(
    `select to_char(created_at at time zone $2, 'YYYY-MM-DD') as day,
            -sum(amount) filter (where amount < 0 and reason <> 'lead') as used,
            sum(amount) filter (where amount > 0) as granted
       from credit_ledger where user_id = $1
      group by 1 order by 1 desc limit $3`,
    [userId, TZ, limit]
  )
  return rows.map(r => ({ day: r.day, used: Number(r.used || 0), granted: Number(r.granted || 0) }))
}
