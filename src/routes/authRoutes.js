const express = require("express");
const passport = require("passport");
const Usuario = require("../models/Usuario");
const Participante = require("../models/Participante");
const Docente = require("../models/Docente");
const EmailAdapter = require('../utils/EmailAdapter');
const nodemailer = require('nodemailer');
const router = express.Router();

// Helper reutilizável para pós-autenticação Google
async function processPostGoogleAuth(req, res) {
  try {
    if (!req.user) {
      return res.redirect('/login-aluno.html');
    }

    const email = req.user.email;
    
    // Admin master (prioridade máxima) — ignora returnTo para garantir acesso ao painel
    const autoAdmins = process.env.ADMIN_AUTO_ADMINS ? process.env.ADMIN_AUTO_ADMINS.split(',').map(s => s.trim().toLowerCase()) : [];
    if (autoAdmins.includes(email.toLowerCase())) {
      await Usuario.findOneAndUpdate(
        { email },
        { nome: req.user.nome || req.user.displayName || email.split('@')[0], email, tipo: 'admin' },
        { upsert: true, new: true }
      );
      return res.redirect('/admin.html');
    }

    // Admin por domínio (opcional): se ADMIN_AUTO_DOMAIN estiver configurado e o email pertencer ao domínio
    const autoDomain = (process.env.ADMIN_AUTO_DOMAIN || '').toLowerCase().trim();
    if (autoDomain && email.toLowerCase().endsWith('@' + autoDomain)) {
      await Usuario.findOneAndUpdate(
        { email },
        { nome: req.user.nome || req.user.displayName || email.split('@')[0], email, tipo: 'admin' },
        { upsert: true, new: true }
      );
      return res.redirect('/admin.html');
    }

    // Se já existe usuario admin persistido, prioriza admin antes de considerar docente
    try {
      const persisted = await Usuario.findOne({ email });
      if (persisted && persisted.tipo === 'admin') {
        return res.redirect('/admin.html');
      }
    } catch (e) {}

    // Docente (após checar admin persistido): garante dashboard de docente e sincroniza Usuario
    try {
      const doc = await Docente.findOne({ email });
      if (doc) {
        // Se já houver usuário admin, não rebaixa para docente
        const existing = await Usuario.findOne({ email });
        if (existing && existing.tipo === 'admin') {
          return res.redirect('/admin.html');
        }
        await Usuario.findOneAndUpdate(
          { email },
          { nome: req.user.nome || req.user.displayName || email.split('@')[0], email, tipo: 'docente' },
          { upsert: true, new: true }
        );
        return res.redirect('/dashboard-docente.html');
      }
    } catch (e) {
      console.warn('⚠️ Falha ao verificar/promover Docente:', e?.message);
    }

    // returnTo: garantir salvamento mínimo antes de voltar (para alunos)
    const back = req.session && req.session.returnTo;
    if (back) {
      try {
        const usuarioExist = await Usuario.findOne({ email });
        const docenteExist = await Docente.findOne({ email });
        // Sempre garante um registro em Usuario durante fluxos com returnTo
        const nome = req.user.nome || req.user.displayName || (email.split('@')[0]);
        const tipo = docenteExist ? 'docente' : 'aluno';
        await Usuario.findOneAndUpdate(
          { email },
          { nome, email, tipo },
          { upsert: true, new: true }
        );
      } catch (e) {
        console.warn('⚠️ Salvamento mínimo antes do returnTo falhou:', e?.message);
      }
      try { delete req.session.returnTo; } catch(e){}
      return res.redirect(back);
    }

    // (demais fluxos) — manter como estava

    // Já existe em Usuario
    const usuario = await Usuario.findOne({ email });
    if (usuario) {
      if (usuario.tipo === 'admin') return res.redirect('/admin.html');
      if (usuario.tipo === 'docente') return res.redirect('/dashboard-docente.html');
      if (usuario.tipo === 'aluno') {
        // Somente envia para o dashboard do aluno se já existir Participante vinculado
        const participanteVinc = await Participante.findOne({ $or: [{ usuarioId: usuario._id }, { email: usuario.email }] });
        if (participanteVinc) {
          return res.redirect('/dashboard-aluno.html');
        }
        // Caso contrário, direciona para completar perfil
        return res.redirect('/completar-perfil.html');
      }
    }

    // Docente cadastrado
    const docente = await Docente.findOne({ email });
    if (docente) return res.redirect('/dashboard-docente.html');

    // Participante cadastrado
    const participante = await Participante.findOne({ email });
    if (participante) return res.redirect('/dashboard-aluno.html');

    // Novo usuário: salva mínimo e vai completar perfil
    try {
      const nome = req.user.nome || req.user.displayName || (email.split('@')[0]);
      await Usuario.findOneAndUpdate(
        { email },
        { nome, email, tipo: 'aluno' },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn('⚠️ Falha ao salvar usuário (novo):', e?.message);
    }
    return res.redirect('/completar-perfil.html');
  } catch (err) {
    console.error('❌ Erro em processPostGoogleAuth:', err);
    return res.redirect('/login-aluno.html?erro=callback');
  }
}

// Log para debug
console.log("✅ Modelos carregados:", { 
    Usuario: !!Usuario, 
    Participante: !!Participante, 
    Docente: !!Docente 
});

// Permite passar ?returnTo=/alguma/pagina para voltar após login (usado no fluxo do QR)
router.get("/google", (req, res, next) => {
  try {
    const { returnTo } = req.query || {};
    if (returnTo) {
      req.session.returnTo = returnTo;
    }
  } catch (e) {}
  return passport.authenticate("google", { scope: ["email", "profile"] })(req, res, next);
});

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login-aluno.html" }),
  async (req, res) => {
    // Reutiliza o fluxo centralizado
    return processPostGoogleAuth(req, res);
  }
);

