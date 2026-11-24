# Revisão de segurança — Argus

Revisão feita item a item com base na checklist de 27 pontos (autenticação, banco, HTTPS, validação, XSS,
monitoramento, admin, variáveis de ambiente, limites, cabeçalhos, cookies, CSRF, links de redefinição, arquivos,
debug, dependências, segredos no Git, testes e relatório). Data: 24/11/2026.

## Resumo

| Situação | Quantidade |
|---|---|
| Já estava protegido | 16 |
| Falhas encontradas e corrigidas nesta revisão | 7 |
| Pendências que dependem de você | 2 |

## Falhas encontradas e corrigidas

| # | Falha | Risco | Correção |
|---|---|---|---|
| 1 | `/api/health?source=1` e `?basemap=1` podiam ser chamados por qualquer pessoa e disparavam APIs pagas (TomTom/Google/CARTO) | Gasto da sua cota/fatura por terceiros | Agora só o administrador pode rodar esses diagnósticos |
| 2 | Cadastro sem limite por conexão | Criação de contas em massa (abuso dos créditos grátis) | Máx. 5 cadastros por IP por hora |
| 3 | Pesquisa de endereço sem limite | Abuso das APIs de geocodificação | Máx. 40 por minuto por usuário |
| 4 | Teste de cupom sem limite | Descobrir códigos de cupom por tentativa e erro | Máx. 15 tentativas a cada 10 min |
| 5 | Exportação CSV sem proteção contra fórmulas | Um nome de empresa começando com `=` vira fórmula no Excel ("CSV injection") | Valores que começam com `= + - @` são neutralizados |
| 6 | Sem Content-Security-Policy | Menos defesa em camadas contra XSS | CSP restritiva: só scripts do próprio site, fontes do Google Fonts e mapas da CARTO |
| 7 | Sem painel de atividade suspeita | Ataques passariam despercebidos | Admin → "Atividade suspeita · 24 h": falhas de login (alerta com 5+ em 1 min), bloqueios por excesso e ações sensíveis |

Ajustes extras: senha com no máximo 200 caracteres (evita custo alto de hash), limite de 100 buscas salvas por
usuário, limite em gerar Pix (20 a cada 10 min) e em tentativas de redefinição (10 a cada 15 min por IP), e recusa de
pedidos que o navegador marca como vindos de outro site (`Sec-Fetch-Site: cross-site`).

## Já estava protegido

| Item | Como |
|---|---|
| Autenticação | Senha com scrypt + sal; sessão assinada (HMAC); troca de senha derruba as outras sessões |
| Limite de login | 8 falhas em 15 min por e-mail bloqueiam novas tentativas |
| Banco de dados por usuário | Toda consulta filtra pelo dono; testes garantem que um usuário não vê dados de outro |
| SQL injection | Todas as consultas usam parâmetros (`$1, $2…`) |
| HTTPS | Forçado pela Vercel + HSTS |
| Validação no servidor | Limites de raio, áreas, quantidade, tamanhos de texto e valores calculados no servidor (créditos, cupons, preços) |
| XSS | React escapa o conteúdo; nomes no mapa são escapados; nenhum `innerHTML`/`eval` |
| Rotas de admin | Todas exigem administrador no servidor (não só esconder o botão) |
| Variáveis de ambiente | Chaves só no servidor; o navegador recebe apenas a chave pública de mapas da CARTO |
| Cookies de sessão | `HttpOnly`, `Secure`, `SameSite=Lax` |
| CSRF | Só aceita JSON da própria origem |
| Links de redefinição | Uso único, 60 min, só o hash fica no banco |
| Upload de arquivos | Não existe upload no Argus |
| Debug em produção | Erros internos retornam mensagem genérica; build sem sourcemaps |
| Dependências | `npm audit`: 0 vulnerabilidades |
| Arquivos expostos / segredos no Git | Nenhum `.env`, dump ou chave no repositório nem no histórico |

## Pendências que dependem de você

1. **Excluir a recuperação de emergência**: apague a variável `ACCOUNT_RECOVERY` na Vercel (ela já expirou e é de uso único, mas não precisa mais existir).
2. **Trocar as chaves que passaram pelo chat**: a chave da TomTom foi enviada em conversa. Gere uma nova no painel da TomTom e atualize `TOMTOM_API_KEY` na Vercel; depois revogue a antiga.

## Testes automáticos

`server/tests/api.test.js` cobre: isolamento entre usuários, admin, CSRF (origem, cross-site e tipo de conteúdo),
diagnóstico só para admin, senha gigante, CSV com fórmula, força bruta de cupom, limite de pesquisa, link de
redefinição vencido e reutilizado, sessões derrubadas na troca de senha e o painel de atividade suspeita.
