// Teste de ponta a ponta da API contra um Postgres local com PostGIS.
// Uso: DATABASE_URL=postgres://... node server/tests/api.test.js
// O provedor de lugares é substituído por um provedor de teste (só neste script).
import http from 'node:http'
import assert from 'node:assert/strict'
import { registerProvider } from '../../api/_lib/providers/index.js'

process.env.PLACES_PROVIDER = 'test'
// 4 lugares perto de (-23.55,-46.63); um fora do raio de 1 km; um duplicado (ponto + área)
const P = (id, name, lat, lng, extra = {}) => ({ source: 'osm', source_id: `node/${id}`, name, category: 'amenity:dentist', tags: {}, phone: null, website: null, email: null, address: null, city: 'São Paulo', opening_hours: null, social: {}, lat, lng, ...extra })
registerProvider({
  name: 'test',
  async geocode() { return [{ display_name: 'Pinheiros, São Paulo, Brasil', lat: -23.55, lng: -46.63, kind: 'suburb', bbox: null }] },
  async searchPlaces() {
    return [
      P(1, 'Clínica Sorriso', -23.551, -46.631, { phone: '+55 11 1111-1111', website: 'https://sorriso.example' }),
      P(2, 'Odonto Vida', -23.552, -46.632, { phone: '+55 11 2222-2222' }),
      P(3, 'Dente Feliz', -23.549, -46.629),
      P(4, 'Longe Demais', -23.60, -46.70, { phone: '1' }),
      P(5, 'Odonto Vida', -23.5521, -46.6321, { phone: '+55 11 2222-2222' }),
    ]
  },
})
const { default: handler } = await import('../../api/router.js')

const server = http.createServer(handler).listen(0)
const base = `http://127.0.0.1:${server.address().port}/api/`
let cookie = ''
async function api(method, path, body, c = cookie) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Cookie: c }, body: body ? JSON.stringify(body) : undefined })
  const set = res.headers.get('set-cookie'); if (set) cookie = set.split(';')[0]
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, data }
}

