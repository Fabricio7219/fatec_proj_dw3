# 🔐 Criar Admin Master — FatecWeek

**Passo a passo para criar o primeiro administrador:**

## 1️⃣ Configurar a chave secreta no `.env`

Abra o arquivo `.env` na raiz do projeto e defina:

```bash
ADMIN_BOOTSTRAP_KEY=suaChaveSeguraAqui123
```

Escolha uma chave forte (recomendado: mínimo 12 caracteres, mix de letras, números e símbolos).

## 2️⃣ Reiniciar o servidor

Depois de editar o `.env`, reinicie o servidor:

```powershell
npm run dev
```

## 3️⃣ Acessar a página de bootstrap

Abra no navegador:

```
http://localhost:3000/bootstrap-admin.html
```

## 4️⃣ Preencher o formulário

- **Nome completo**: seu nome
- **Email**: o email que usará para login via Google (importante: deve estar sincronizado com a conta Google)
- **Senha**: uma senha segura (para autenticação local, se necessário)
- **Chave de Bootstrap**: a chave que você definiu em `ADMIN_BOOTSTRAP_KEY` no `.env`

## 5️⃣ Criar o admin

Clique em **"Criar Admin Master"**. Se tudo estiver correto, você será redirecionado para o painel admin.

## 6️⃣ Fazer login via Google

- Acesse o painel admin: http://localhost:3000/admin.html
- Clique em **"Entrar com Google"**
- Faça login com a conta Google associada ao email cadastrado
- Você será identificado como administrador e terá acesso total ao painel

## ✅ Próximos passos

Após criar o admin master, você pode:
- ✅ Criar novos administradores diretamente no painel
- ✅ Gerenciar palestras
- ✅ Visualizar presenças
- ✅ Gerenciar inscrições

## ⚠️ Segurança

- **Guarde a chave secreta**: não a compartilhe
- **Mude a chave após criar o primeiro admin**: edite `.env` e altere `ADMIN_BOOTSTRAP_KEY`
- **Senhas fortes**: use senhas seguras para o admin master
