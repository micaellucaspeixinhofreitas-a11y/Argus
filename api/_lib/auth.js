import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { query } from './db.js'
import { fail, parseCookies } from './http.js'

const scrypt = promisify(crypto.scrypt)
const COOKIE = 'argus_session'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 dias

function secret() {
  const s = process.env.AUTH_SECRET
  if (s && s.length >= 32) return s
  if (process.env.VERCEL_ENV === 'production') fail(503, 'AUTH_SECRET não configurado.', 'AUTH_NOT_CONFIGURED')
  return 'dev-only-secret-change-me-dev-only-secret'
}

// ---- senhas (scrypt com sal aleatório) ----
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const key = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(password, stored) {
  const [alg, saltB64, keyB64] = String(stored).split('$')
  if (alg !== 'scrypt') return false
  const key = await scrypt(password, Buffer.from(saltB64, 'base64'), 64)
  const expected = Buffer.from(keyB64, 'base64')
  return expected.length === key.length && crypto.timingSafeEqual(expected, key)
}

// ---- sessão: token assinado (HMAC-SHA256) em cookie httpOnly ----
const b64url = buf => Buffer.from(buf).toString('base64url')

function sign(payload) {
  const body = b64url(JSON.stringify(payload))
  const mac = crypto.createHmac('sha256', secret()).update(body).digest('base64url')
  return `${body}.${mac}`
}

function unsign(token) {
  const [body, mac] = String(token || '').split('.')
  if (!body || !mac) return null
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url')
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (!payload.exp || payload.exp < Date.now() / 1000) return null
    return payload
  } catch {
    return null
  }
}

const secureFlag = () => (process.env.VERCEL ? '; Secure' : '')

export function sessionCookie(userId) {
  const token = sign({ uid: userId, exp: Math.floor(Date.now() / 1000) + MAX_AGE })
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secureFlag()}`
}

export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag()}`

export async function currentUser(req) {
  const payload = unsign(parseCookies(req)[COOKIE])
  if (!payload) return null
  const { rows } = await query('select id, email, name, is_admin, created_at from users where id = $1', [payload.uid])
  return rows[0] || null
}

export async function requireUser(req) {
  const user = await currentUser(req)
  if (!user) fail(401, 'Entre na sua conta para continuar.', 'UNAUTHENTICATED')
  return user
}

export async function requireAdmin(req) {
  const user = await requireUser(req)
  if (!user.is_admin) fail(403, 'Acesso restrito ao administrador.')
  return user
}