// Rota de DEV para simular retorno do Google (NÃO habilitar em produção)
if (process.env.NODE_ENV !== 'production') {
  router.get('/google/dev-callback', async (req, res) => {
    try {
      const email = req.query.email;
      const nome = req.query.nome || (email ? email.split('@')[0] : 'Dev User');
      const returnTo = req.query.returnTo;
      if (!email) return res.status(400).json({ erro: 'email é obrigatório' });
      // Injeta user mock e returnTo na sessão
      req.user = { email, nome, displayName: nome };
      if (returnTo) {
        if (!req.session) req.session = {};
        req.session.returnTo = returnTo;
      }
      return processPostGoogleAuth(req, res);
    } catch (e) {
      console.error('Erro no dev-callback:', e);
      return res.status(500).json({ erro: 'dev-callback falhou' });
    }
  });
}

router.get('/me', async (req, res) => {
  try {
    console.log('🔍 Verificando usuário atual...');

    if (!req.user) {
      console.log('❌ Nenhum usuário na sessão');
      return res.status(401).json({ erro: 'Não autenticado' });
    }

    const email = req.user.email;
    console.log('📧 Verificando email:', email);

    try {
      // Verifica em Usuario (cadastros manuais/completos)
      const usuario = await Usuario.findOne({ email });
      if (usuario) {
        console.log('✅ Usuario encontrado em Usuario model');
        // Admin tem prioridade máxima
        if (usuario.tipo === 'admin') {
          return res.json({ ...usuario.toObject(), tipo: 'admin', cadastroCompleto: true });
        }
        // Se existir registro em Docente e o usuário não for admin, prioriza 'docente' na resposta
        const docenteForUser = await Docente.findOne({ $or: [{ usuarioId: usuario._id }, { email: usuario.email }] });
        if (docenteForUser && usuario.tipo !== 'admin') {
          const resp = { ...usuario.toObject(), tipo: 'docente', cadastroCompleto: true, docenteId: docenteForUser._id };
          return res.json(resp);
        }
        // Tenta anexar participanteId quando aplicável
        if ((usuario.tipo || 'aluno') === 'aluno') {
          const participante = await Participante.findOne({ $or: [{ usuarioId: usuario._id }, { email: usuario.email }] });
          const cadastroCompleto = !!participante && !!participante.ra;
          const resp = { ...usuario.toObject(), tipo: 'aluno', cadastroCompleto };
          if (participante) {
            resp.participanteId = participante._id;
            if (typeof participante.pontos_total !== 'undefined') resp.pontos_total = participante.pontos_total;
            if (!resp.ra && participante.ra) resp.ra = participante.ra;
            if (!resp.curso && participante.curso) resp.curso = participante.curso;
          }
          return res.json(resp);
        }

        if (usuario.tipo === 'docente') {
          const docente = await Docente.findOne({ $or: [{ usuarioId: usuario._id }, { email: usuario.email }] });
          const resp = { ...usuario.toObject(), tipo: usuario.tipo || 'docente', cadastroCompleto: true };
          if (docente) resp.docenteId = docente._id;
          return res.json(resp);
        }

        return res.json({ ...usuario.toObject(), tipo: usuario.tipo || 'aluno', cadastroCompleto: true });
      }

      // Verifica Participante
      const participante = await Participante.findOne({ email });
      if (participante) {
        console.log('✅ Participante encontrado');
        return res.json({ ...participante.toObject(), tipo: 'aluno', cadastroCompleto: true });
      }

      // Verifica Docente
      const docente = await Docente.findOne({ email });
      if (docente) {
        console.log('✅ Docente encontrado');
        return res.json({ ...docente.toObject(), tipo: 'docente', cadastroCompleto: true });
      }

      // Não encontrado — novo usuário
      console.log('➕ Usuário novo, sem cadastro completo');
      return res.json({ email: req.user.email, nome: req.user.nome || req.user.displayName, cadastroCompleto: false });
    } catch (dbError) {
      console.error('❌ Erro ao consultar banco de dados:', dbError);
      return res.status(500).json({ erro: 'Erro ao consultar banco' });
    }
  } catch (error) {
    console.error('❌ Erro ao buscar usuário:', error);
    res.status(500).json({ erro: 'Erro ao buscar dados do usuário' });
  }
});

