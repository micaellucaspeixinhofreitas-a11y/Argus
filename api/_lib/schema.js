// Estrutura do banco. Executada de forma idempotente na primeira requisição.
// Requer PostGIS (disponível no Neon e no Supabase).
export const SCHEMA = `
create extension if not exists postgis;

create table if not exists users (
  id bigserial primary key,
  email text not null unique,
  name text not null default '',
  password_hash text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Planos configuráveis pelo administrador
create table if not exists plans (
  id text primary key,
  name text not null,
  description text not null default '',
  monthly_credits integer not null,
  daily_limit integer not null,
  price_monthly_cents integer not null default 0,
  price_quarterly_cents integer not null default 0,
  features jsonb not null default '[]',
  is_default boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  plan_id text not null references plans(id),
  period text not null check (period in ('monthly','quarterly')),
  status text not null check (status in ('pending_payment','active','canceled','expired')),
  payment_method text,
  payment_provider text not null default 'manual',
  payment_reference text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on subscriptions(user_id, created_at desc);

-- Livro-razão de créditos: consumo negativo, bônus positivo
create table if not exists credit_ledger (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  amount integer not null,
  reason text not null,
  lead_id bigint,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_user_idx on credit_ledger(user_id, created_at desc);

-- Cache de geocodificação de localidades
create table if not exists locations (
  id bigserial primary key,
  query text not null,
  country text not null default '',
  display_name text not null,
  geom geography(Point, 4326) not null,
  bbox jsonb,
  kind text,
  created_at timestamptz not null default now()
);
create index if not exists locations_query_idx on locations(lower(query), country);

-- Empresas identificadas (globais, sem duplicidade por origem)
create table if not exists companies (
  id bigserial primary key,
  source text not null,
  source_id text not null,
  name text not null,
  category text,
  tags jsonb not null default '{}',
  phone text,
  website text,
  email text,
  address text,
  city text,
  opening_hours text,
  social jsonb not null default '{}',
  geom geography(Point, 4326) not null,
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);
create index if not exists companies_geom_idx on companies using gist(geom);

-- Segmentos pesquisados por usuário (histórico)
create table if not exists segments (
  user_id bigint not null references users(id) on delete cascade,
  term text not null,
  uses integer not null default 1,
  last_used timestamptz not null default now(),
  primary key (user_id, term)
);

-- Operações de mapeamento
create table if not exists mapping_runs (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  config jsonb not null,
  status text not null default 'running',
  provider text not null default 'osm',
  total integer not null default 0,
  high_fit integer not null default 0,
  no_website integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists mapping_runs_user_idx on mapping_runs(user_id, created_at desc);

create table if not exists mapping_areas (
  id bigserial primary key,
  run_id bigint not null references mapping_runs(id) on delete cascade,
  label text,
  center geography(Point, 4326) not null,
  radius_m integer not null
);

create table if not exists mapping_results (
  run_id bigint not null references mapping_runs(id) on delete cascade,
  company_id bigint not null references companies(id) on delete cascade,
  score integer,
  high_fit boolean not null default false,
  distance_m integer,
  primary key (run_id, company_id)
);

-- Leads capturados (1 por empresa por usuário: base da deduplicação de créditos)
create table if not exists leads (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  company_id bigint not null references companies(id) on delete cascade,
  run_id bigint references mapping_runs(id) on delete set null,
  score integer,
  high_fit boolean not null default false,
  captured_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create table if not exists saved_searches (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  name text not null,
  config jsonb not null,
  areas geography(MultiPoint, 4326),
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists saved_searches_user_idx on saved_searches(user_id, created_at desc);

create table if not exists operations_log (
  id bigserial primary key,
  user_id bigint references users(id) on delete cascade,
  type text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
`

// Planos iniciais (só inseridos se ainda não existirem; editáveis no painel admin)
export const SEED = `
insert into plans (id, name, description, monthly_credits, daily_limit, price_monthly_cents, price_quarterly_cents, features, is_default, sort)
values
  ('gratuito', 'Gratuito', 'Para conhecer a plataforma', 150, 30, 0, 0,
   '["150 créditos por mês","Até 30 leads por dia","Mapa e radar completos","Buscas salvas"]', true, 0),
  ('pro', 'Pro', 'Prospecção contínua para quem vende todo dia', 7000, 700, 19700, 53100,
   '["7.000 créditos por mês","Até 700 leads por dia","1 crédito por novo lead","Lead repetido não é cobrado","Exportação em CSV"]', false, 1)
on conflict (id) do nothing;
`
