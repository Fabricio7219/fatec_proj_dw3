# FatecWeek — Sistema de Presenças, Pontos e Painel Admin

Plataforma completa para gestão da Fatec Week: autenticação via Google, inscrições em palestras, controle de presenças (QR Code + Geolocalização), emissão automática de certificados em PDF, pontuação por atividade e painel administrativo moderno.

## Visão geral

- **Backend**: Node.js + Express + Passport (Google OAuth 2.0) + Mongoose/MongoDB
- **Frontend**: Páginas estáticas em `public/` (Admin, Dashboards, Login, QR Code)
- **Presença**: Validação dupla via QR Code e Geolocalização (GPS), com temporizador de saída inteligente (libera após 20% da duração).
- **Certificados**: Geração automática de PDF (Layout A4 Paisagem, cores institucionais) ao atingir 60% de permanência.
- **Segurança**: Sessões seguras, proteção contra fraudes de GPS, e headers de segurança (Helmet).

## Arquitetura (pastas principais)

- `src/app.js` — servidor Express, middlewares, sessões e rotas
- `src/routes/*` — rotas de autenticação, palestras, presença, inscrições, docentes, usuários e pontos
- `src/models/*` — modelos Mongoose: Usuario, Participante, Docente, Palestra, Presenca, Pontuacao
- `src/utils/*` — utilitários (email, certificado PDF, segurança, QR/presença)
- `public/*` — páginas HTML/CSS/JS (admin, dashboards, login, completar-perfil, qr)

## Requisitos

- Node 18+ (recomendado)
- MongoDB local ou remoto (URI no `.env`)
- **HTTPS**: Obrigatório para funcionamento da Geolocalização em dispositivos móveis (exceto localhost).

## Setup

1) Clone o repositório e instale dependências

```powershell
git clone https://github.com/Fabricio7219/fatec_proj_dw3.git
cd fatec_proj_dw3
npm install
```

2) Crie o arquivo `.env`

Você pode usar o `.env.example` como base:

```powershell
Copy-Item .env.example .env
```

Preencha as variáveis essenciais:

```dotenv
# MongoDB
MONGO_URI=mongodb://localhost:27017/fatecweek

# Sessão Express
SESSION_SECRET=suaChaveSecreta
ADMIN_BOOTSTRAP_KEY=umaChaveDeBootstrap
ALLOWED_ORIGINS=http://localhost:3000
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX=300

# Admins automáticos
ADMIN_AUTO_ADMINS=seu.email@dominio.com,outro.admin@dominio.com
# Opcional: promover todo um domínio a admin
# ADMIN_AUTO_DOMAIN=fatec.edu.br

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Email (SendGrid ou SMTP)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=
EMAIL_FROM=fatecweek@exemplo.com
# SMTP fallback (se necessário)
# SMTP_HOST=...
# SMTP_PORT=587
# SMTP_USER=...
# SMTP_PASS=...

# Opções de presença/certificado (padrões)
PRESENCA_TOL_BEFORE_MINUTES=30
PRESENCA_TOL_AFTER_MINUTES=30
CERT_THRESHOLD_PERCENT=60
FILE_ENCRYPTION_KEY=fraseSuperSecretaOpcional
```

3) Execute em desenvolvimento

```powershell
npm run dev
```

A aplicação sobe em `http://localhost:3000`.

## Scripts úteis

- `npm run dev` — inicia com nodemon (desenvolvimento)
- `npm start` — inicia em modo normal
- `npm run create-admin` — cria admin via script (interativo)
- `npm run docs:pdf` — gera PDFs (documentação/certificados auxiliares)
- `npm run crypto:demo "texto"` — demonstra criptografia AES (usa `FILE_ENCRYPTION_KEY` para cifrar/decifrar o texto informado)
- `docker compose up --build` — sobe o app e o MongoDB localmente em containers (usa variáveis definidas no `.env` para `SESSION_SECRET`, `ADMIN_BOOTSTRAP_KEY`, etc.)