// Nova rota para verificar se usuário já existe
router.post("/verificar-usuario", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ erro: "Email é obrigatório" });
    }
    const participante = await Participante.findOne({ email });
    const docente = await Docente.findOne({ email });
    
    if (participante || docente) {
      return res.json({
        existe: true,
        tipo: docente ? "docente" : "aluno"
      });
    }
    
    return res.json({ existe: false });
  } catch (error) {
    console.error("Erro ao verificar usuário:", error);
    res.status(500).json({ erro: "Erro ao verificar cadastro" });
  }
});

router.post("/logout", (req, res) => {
  try {
    // passport 0.6+ expects a callback for logout
    req.logout(function(err) {
      if (err) {
        console.error('Erro no logout:', err);
        return res.status(500).json({ erro: 'Erro ao fazer logout' });
      }

      // Destrói a sessão do servidor
      req.session.destroy(function(sessionErr) {
        if (sessionErr) console.error('Erro ao destruir sessão:', sessionErr);

        // Limpa o cookie de sessão do cliente (nome padrão: connect.sid)
        try {
          res.clearCookie('connect.sid', { path: '/' });
        } catch (cookieErr) {
          console.error('Erro ao limpar cookie de sessão:', cookieErr);
        }

        return res.json({ mensagem: 'Logout ok' });
      });
    });
  } catch (err) {
    console.error('Erro geral no logout:', err);
    return res.status(500).json({ erro: 'Erro ao fazer logout' });
  }
});

// ✅ Completar perfil
router.post("/completar", async (req, res) => {
  try {
    // Permite que o formulário não envie email/nome (ex: quando preenchido pela sessão)
    let { email, nome, ra, curso, semestre, tipo, fatec } = req.body;

    // Se não veio no corpo, tenta obter da sessão (req.user)
    if ((!email || !nome) && req.user) {
      email = email || req.user.email;
      nome = nome || (req.user.nome || req.user.displayName);
    }

    // Permitir admins sem nome completo: preenche um nome padrão a partir do email
    if (tipo === 'admin' && (!nome || nome.trim() === '')) {
      try {
        nome = email.split('@')[0];
      } catch (e) {
        nome = 'Administrador';
      }
    }

    if (!email || !nome || !tipo) {
      return res.status(400).json({ erro: 'Campos obrigatórios faltando (email, nome, tipo)' });
    }

    // Salva/atualiza registro no model Usuario (upsert)
    const usuario = await Usuario.findOneAndUpdate(
      { email },
      { nome, ra, curso, semestre, tipo },
      { upsert: true, new: true }
    );

    // Para alunos, garante entrada na coleção Participante e vincula ao Usuario
    if (tipo === 'aluno') {
      await Participante.findOneAndUpdate(
        { email },
        { nome, email, ra, curso, semestre, fatec, ativo: true, usuarioId: usuario._id },
        { upsert: true, new: true }
      );
    }

    // Para docentes, garante entrada na coleção Docente e vincula ao Usuario
    if (tipo === 'docente') {
      await Docente.findOneAndUpdate(
        { email },
        { nome, email, fatec: fatec || 'Não informado', cursos: curso ? [curso] : [], tipo: 'docente', usuarioId: usuario._id },
        { upsert: true, new: true }
      );
    }

    res.json({ mensagem: '✅ Perfil salvo/atualizado!', usuario });
  } catch (err) {
    console.error('Erro em /completar:', err);
    res.status(500).json({ erro: 'Erro ao salvar' });
  }
});

