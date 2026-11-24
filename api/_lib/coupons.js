// Cupons de desconto: validação e cálculo do valor final
import { fail } from './http.js'

export const normalizeCode = code => String(code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40)

// usos que contam: pedidos pagos (já ativados alguma vez) e pedidos pendentes em aberto
const USED = `(s.current_period_start is not null or s.status = 'pending_payment')`

export async function findCoupon(db, code, { userId, plan, period, ignoreSubscriptionId = 0 }) {
  const c = normalizeCode(code)
  if (!c) fail(400, 'Informe o código do cupom.')
  const { rows: [coupon] } = await db.query('select * from coupons where code = $1', [c])
  if (!coupon || !coupon.active) fail(404, 'Cupom inválido.', 'COUPON_INVALID')
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) fail(400, 'Este cupom expirou.', 'COUPON_EXPIRED')
  if (coupon.plan_id && coupon.plan_id !== plan.id) fail(400, 'Este cupom não vale para este plano.', 'COUPON_PLAN')
  if (coupon.period && coupon.period !== period) {
    fail(400, `Este cupom vale só para o plano ${coupon.period === 'quarterly' ? 'trimestral' : 'mensal'}.`, 'COUPON_PERIOD')
  }
  const { rows: [use] } = await db.query(
    `select count(*)::int as total, count(*) filter (where s.user_id = $2)::int as mine
       from subscriptions s where s.coupon_id = $1 and s.id <> $3 and ${USED}`, [coupon.id, userId, ignoreSubscriptionId])
  if (coupon.max_redemptions && use.total >= coupon.max_redemptions) fail(400, 'Este cupom já atingiu o limite de usos.', 'COUPON_EXHAUSTED')
  if (coupon.max_per_user && use.mine >= coupon.max_per_user) fail(400, 'Você já usou este cupom.', 'COUPON_USED')
  return coupon
}

export function applyCoupon(coupon, priceCents) {
  const discount = coupon
    ? Math.min(priceCents, coupon.percent_off ? Math.round((priceCents * coupon.percent_off) / 100) : coupon.amount_off_cents)
    : 0
  return { discount_cents: discount, amount_cents: priceCents - discount }
}

export const couponLabel = c => (c.percent_off ? `${c.percent_off}% de desconto` : `R$ ${(c.amount_off_cents / 100).toFixed(2).replace('.', ',')} de desconto`)

// usos de cada cupom (para o painel)
export async function couponUsage(db) {
  const { rows } = await db.query(
    `select c.*, (select count(*) from subscriptions s where s.coupon_id = c.id and s.current_period_start is not null)::int as paid,
            (select count(*) from subscriptions s where s.coupon_id = c.id and s.status = 'pending_payment')::int as pending
       from coupons c order by c.created_at desc`)
  return rows
}
