// src/scripts/generate-docs-pdf.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const pkg = require('../../package.json');

function addHeading(doc, text){
  doc.moveDown(0.5).fontSize(18).fillColor('#111').text(text, { underline: true });
  doc.moveDown(0.3).fontSize(11).fillColor('#222');
}

function addSubheading(doc, text){
  doc.moveDown(0.3).fontSize(14).fillColor('#111').text(text);
  doc.moveDown(0.15).fontSize(11).fillColor('#222');
}

function addList(doc, items){
  items.forEach(i => doc.text(`• ${i}`));
}

function addKeyVal(doc, key, val){
  doc.text(`${key}: `, { continued: true, underline: false, fill: true });
  doc.font('Helvetica-Bold').text(String(val || '-'));
  doc.font('Helvetica');
}

function sectionProjeto(doc){
  addHeading(doc, 'FatecWeek — Documentação do Projeto');
  doc.text(`Projeto: ${pkg.name} v${pkg.version}`);
  doc.text(`Descrição: ${pkg.description || 'Aplicação web para eventos/palestras com autenticação Google, inscrições, presenças e painel administrativo.'}`);
  doc.text(`Data de geração: ${new Date().toLocaleString('pt-BR')}`);
}

function sectionStack(doc){
  addHeading(doc, 'Stack e Dependências');
  addList(doc, [
    'Node.js + Express',
    'MongoDB + Mongoose',
    'Passport Google OAuth 2.0 (login com Google)',
    'PDFKit (geração de PDF)',
    'QRCode (qrcode)',
    'Nodemailer / SendGrid (adapter de email)',
    'Frontend: HTML/CSS/JS estático em public/'
  ]);
  doc.moveDown(0.5);
  addSubheading(doc, 'Dependências (package.json)');
  const deps = Object.entries(pkg.dependencies||{}).map(([k,v]) => `${k}@${v}`);
  addList(doc, deps);
}

function sectionArquitetura(doc){
  addHeading(doc, 'Arquitetura e Organização');
  addList(doc, [
    'src/app.js — bootstrap do servidor, middlewares e rotas',
    'src/models — Mongoose Schemas (Usuario, Participante, Docente, Palestra, Inscricao, Presenca)',
    'src/routes — Rotas REST (auth, palestras, presenca, etc.)',
    'src/utils — Utilitários (EmailAdapter, presencaStrategies, location, UserFactory)',
    'public/ — Páginas estáticas (admin.html, dashboards, login, etc.)',
    'scripts — automações (criar admin, dropar índice RA, gerar PDF)'
  ]);
}

function sectionPatterns(doc){
  addHeading(doc, 'Padrões de Projeto Aplicados');
  addSubheading(doc, 'Factory — UserFactory');
  doc.text('Centraliza a construção/normalização de objetos de usuário (Usuario, Participante, Docente).');
  addSubheading(doc, 'Strategy — Presença');
  doc.text('Encapsula estratégias de verificação de presença (GPS e QR). Integrado em rotas de presença.');
  addSubheading(doc, 'Adapter — EmailAdapter');
  doc.text('Abstrai o provedor de email (SendGrid/SMTP) para envio padronizado de emails e certificados.');
}

function sectionAuth(doc){
  addHeading(doc, 'Autenticação e Autorização');
  addList(doc, [
    'Login via Google OAuth — /api/auth/google e callback',
    'Sessão Express-Session; endpoint /api/auth/me para checagem',
    'Middleware ensureAdmin/ensureDocenteOuAdmin para rotas restritas',
    'Fluxo completar perfil — /api/auth/completar (aluno/docente)',
    'Admin Master — criado via script npm run create-admin' 
  ]);
}

function sectionAdmins(doc){
  addHeading(doc, 'Administração');
  addList(doc, [
    'Painel: public/admin.html',
    'Gerencia palestras (CRUD, QR Code, iniciar/finalizar)',
    'Lista presenças por palestra',
    'Gerencia inscrições',
    'Gerencia administradores (listar/criar/remover)',
  ]);
  doc.moveDown(0.3);
  doc.text('Rotas chave:');
  addList(doc, [
    'GET/POST/PUT/DELETE /api/palestras',
    'POST /api/palestras/:id/iniciar | /finalizar',
    'GET /api/usuarios/admins | POST /api/usuarios/admins | DELETE /api/usuarios/admins/:id'
  ]);
}

function sectionEnv(doc){
  addHeading(doc, 'Configuração (.env)');
  addList(doc, [
    'MONGO_URI — conexão MongoDB',
    'SESSION_SECRET — segredo da sessão Express',
    'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI',
    'EMAIL_PROVIDER=sendgrid | smtp, SENDGRID_API_KEY, EMAIL_FROM',
    'ADMIN_BOOTSTRAP_KEY (opcional para bootstrap inicial)'
  ]);
}

function sectionEndpoints(doc){
  addHeading(doc, 'Principais Endpoints');
  addSubheading(doc, 'Auth');
  addList(doc, [
    'GET /api/auth/google → OAuth Google',
    'GET /api/auth/google/callback → processamento e redirects',
    'GET /api/auth/me → sessão atual',
    'POST /api/auth/logout → encerra sessão',
    'POST /api/auth/completar → completa perfil (aluno/docente)'
  ]);
  addSubheading(doc, 'Palestras');
  addList(doc, [
    'GET /api/palestras — lista',
    'POST /api/palestras — cria',
    'GET /api/palestras/:id — detalha',
    'PUT /api/palestras/:id — atualiza',
    'DELETE /api/palestras/:id — remove',
    'POST /api/palestras/:id/iniciar — inicia',
    'POST /api/palestras/:id/finalizar — finaliza'
  ]);
  addSubheading(doc, 'Presenças');
  addList(doc, [
    'POST /api/presenca/registrar — registra presença por QR/GPS (exemplo)',
    'GET /api/presenca/palestra/:id — lista presenças por palestra'
  ]);
}

function sectionComoRodar(doc){
  addHeading(doc, 'Como Rodar o Projeto');
  addList(doc, [
    '1) Configure o .env (MONGO_URI, Google OAuth, email provider)',
    '2) Instale dependências: npm install',
    '3) Inicie: npm run dev',
    '4) Crie Admin Master: npm run create-admin -- --email="seu-email" --senha="suaSenha"',
    '5) Acesse http://localhost:3000/admin.html e faça login com o Google'
  ]);
}

function sectionNotas(doc){
  addHeading(doc, 'Notas e Próximos Passos');
  addList(doc, [
    'Habilitar SendGrid e validar envio de certificado',
    'Adicionar testes E2E dos principais fluxos',
    'Higienizar lógica legacy de bootstrap admin se não mais usada',
    'Melhorias UX no admin (validações, atalhos, colunas responsivas)'
  ]);
}

function generate(){
  const outDir = path.resolve(__dirname, '../../docs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outPath = path.join(outDir, 'Documentacao-FatecWeek.pdf');
  const doc = new PDFDocument({ size: 'A4', margin: 42 });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  sectionProjeto(doc);
  sectionStack(doc);
  sectionArquitetura(doc);
  sectionPatterns(doc);
  sectionAuth(doc);
  sectionAdmins(doc);
  sectionEnv(doc);
  sectionEndpoints(doc);
  sectionComoRodar(doc);
  sectionNotas(doc);

  doc.end();
  stream.on('finish', () => {
    console.log('✅ PDF gerado em:', outPath);
  });
}

generate();
