import pg from 'pg'
import { SCHEMA, SEED } from './schema.js'

// Conexão Postgres (Neon na Vercel, ou local em desenvolvimento).
// O pool é reaproveitado entre invocações da mesma instância serverless.
let pool
let migrated = null

function getPool() {
  if (pool) return pool
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) {
    const err = new Error('Banco de dados não configurado (DATABASE_URL ausente).')
    err.status = 503
    err.code = 'DB_NOT_CONFIGURED'
    throw err
  }
  const local = /localhost|127\.0\.0\.1/.test(url)
  pool = new pg.Pool({
    connectionString: url,
    ssl: local ? false : { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10_000,
  })
  return pool
}

// Cria/atualiza as tabelas uma vez por instância (idempotente).
async function migrate() {
  if (!migrated) {
    migrated = (async () => {
      const client = await getPool().connect()
      try {
        await client.query('select pg_advisory_lock(424242)')
        await client.query(SCHEMA)
        await client.query(SEED)
      } finally {
        await client.query('select pg_advisory_unlock(424242)').catch(() => {})
        client.release()
      }
    })().catch(err => {
      migrated = null
      throw err
    })
  }
  return migrated
}

export async function query(text, params) {
  await migrate()
  return getPool().query(text, params)
}

// Executa fn dentro de uma transação.
export async function tx(fn) {
  await migrate()
  const client = await getPool().connect()
  try {
    await client.query('begin')
    const result = await fn(client)
    await client.query('commit')
    return result
  } catch (err) {
    await client.query('rollback').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}
