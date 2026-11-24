import { query } from './db.js'

// Regras de créditos (contabilizadas no servidor):
// - Créditos mensais e limite diário vêm do plano ativo (configurável no admin).
// - 1 crédito por NOVO lead capturado; lead já capturado nunca é cobrado de novo
//   (garantido pela restrição unique(user_id, company_id) da tabela leads).
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

export async function creditStatus(userId, db = { query }) {
  const plan = await activePlan(userId, db)
  const { rows } = await db.query(
    `select
       coalesce(sum(amount) filter (where created_at >= date_trunc('month', now() at time zone $2) at time zone $2), 0)::int as month_net,
       coalesce(-sum(amount) filter (where amount < 0 and created_at >= date_trunc('month', now() at time zone $2) at time zone $2), 0)::int as month_used,
       coalesce(-sum(amount) filter (where amount < 0 and created_at >= date_trunc('day', now() at time zone $2) at time zone $2), 0)::int as today_used
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
    can_spend: Math.max(0, Math.min(available, plan.daily_limit - r.today_used)),
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
