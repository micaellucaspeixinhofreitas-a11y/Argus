import pg from 'pg'
import { createHash } from 'node:crypto'
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

// Versão do esquema: muda sempre que SCHEMA/SEED mudam.
const SCHEMA_HASH = createHash('sha256').update(SCHEMA + SEED).digest('hex').slice(0, 16)

// Cria/atualiza as tabelas uma vez por instância (idempotente).
// - Se o banco já está nesta versão, não faz nada (sem travas).
// - Senão, migra dentro de uma transação com trava de transação
//   (liberada sozinha no commit/rollback, segura com o pooler do Neon)
//   e com tempos-limite, para nunca deixar requisições presas.
async function migrate() {
  if (!migrated) {
    migrated = (async () => {
      const p = getPool()
      const current = await p.query("select v from schema_meta where k = 'hash'").then(r => r.rows[0]?.v, () => null)
      if (current === SCHEMA_HASH) return
      const client = await p.connect()
      try {
        await client.query('begin')
        await client.query("set local lock_timeout = '20s'")
        await client.query("set local statement_timeout = '45s'")
        await client.query('select pg_advisory_xact_lock(424242)')
        const again = await client.query("select to_regclass('schema_meta') is not null as ok")
        if (again.rows[0].ok) {
          const r = await client.query("select v from schema_meta where k = 'hash'")
          if (r.rows[0]?.v === SCHEMA_HASH) { await client.query('commit'); return }
        }
        await client.query(SCHEMA)
        await client.query(SEED)
        await client.query('create table if not exists schema_meta (k text primary key, v text not null)')
        await client.query("insert into schema_meta (k, v) values ('hash', $1) on conflict (k) do update set v = excluded.v", [SCHEMA_HASH])
        await client.query('commit')
      } catch (err) {
        await client.query('rollback').catch(() => {})
        throw err
      } finally {
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
