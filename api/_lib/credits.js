import { query } from './db.js'

// Regras de créditos (contabilizadas no servidor):
// - Créditos mensais e limite de buscas por dia vêm do plano ativo (configurável no admin).
// - Cada BUSCA (mapeamento) custa créditos conforme a quantidade de empresas pedida
//   (tabela SEARCH_TIERS). Se vierem menos empresas novas, cobra a faixa do que veio;
//   busca sem nenhuma empresa nova não cobra nada.
// - Capturar leads não consome créditos.
// - Mês e dia são contados no fuso de São Paulo.
export const TZ = 'America/Sao_Paulo'

export async function activePlan(userId, db = { query }) {
  const { rows } = await db.query(
    `select s.id as subscription_id, s.status, s.period, s.current_period_end, s.cancel_at_period_end, p.*
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
  { max: 250, cost: 1050 },
  { max: 500, cost: 2100 },
  { max: 1000, cost: 4200 },
]
// menor faixa que comporta n empresas
export function tierFor(n) {
  return SEARCH_TIERS.find(t => n <= t.max) || SEARCH_TIERS[SEARCH_TIERS.length - 1]
}
export const searchCost = n => (n > 0 ? tierFor(n).cost : 0)

export async function creditStatus(userId, db = { query }) {
  const plan = await activePlan(userId, db)
  const { rows } = await db.query(
    `select
       coalesce(sum(amount) filter (where created_at >= date_trunc('month', now() at time zone $2) at time zone $2), 0)::int as month_net,
       coalesce(-sum(amount) filter (where amount < 0 and created_at >= date_trunc('month', now() at time zone $2) at time zone $2), 0)::int as month_used,
       count(*) filter (where reason = 'search' and created_at >= date_trunc('day', now() at time zone $2) at time zone $2)::int as today_used
     from credit_ledger where user_id = $1`,
    [userId, TZ]
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
            -sum(amount) filter (where amount < 0) as used,
            sum(amount) filter (where amount > 0) as granted
       from credit_ledger where user_id = $1
      group by 1 order by 1 desc limit $3`,
    [userId, TZ, limit]
  )
  return rows.map(r => ({ day: r.day, used: Number(r.used || 0), granted: Number(r.granted || 0) }))
}