// Rota de debug: informa onde o email está cadastrado (Usuario / Participante / Docente)
router.get('/debug/user', async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ erro: 'query param email é obrigatório' });

    const usuario = await Usuario.findOne({ email });
    const participante = await Participante.findOne({ email });
    const docente = await Docente.findOne({ email });

    return res.json({
      email,
      usuario: usuario ? { id: usuario._id, tipo: usuario.tipo, nome: usuario.nome, email: usuario.email } : null,
      participante: participante ? { id: participante._id, ra: participante.ra, nome: participante.nome, email: participante.email } : null,
      docente: docente ? { id: docente._id, nome: docente.nome, email: docente.email } : null,
    });
  } catch (err) {
    console.error('Erro na rota /debug/user:', err);
    return res.status(500).json({ erro: 'erro interno' });
  }
});

// Rota para testar conexão SMTP
router.get('/debug/email-test', async (req, res) => {
    try {
        console.log('🔍 Iniciando teste de email...');
        
  // Usa o EmailAdapter para testar conexão e enviar email de teste
  const result = await EmailAdapter.testConnection();
        
        if (result.success) {
            res.json({
                sucesso: true,
                mensagem: 'Email de teste enviado com sucesso',
                detalhes: result.details,
                messageId: result.messageId
            });
        } else {
            res.status(500).json({
                sucesso: false,
                erro: result.error,
                detalhes: result.details
            });
        }

    } catch (error) {
        console.error('❌ Erro no teste de email:', error);
        res.status(500).json({
            sucesso: false,
            erro: error.message,
            detalhes: {
                mensagem: 'Erro ao tentar enviar email de teste',
                erro: error.toString()
            }
        });
    }
});

// Rota de debug: enviar email de teste direto (usa SENDGRID_TEST_TO ou ?to=)
router.get('/debug/send-test-email', async (req, res) => {
  try {
    const to = req.query.to || process.env.SENDGRID_TEST_TO || process.env.SMTP_USER;
    if (!to) return res.status(400).json({ sucesso: false, erro: 'email de destino não configurado (use ?to= ou defina SENDGRID_TEST_TO)' });

    const assunto = 'Teste de envio - FatecWeek';
    const html = `<p>Teste de envio em ${new Date().toLocaleString()}.</p><p>Se você recebeu este email, o provider está funcionando.</p>`;

    // EmailAdapter expõe send()
    const EmailAdapter = require('../utils/EmailAdapter');
    const result = await EmailAdapter.send({ to, subject: assunto, html });

    return res.json({ sucesso: true, detalhes: result });
  } catch (err) {
    console.error('Erro em /debug/send-test-email:', err);
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// Rota de debug alternativa: usa Ethereal (Nodemailer) para enviar um email de teste
// Útil quando não quiser/não puder usar SendGrid — não exige chave externa
router.get('/debug/send-test-ethereal', async (req, res) => {
  try {
    const to = req.query.to || process.env.SENDGRID_TEST_TO || process.env.SMTP_USER;
    if (!to) return res.status(400).json({ sucesso: false, erro: 'email de destino não configurado (use ?to=)' });

    // Cria conta de teste Ethereal
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `Ethereal <${testAccount.user}>`,
      to,
      subject: 'Teste rápido (Ethereal) - FatecWeek',
      html: `<p>Teste de envio usando Ethereal — ${new Date().toLocaleString()}</p>`
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    return res.json({ sucesso: true, messageId: info.messageId, previewUrl });
  } catch (err) {
    console.error('Erro em /debug/send-test-ethereal:', err);
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// Rota de debug: gera um PDF simples (certificado) e envia como anexo usando EmailAdapter
router.get('/debug/send-test-certificate', async (req, res) => {
  try {
    const to = req.query.to || process.env.SENDGRID_TEST_TO || process.env.SMTP_USER;
    const name = req.query.name || 'Participante de Teste';
    if (!to) return res.status(400).json({ sucesso: false, erro: 'email de destino não configurado (use ?to= ou defina SENDGRID_TEST_TO)' });

    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const PDFDocument = require('pdfkit');

    const filename = `cert_${Date.now()}.pdf`;
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, filename);

    // Gera um PDF simples
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(26).text('Certificado de Participação', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(18).text(`Concedido a: ${name}`, { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(12).text(`Data: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(10).text('Este certificado é gerado para fins de teste.', { align: 'center' });

    doc.end();

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    const subject = 'Seu certificado - FatecWeek (teste)';
    const text = `Olá ${name},

Em anexo está seu certificado de participação (teste).

Atenciosamente,
Equipe FatecWeek`;

    const result = await EmailAdapter.sendCertificate(to, subject, text, filePath);

    // Remove o arquivo temporário
    try { fs.unlinkSync(filePath); } catch (e) { console.warn('Não foi possível remover arquivo temporário', filePath, e); }

    return res.json({ sucesso: true, detalhes: result });
  } catch (err) {
    console.error('Erro em /debug/send-test-certificate:', err);
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
});

module.exports = router;