## Páginas (public/)

- `/admin.html` — Painel Administrador (Criar palestras com seletores de data/hora, QR Code, listar presenças, gerenciar docentes, creditar voluntariado, admins)
- `/dashboard-docente.html` — Painel Docente (Métricas e gestão)
- `/dashboard-aluno.html` — Painel Aluno (Inscrições, estatísticas de horas/certificados, download de certificados)
- `/completar-perfil.html` — Completar perfil (RA/curso/semestre para aluno; dados básicos para docente)
- `/login-aluno.html`, `/login-docente.html`, `/login-admin.html` — Telas de login (Redirecionamento inteligente)
- `/qr.html?p=:id` — Ponto de leitura de QR (Fluxo de presença com validação de GPS e Timer)

## Rotas principais (API)

- Autenticação (`/api/auth`)
  - `GET /google` — inicia login Google (aceita `?returnTo=/caminho`)
  - `GET /google/callback` — callback do Google (pós-login)
  - `GET /me` — dados do usuário na sessão (tipo, cadastroCompleto, ids)
  - `POST /completar` — salvar/atualizar perfil (aluno: cria/atualiza Participante; docente: cria/atualiza Docente)
  - `POST /logout` — encerra sessão
  - Debug (dev): `GET /google/dev-callback?email=&returnTo=` (somente fora de produção)

- Palestras (`/api/palestras`)
  - CRUD de palestras, tipo (`palestra` | `exposicao`), pontos (admin define; defaults 0.15/0.20)
  - Geração de QR (armazenado como DataURL para impressão/download)

- Presença (`/api/presenca`)
  - `POST /entrada` — registra entrada (valida por GPS ou QR)
  - `POST /saida` — registra saída, calcula permanência; se ≥ CERT_THRESHOLD_MINUTES, envia certificado e credita pontos
  - `GET /palestra/:id` — lista presenças da palestra

- Inscrições (`/api/inscricoes`) — fluxo de inscrição/cancelamento

- Docentes (`/api/docentes`) — listar, criar, remover (restrições via painel admin)

- Usuários/Admins (`/api/usuarios`)
  - `GET /admins` — listar admins (apenas admin)
  - `POST /admins` — criar admin (apenas admin)
  - `DELETE /admins/:id` — remover admin (proteções: não remover único admin/si mesmo)

- Pontos (`/api/pontos`)
  - `POST /voluntario` — creditar pontos de voluntariado (padrão 1.0; máximo 1.0), admin/docente somente

## Regras de negócio

- Papéis e prioridades
  - Admin tem prioridade máxima (se `Usuario.tipo === 'admin'`, sempre painel admin)
  - Docente tem prioridade sobre aluno, mas não sobre admin
  - Aluno só vai ao dashboard após completar perfil (ter `Participante` com RA)

- Pontuação
  - Por palestra: valor definido pelo admin; defaults por tipo: `palestra=0.15`, `exposicao=0.20`
  - Voluntariado: via endpoint (padrão 1.0, teto 1.0)
  - Histórico: todas as concessões são registradas em `Pontuacao`

- Presença
  - Janela de tolerância: antes do início e após o fim (default: 30/30 min)
  - **Regra de Saída**: O botão de registrar saída só é habilitado após decorridos 20% da duração da palestra.
  - **Certificado**: Emitido automaticamente se permanência ≥ `CERT_THRESHOLD_PERCENT` (default 60%).
    - O PDF é gerado no formato A4 Paisagem, com bordas nas cores da Fatec e dados dinâmicos.
    - Quando `FILE_ENCRYPTION_KEY` estiver definida, gera também uma cópia criptografada (`.enc`).
  - Modos: GPS (verifica perímetro com precisão) e QR (válido dentro da janela).

- QR Code
  - O QR aponta para `/qr.html?p=:id` e direciona o fluxo de presença
  - Template de impressão com mensagem "Seja bem-vindo(a)" e palestrante

