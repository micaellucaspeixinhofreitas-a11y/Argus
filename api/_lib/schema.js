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
alter table subscriptions add column if not exists payment_reported_at timestamptz;
alter table plans add column if not exists deleted_at timestamptz;

-- Cupons de desconto (percentual ou valor fixo)
create table if not exists coupons (
  id bigserial primary key,
  code text not null unique,
  description text not null default '',
  percent_off integer check (percent_off between 1 and 100),
  amount_off_cents integer check (amount_off_cents > 0),
  plan_id text references plans(id) on delete set null,
  period text check (period in ('monthly','quarterly')),
  max_redemptions integer check (max_redemptions > 0),
  max_per_user integer not null default 1,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((percent_off is null) <> (amount_off_cents is null))
);
alter table subscriptions add column if not exists coupon_id bigint references coupons(id) on delete set null;
alter table subscriptions add column if not exists amount_cents integer;
alter table subscriptions add column if not exists discount_cents integer not null default 0;
-- Pix automático (Mercado Pago): id da cobrança, código copia e cola, validade e último status
alter table subscriptions add column if not exists provider_payment_id text;
alter table subscriptions add column if not exists provider_payment_status text;
alter table subscriptions add column if not exists pix_payload text;
alter table subscriptions add column if not exists pix_expires_at timestamptz;
alter table subscriptions add column if not exists paid_at timestamptz;
create index if not exists subscriptions_ref_idx on subscriptions(payment_reference);

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
create index if not exists mapping_results_company_idx on mapping_results(company_id);

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

-- Configurações do site (manutenção, aviso, cadastros, pagamentos)
create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_by bigint references users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Redefinição de senha: guarda só o hash do token enviado por e-mail
create table if not exists password_resets (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists password_resets_user_idx on password_resets(user_id, created_at desc);

alter table users add column if not exists session_version integer not null default 0;
alter table users add column if not exists accepted_terms_at timestamptz;
alter table users add column if not exists google_sub text;
create unique index if not exists users_google_sub_idx on users(google_sub) where google_sub is not null;

create table if not exists operations_log (
  id bigserial primary key,
  user_id bigint references users(id) on delete cascade,
  type text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists operations_log_type_idx on operations_log(type, created_at desc);
`

// Planos iniciais (só inseridos se ainda não existirem; editáveis no painel admin)
export const SEED = `
insert into plans (id, name, description, monthly_credits, daily_limit, price_monthly_cents, price_quarterly_cents, features, is_default, sort)
values
  ('gratuito', 'Gratuito', 'Para testar a plataforma', 300, 1, 0, 0,
   '["2 buscas de 20 empresas para testar","Mapa e radar completos"]', true, 0),
  ('pro', 'Pro', 'Prospecção contínua para quem vende todo dia', 22500, 10, 19700, 53100,
   '["Cerca de 50 buscas de 100 empresas por mês","Capturar leads não consome créditos","Lead repetido não é cobrado","Exportação em CSV"]', false, 1)
on conflict (id) do nothing;

-- nova regra (créditos por busca): atualiza os planos que ainda estão com os valores antigos de fábrica
update plans set monthly_credits = 1800, daily_limit = 3,
  features = '["Cerca de 12 buscas de 20 empresas por mês","Mapa e radar completos","Buscas salvas"]'
 where id = 'gratuito' and monthly_credits = 150 and daily_limit = 30;
update plans set monthly_credits = 22500, daily_limit = 10,
  features = '["Cerca de 50 buscas de 100 empresas por mês","Capturar leads não consome créditos","Lead repetido não é cobrado","Exportação em CSV"]'
 where id = 'pro' and monthly_credits = 7000 and daily_limit = 700;

-- plano grátis reduzido a uma amostra (para quem quer continuar, o caminho é assinar)
update plans set monthly_credits = 300, daily_limit = 1, description = 'Para testar a plataforma',
  features = '["2 buscas de 20 empresas para testar","Mapa e radar completos"]'
 where id = 'gratuito' and monthly_credits = 1800 and daily_limit = 3;

-- plano Mega retirado por enquanto (arquivado: some do site e do painel; recriar com o id "mega" no admin o traz de volta).
-- Pedidos de Pix ainda não pagos do Mega são cancelados.
update subscriptions set status = 'canceled', updated_at = now()
 where plan_id = 'mega' and status = 'pending_payment'
   and exists (select 1 from plans where id = 'mega' and deleted_at is null and monthly_credits = 3450 and daily_limit = 1200);
-- (quem já tem o Mega ativo mantém os benefícios até o fim do período pago)
update plans set active = false, is_default = false, deleted_at = now(), updated_at = now()
 where id = 'mega' and deleted_at is null and monthly_credits = 3450 and daily_limit = 1200;
`
