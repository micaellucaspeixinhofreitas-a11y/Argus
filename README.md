# Argus — Prospecção Comercial Geolocalizada

Encontre, mapeie, qualifique e capture empresas reais por segmento e território.

## Estrutura
- `src/` — página de apresentação (`/`), login (`/entrar`) e plataforma (`/app`: Prospectar, Leads, Buscas salvas, Créditos, Plano, Admin).
- `api/router.js` — API única (Vercel Function). Módulos em `api/_lib/`:
  `auth` (contas e sessão), `credits` (créditos), `mapping` (território e mapeamento), `qualify` (qualificação),
  `segments` (segmentos → categorias), `providers/` (fontes de dados; padrão OpenStreetMap), `payments` (assinaturas), `schema` (banco).
- O banco é criado automaticamente na primeira requisição (Postgres + PostGIS).

## Variáveis de ambiente (Vercel)
| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | Postgres com PostGIS (Neon criado pela aba Storage da Vercel). |
| `AUTH_SECRET` | sim | Chave aleatória (32+ caracteres) que assina as sessões. |
| `PLACES_PROVIDER` | não | Provedor de empresas (padrão `osm`). |
| `PAYMENT_PROVIDER` | não | Padrão `manual` (admin ativa assinaturas). |

A primeira conta criada vira administradora.

## Desenvolvimento
```bash
npm install
echo "DATABASE_URL=postgres://..." > .env.local
npm run dev:api   # API em :3001
npm run dev       # site em :5173 (proxy de /api)
DATABASE_URL=postgres://... node server/tests/api.test.js   # testes da API
```
