# Guia de Deploy

Este guia descreve como publicar a aplicação FatecWeek em plataformas como Render ou Railway, usando MongoDB Atlas e configurando OAuth do Google e envio de emails.

## 1. Pré-requisitos

- Conta no GitHub e o repositório publicado
- Conta no MongoDB Atlas (ou outro provedor Mongo)
- Projeto no Google Cloud Console para OAuth 2.0
- Provedor de email (SendGrid recomendado) ou SMTP

## 2. Banco de dados — MongoDB Atlas

1. Crie um cluster grátis no MongoDB Atlas
2. Crie um Database User (usuário/senha) e permita acesso pela rede (0.0.0.0/0 para teste ou defina IPs)
3. Copie a Connection String (SRV) e use como `MONGO_URI` no `.env`

Exemplo:

```
MONGO_URI=mongodb+srv://USUARIO:SENHA@cluster0.xxxxx.mongodb.net/fatecweek?retryWrites=true&w=majority
```

## 3. OAuth Google

1. No Google Cloud Console, crie credenciais OAuth Client ID (type: Web)
2. Configure Authorized redirect URIs com a URL pública do seu app

- Local: `http://localhost:3000/api/auth/google/callback`
- Produção (Render/Railway): `https://SEU_DOMINIO/api/auth/google/callback`

3. Anote `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` e configure no `.env`

## 4. Email (SendGrid ou SMTP)

- SendGrid (recomendado): crie uma API Key, valide remetente/domínio e defina `EMAIL_PROVIDER=sendgrid` + `SENDGRID_API_KEY`
- SMTP (fallback): defina `EMAIL_PROVIDER=smtp` e configure `SMTP_HOST/PORT/USER/PASS`

## 5. Variáveis de ambiente (produção)

Defina no painel da plataforma (Render/Railway):

- `MONGO_URI` — string do Mongo Atlas
- `SESSION_SECRET` — valor secreto longo
- `ADMIN_BOOTSTRAP_KEY` — chave para bootstrap de admin (opcional)
- `ADMIN_AUTO_ADMINS` — lista de emails que viram admin no primeiro login
- `ADMIN_AUTO_DOMAIN` — (opcional) domínio inteiro vira admin, ex.: `fatec.edu.br`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `EMAIL_PROVIDER`, `SENDGRID_API_KEY` (ou SMTP_*)
- `PRESENCA_TOL_BEFORE_MINUTES`, `PRESENCA_TOL_AFTER_MINUTES`, `CERT_THRESHOLD_MINUTES`
- `NODE_ENV=production`

## 6. Deploy no Render

1. New + Web Service → Connect com seu repo do GitHub
2. Build Command: `npm install`
3. Start Command: `node src/app.js` (ou `npm start`)
4. Configure as Environment Variables (acima)
5. Aplique. Depois de publicado, ajuste `GOOGLE_REDIRECT_URI` com a URL pública

## 7. Deploy no Railway

1. New Project → Deploy from GitHub repo
2. Instale plugin MongoDB se quiser DB gerenciado na plataforma ou use Atlas
3. Defina as Environment Variables
4. Start Command: `npm start`
5. Ajuste `GOOGLE_REDIRECT_URI` quando a URL pública estiver disponível

## 8. Domínio e HTTPS

- Render e Railway fornecem subdomínio HTTPS automático
- Opcional: aponte um domínio customizado e atualize os redirect URIs

## 9. Pós-deploy — checklist

- Teste login Google em produção
- Crie/valide admin via `ADMIN_AUTO_ADMINS` (ou bootstrap) e acesse `/admin.html`
- Cadastre uma palestra e gere o QR; valide presença (entrada/saída)
- Envio de email (certificado): use as rotas de debug para validar o provedor

## 10. Problemas comuns

- 403/401 após login: verifique cookies/sessão e a URL do callback do Google
- Admin redirecionado para completar-perfil: confirme `ADMIN_AUTO_ADMINS/ADMIN_AUTO_DOMAIN` e reinicie
- Certificado não enviado: confira variáveis de Email e logs; use rotas de debug

## 11. Dicas

- Mantenha `.env.example` atualizado para facilitar novos setups
- Evite segredos no repositório (use variáveis da plataforma)
- Use logs e rotas de debug (`/api/auth/debug/*`) em produção somente com cuidado