try {
  assert.equal((await api('GET', 'health')).data.db, 'ok')
  assert.equal((await api('POST', 'mapping/run', {})).status, 401, 'exige login')

  const email = `t${Date.now()}@ex.com`
  let r = await api('POST', 'auth/register', { name: 'Teste', email, password: 'senha-forte-1' })
  assert.equal(r.status, 400, 'exige aceitar os termos')
  r = await api('POST', 'auth/register', { name: 'Teste', email, password: 'senha-forte-1', acceptTerms: true })
  assert.equal(r.status, 201); const firstIsAdmin = r.data.user.is_admin
  assert.equal((await api('POST', 'auth/register', { name: 'X', email, password: 'senha-forte-1', acceptTerms: true })).status, 409)
  r = await api('GET', 'auth/me'); assert.equal(r.data.user.email, email)

  // redefinição de senha: resposta genérica, token de uso único, sessões antigas encerradas
  const { query: dbq } = await import('../../api/_lib/db.js')
  const { hashToken } = await import('../../api/_lib/auth.js')
  r = await api('POST', 'auth/forgot', { email: 'ninguem@ex.com' }); assert.equal(r.status, 200)
  r = await api('POST', 'auth/forgot', { email }); assert.equal(r.status, 200)
  const { rows: [pr] } = await dbq('select count(*)::int as n from password_resets'); assert.equal(pr.n, 1, 'só cria token para conta existente')
  const oldCookie = cookie
  await dbq(`insert into password_resets (user_id, token_hash, expires_at) select id, $1, now() + interval '1 hour' from users where email = $2`, [hashToken('tok-teste'), email])
  assert.equal((await api('POST', 'auth/reset', { token: 'errado', password: 'nova-senha-123' })).status, 400)
  r = await api('POST', 'auth/reset', { token: 'tok-teste', password: 'nova-senha-123' }, '')
  assert.equal(r.status, 200); const newCookie = cookie
  assert.equal((await api('GET', 'auth/me', null, oldCookie)).data.user, null, 'sessão antiga encerrada')
  assert.equal((await api('POST', 'auth/reset', { token: 'tok-teste', password: 'outra-senha-123' })).status, 400, 'token de uso único')
  assert.equal((await api('POST', 'auth/login', { email, password: 'senha-forte-1' })).status, 401)
  r = await api('POST', 'auth/login', { email, password: 'nova-senha-123' }); assert.equal(r.status, 200)
  r = await api('GET', 'auth/me'); assert.equal(r.data.user.email, email, 'nova sessão vale')
  void newCookie
  assert.equal(r.data.credits.monthly_credits, 150); assert.equal(r.data.credits.daily_limit, 30)

  // mapeamento com 1 área de 1 km e qualificação "tem telefone" + "sem website"
  const config = { segments: ['dentistas'], country: 'BR', locality: 'Pinheiros', radiusKm: 1,
    areas: [{ lat: -23.55, lng: -46.63, radiusKm: 1, label: 'Centro' }],
    qualification: { criteria: ['has_phone', 'no_website'], minScore: 100 } }
  assert.equal((await api('GET', 'auth/me')).data.pro, true, 'admin tem acesso Pro')
  r = await api('POST', 'mapping/run', config)
  assert.equal(r.status, 200, JSON.stringify(r.data))
  const names = r.data.results.map(x => x.name).sort()
  assert.deepEqual(names, ['Clínica Sorriso', 'Dente Feliz', 'Odonto Vida'], 'respeita o raio e remove duplicata')
  assert.equal(r.data.run.total, 3); assert.equal(r.data.run.no_website, 2); assert.equal(r.data.run.high_fit, 1)
  assert.equal(r.data.results[0].name, 'Odonto Vida', 'alta aderência primeiro')
  assert.equal(r.data.results[0].phone, null, 'contato oculto antes da captura')
  const runId = r.data.run.id
  const ids = r.data.results.map(x => x.id)

  // limite de frequência
  assert.equal((await api('POST', 'mapping/run', config)).status, 429)

  // captura: 2 leads = 2 créditos; recapturar não cobra
  r = await api('POST', 'leads/capture', { runId, companyIds: ids.slice(0, 2) })
  assert.equal(r.data.captured, 2); assert.equal(r.data.credits.today_used, 2); assert.equal(r.data.credits.available, 148)
  r = await api('POST', 'leads/capture', { runId, companyIds: ids })
  assert.equal(r.data.captured, 1); assert.equal(r.data.already_captured, 2); assert.equal(r.data.credits.available, 147)
  r = await api('GET', `mapping/result?run=${runId}`)
  assert.ok(r.data.results.find(x => x.name === 'Odonto Vida').phone, 'contato revelado após captura')

  // radar
  r = await api('GET', `radar?run=${runId}`)
  assert.equal(r.data.all.mapped, 3); assert.equal(r.data.leads.captured, 3); assert.equal(r.data.run.no_website, 2)

  // leads e exportação
  r = await api('GET', 'leads'); assert.equal(r.data.leads.length, 3)
  r = await api('GET', 'leads/export'); assert.ok(String(r.data).includes('Odonto Vida'))

  // buscas salvas
  r = await api('POST', 'searches', { config }); assert.equal(r.status, 201)
  const sid = r.data.search.id
  r = await api('GET', 'searches'); assert.equal(r.data.searches[0].config.areas[0].lat, -23.55)
  await new Promise(res => setTimeout(res, 8200))
  r = await api('POST', 'mapping/run', { ...r.data.searches[0].config, savedSearchId: sid }); assert.equal(r.status, 200)
  r = await api('GET', 'searches'); assert.ok(r.data.searches[0].last_run_at, 'registra nova execução')
  assert.equal((await api('DELETE', `searches?id=${sid}`)).status, 200)

  // sem áreas: usa a localidade geocodificada
  await new Promise(res => setTimeout(res, 8200))
  r = await api('POST', 'mapping/run', { ...config, areas: [], maxResults: 2 }); assert.equal(r.status, 200); assert.equal(r.data.areas.length, 1)
  assert.equal(r.data.run.total, 2, 'respeita a quantidade pedida')

  // créditos e planos
  r = await api('GET', 'credits'); assert.equal(r.data.credits.month_used, 3); assert.equal(r.data.history[0].used, 3)
  r = await api('GET', 'plans'); assert.ok(r.data.plans.find(p => p.id === 'pro' && p.monthly_credits === 7000 && p.daily_limit === 700))
  r = await api('POST', 'subscription', { planId: 'pro', period: 'quarterly', paymentMethod: 'pix' })
  assert.equal(r.status, 201); assert.equal(r.data.subscription.status, 'pending_payment')

  // isolamento entre usuários
  const myCookie = cookie
  await api('POST', 'auth/register', { name: 'Outro', email: `o${Date.now()}@ex.com`, password: 'senha-forte-2', acceptTerms: true }, '')
  assert.equal((await api('GET', `mapping/result?run=${runId}`)).status, 404, 'outro usuário não vê o mapeamento')
  assert.equal((await api('GET', 'leads')).data.leads.length, 0)
  r = await api('POST', 'leads/capture', { companyIds: ids })
  assert.equal(r.status, 200); assert.equal(r.data.captured, 0, 'não captura empresas de mapeamentos de outro usuário')
  r = await api('POST', 'mapping/run', config)
  assert.equal(r.status, 200, 'plano grátis também mapeia'); assert.ok(r.data.run.total > 0)
  const freeIds = r.data.results.slice(0, 3).map(x => x.id)
  r = await api('POST', 'leads/capture', { companyIds: freeIds })
  assert.equal(r.data.captured, freeIds.length, 'plano grátis captura dentro dos créditos')
  assert.equal((await api('GET', 'auth/me')).data.pro, false)
  // pagamento por Pix: gera BR Code e registra o aviso
  process.env.PIX_KEY = 'contato@argus.dev'; process.env.PIX_NAME = 'Argus Teste'; process.env.PIX_CITY = 'Sao Paulo'
  let pay = await api('POST', 'payment/pix', { planId: 'pro', period: 'monthly' })
  assert.equal(pay.status, 200, JSON.stringify(pay.data)); assert.ok(pay.data.payload.startsWith('000201')); assert.equal(pay.data.amount_cents, 19700)
  assert.ok(pay.data.payload.includes('5406197.00') && pay.data.payload.includes(pay.data.subscription.payment_reference))
  const again = await api('POST', 'payment/pix', { planId: 'pro', period: 'monthly' })
  assert.equal(again.data.subscription.id, pay.data.subscription.id, 'reaproveita o pedido pendente')
  assert.ok((await api('POST', 'payment/reported', { subscriptionId: pay.data.subscription.id })).data.subscription.payment_reported_at)
  const otherEmail = (await api('GET', 'auth/me')).data.user.email
  assert.equal((await api('GET', 'admin/overview')).status, 403)
  cookie = myCookie

  // admin: ativar Pro e conceder créditos
  if (firstIsAdmin) {
    r = await api('GET', 'admin/overview'); const me = r.data.users.find(u => u.email === email)
    const other = r.data.users.find(u => u.email === otherEmail)
    assert.ok(other.subscription.payment_reported_at, 'admin vê o Pix informado')
    assert.ok((await api('GET', 'admin/runs')).data.runs.length >= 3)
    await api('POST', 'admin/subscription', { userId: me.id, action: 'activate', planId: 'pro', period: 'monthly' })
    r = await api('GET', 'auth/me'); assert.equal(r.data.credits.monthly_credits, 7000); assert.equal(r.data.credits.daily_limit, 700)
    await api('POST', 'admin/credits', { userId: me.id, amount: 100 })
    r = await api('GET', 'auth/me'); assert.equal(r.data.credits.available, 7000 - 3 + 100)
  }
  // minha conta: perfil, senha e exclusão
  r = await api('GET', 'account'); assert.equal(r.data.user.has_password, true); assert.equal(r.data.user.google, false)
  r = await api('POST', 'account/profile', { name: 'Novo Nome', email }); assert.equal(r.data.user.name, 'Novo Nome')
  const email2 = `n${Date.now()}@ex.com`
  assert.equal((await api('POST', 'account/profile', { name: 'Novo Nome', email: email2 })).status, 401, 'trocar e-mail exige a senha')
  r = await api('POST', 'account/profile', { name: 'Novo Nome', email: email2, currentPassword: 'nova-senha-123' }); assert.equal(r.data.user.email, email2)
  assert.equal((await api('POST', 'account/password', { currentPassword: 'errada', newPassword: 'senha-nova-999' })).status, 401)
  const beforePw = cookie
  r = await api('POST', 'account/password', { currentPassword: 'nova-senha-123', newPassword: 'senha-nova-999' }); assert.equal(r.status, 200)
  assert.equal((await api('GET', 'auth/me')).data.user.email, email2, 'sessão atual continua')
  assert.equal((await api('GET', 'auth/me', null, beforePw)).data.user, null, 'outras sessões encerradas')
  if (firstIsAdmin) assert.equal((await api('POST', 'account/delete', { confirm: 'EXCLUIR', currentPassword: 'senha-nova-999' })).status, 400, 'único admin não se exclui')

  // login com Google (respostas do Google simuladas)
  process.env.GOOGLE_CLIENT_ID = 'cid'; process.env.GOOGLE_CLIENT_SECRET = 'csecret'; process.env.APP_URL = base.replace('/api/', '')
  assert.equal((await api('GET', 'meta')).data.googleAuth, true)
  const realFetch = globalThis.fetch
  const gEmail = `g${Date.now()}@gmail.com`
  globalThis.fetch = async (u, o) => {
    const s = String(u)
    if (s.startsWith('https://oauth2.googleapis.com/token')) return new Response(JSON.stringify({ access_token: 'at' }), { status: 200 })
    if (s.startsWith('https://openidconnect.googleapis.com/')) return new Response(JSON.stringify({ sub: 'g-123', email: gEmail, email_verified: true, name: 'Gui' }), { status: 200 })
    return realFetch(u, o)
  }
  let res = await realFetch(base + 'auth/google?next=/app/leads', { redirect: 'manual' })
  assert.equal(res.status, 302); const loc = new URL(res.headers.get('location'))
  assert.equal(loc.host, 'accounts.google.com'); const st = loc.searchParams.get('state')
  const oc = res.headers.getSetCookie()[0].split(';')[0]
  res = await realFetch(base + `auth/google/callback?code=x&state=errado`, { redirect: 'manual', headers: { Cookie: oc } })
  assert.match(res.headers.get('location'), /erro=google_falhou/, 'estado inválido é recusado')
  res = await realFetch(base + `auth/google/callback?code=x&state=${st}`, { redirect: 'manual', headers: { Cookie: oc } })
  assert.equal(res.headers.get('location'), '/app/leads')
  const gc = res.headers.getSetCookie().map(c => c.split(';')[0]).find(c => c.startsWith('argus_session=') && c.length > 16)
  globalThis.fetch = realFetch
  r = await api('GET', 'account', null, gc); assert.equal(r.data.user.email, gEmail); assert.equal(r.data.user.has_password, false); assert.equal(r.data.user.google, true)
  assert.equal((await api('POST', 'auth/login', { email: gEmail, password: 'qualquer-coisa' })).status, 400, 'conta Google sem senha')
  cookie = gc
  assert.equal((await api('POST', 'account/delete', { confirm: 'nao' })).status, 400)
  r = await api('POST', 'account/delete', { confirm: 'EXCLUIR' }); assert.equal(r.status, 200)
  assert.equal((await api('GET', 'auth/me', null, gc)).data.user, null, 'conta excluída')
  delete process.env.GOOGLE_CLIENT_ID
  cookie = beforePw; await api('POST', 'auth/login', { email: email2, password: 'senha-nova-999' })

  // logout
  await api('POST', 'auth/logout'); assert.equal((await api('GET', 'auth/me')).data.user, null)
  console.log('OK — todos os testes da API passaram' + (firstIsAdmin ? ' (incluindo admin)' : ''))
} catch (err) {
  console.error('FALHOU:', err.message)
  process.exitCode = 1
} finally {
  server.close()
  process.exit(process.exitCode || 0)
}