## Arquitetura segura

- `helmet` aplica cabeçalhos seguros por padrão (XSS, MIME sniffing, etc.).
- O CORS é restrito aos domínios definidos em `ALLOWED_ORIGINS` (pode ser múltiplos separados por vírgula).
- Rate limiting global em `/api/*` (defaults: 15 min / 300 req) configurável por `RATE_LIMIT_WINDOW_MINUTES` e `RATE_LIMIT_MAX`.
- `configureSecurity()` diferencia dev/prod para TLS (`NODE_TLS_REJECT_UNAUTHORIZED`).

## Containers e deploy gratuito

- O backend possui `Dockerfile` baseado em `node:18-slim`. Basta rodar `docker build -t fatecweek .` ou usar o `docker compose` para levantar app + Mongo.
- Para demo local completa, use `docker compose up --build`; o serviço `app` já depende do `mongo` e herda variáveis de ambiente.
- Para hospedar em serviços gratuitos (Railway, Render, etc.), a opção mais simples é apontar diretamente para o repositório ou para a imagem gerada via `Dockerfile`. Depois, configure as variáveis no painel (PORT, SESSION_SECRET, MONGO_URI apontando para o banco externo/Atlas).

## Bootstrap de administrador

- Configure `ADMIN_AUTO_ADMINS` no `.env` para emails que devem ser admins automaticamente ao logar com Google.
- Opcional: `ADMIN_AUTO_DOMAIN` para promover todo um domínio (ex.: `fatec.edu.br`).
- Alternativa: use o script `npm run create-admin` ou endpoints `/api/usuarios/admins` (apenas admin).

## Dicas de desenvolvimento

- Após limpar o banco, o primeiro login com um email em `ADMIN_AUTO_ADMINS` garante acesso ao painel admin.
- Aluno novo: após login Google, será enviado para `/completar-perfil.html` para informar RA/curso/semestre.
- Em desenvolvimento, pode usar: `/api/auth/google/dev-callback?email=voce@exemplo.com&returnTo=/`.

## Troubleshooting

- "Cai no dashboard do aluno mas não consigo inscrever": complete o perfil em `/completar-perfil.html` para criar o `Participante` com RA.
- Admin indo para tela de completar: verifique `ADMIN_AUTO_ADMINS`/`ADMIN_AUTO_DOMAIN` e reinicie o servidor.
- Emails: configure `EMAIL_PROVIDER` e credenciais (SendGrid/SMTP) — use rotas de debug em `/api/auth/debug/*` para validar.

## Licença

Uso acadêmico/educacional. Ajuste conforme necessidade do seu curso/evento.

## Como contribuir

Contribuições são muito bem-vindas! Siga estes passos:

1) Faça um fork do repositório e crie uma branch para sua alteração

```powershell
git checkout -b feat/minha-melhoria
```

2) Faça commits pequenos e descritivos (preferimos Conventional Commits)

Exemplos:

- `feat(auth): prioriza admin no fluxo de login`
- `fix(presenca): corrige cálculo de tempo de permanência`
- `docs(readme): adiciona guia de setup`

3) Rode em dev, valide o fluxo principal e abra um Pull Request

- Verifique a inicialização do servidor (`npm run dev`), login com Google, painel admin, e uma inscrição + presença de ponta-a-ponta.
- Se adicionar variáveis de ambiente, lembre-se de atualizar o `.env.example` e o README/DEPLOY.

4) Checklist de PR

- [ ] Descrição clara do que foi alterado
- [ ] Instruções de teste (passo a passo)
- [ ] Sem segredos no código/commits (nada de chaves no repo)
- [ ] Atualizou docs quando necessário (README/CHANGELOG/DEPLOY)

Consulte também o arquivo `CONTRIBUTING.md` para mais detalhes.

## Deploy

Para um passo a passo detalhado (Render/Railway + MongoDB Atlas, variáveis de ambiente, OAuth, email), consulte `DEPLOY.md`.
