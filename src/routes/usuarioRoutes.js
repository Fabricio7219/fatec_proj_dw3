const express = require("express");
const router = express.Router();
const passport = require("passport");
const Usuario = require("../models/Usuario");
const Participante = require("../models/Participante");
const ensureAdmin = require('../middleware/ensureAdmin');

function sanitizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getFixedAdminEmails() {
  return String(process.env.ADMIN_FIXED_ADMINS || '')
    .split(',')
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);
}

async function isRequesterAdmin(req) {
  if (!req.user || !req.user.email) return false;
  const reqEmail = sanitizeEmail(req.user.email);
  if (getFixedAdminEmails().includes(reqEmail)) return true;
  const requester = await Usuario.findOne({ email: reqEmail }).select('tipo');
  return !!(requester && requester.tipo === 'admin');
}

// Cadastro manual
router.post("/cadastro", async (req, res) => {
  try {
    const { nome, ra, email, senha, curso, semestre } = req.body;
    if (!nome || !ra || !email || !senha || !curso || !semestre) {
      return res.status(400).json({ erro: "Todos os campos são obrigatórios." });
    }

    const emailNormalizado = String(email).trim().toLowerCase();

    const usuarioExistente = await Usuario.findOne({ $or: [{ email: emailNormalizado }, { ra }] });
    if (usuarioExistente) {
      // Conta local já existente: em ambiente de teste, evita bloquear o botão de cadastro.
      if (usuarioExistente.senha) {
        const senhaConfere = await usuarioExistente.verificarSenha(senha);
        if (!senhaConfere) {
          return res.status(409).json({ erro: "Usuário já existe com outra senha. Use a aba 'Já tenho conta'." });
        }

        return res.status(200).json({
          mensagem: "Conta já existente. Prosseguindo com login.",
          usuario: usuarioExistente
        });
      }

      // Permite converter conta criada via Google em conta local com senha.
      if (!usuarioExistente.senha) {
        usuarioExistente.nome = nome;
        usuarioExistente.ra = ra;
        usuarioExistente.curso = curso;
        usuarioExistente.semestre = semestre;
        usuarioExistente.email = emailNormalizado;
        usuarioExistente.senha = senha;
        if (!usuarioExistente.tipo) usuarioExistente.tipo = 'aluno';
        await usuarioExistente.save();

        const participanteAtualizado = await Participante.findOneAndUpdate(
          { email: emailNormalizado },
          { ra, nome, curso, semestre, email: emailNormalizado, usuarioId: usuarioExistente._id, ativo: true },
          { upsert: true, new: true }
        );

        return res.status(200).json({
          mensagem: "Conta atualizada com sucesso.",
          usuario: usuarioExistente,
          participante: participanteAtualizado
        });
      }

      return res.status(409).json({ erro: "Usuário já existe." });
    }

    const novoUsuario = new Usuario({ nome, ra, email: emailNormalizado, senha, curso, semestre });
    await novoUsuario.save();

    const novoParticipante = new Participante({ ra, nome, curso, semestre, email: emailNormalizado, usuarioId: novoUsuario._id });
    await novoParticipante.save();

    res.status(201).json({ mensagem: "Usuário cadastrado com sucesso", usuario: novoUsuario, participante: novoParticipante });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Login manual com e-mail/senha e criação de sessão
router.post('/login-local', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ sucesso: false, erro: 'Email e senha são obrigatórios.' });
    }

    const emailNormalizado = String(email).trim().toLowerCase();
    const usuario = await Usuario.findOne({ email: emailNormalizado });
    if (!usuario) {
      return res.status(404).json({ sucesso: false, erro: 'Usuário não encontrado.' });
    }

    if (!usuario.senha) {
      return res.status(400).json({ sucesso: false, erro: 'Esta conta não possui senha local. Use login com Google.' });
    }

    const senhaValida = await usuario.verificarSenha(senha);
    if (!senhaValida) {
      return res.status(401).json({ sucesso: false, erro: 'Senha inválida.' });
    }

    req.login({ email: usuario.email, nome: usuario.nome }, async (err) => {
      if (err) {
        return res.status(500).json({ sucesso: false, erro: 'Falha ao iniciar sessão.' });
      }

      let redirect = '/dashboard-aluno.html';
      const tipo = usuario.tipo || 'aluno';
      if (tipo === 'admin') {
        redirect = '/admin.html';
      } else if (tipo === 'docente') {
        redirect = '/dashboard-docente.html';
      } else {
        const participante = await Participante.findOne({ $or: [{ usuarioId: usuario._id }, { email: usuario.email }] });
        if (!participante || !participante.ra) {
          redirect = '/completar-perfil.html';
        }
      }

      return res.json({
        sucesso: true,
        mensagem: 'Login realizado com sucesso.',
        redirect,
        usuario: {
          _id: usuario._id,
          nome: usuario.nome,
          email: usuario.email,
          tipo
        }
      });
    });
  } catch (error) {
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
});

// Completar dados (Google Login)
router.put("/completar", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ erro: "Usuário não autenticado." });

    const { ra, curso, semestre } = req.body;
    if (!ra || !curso || !semestre) {
      return res.status(400).json({ erro: "RA, curso e semestre são obrigatórios." });
    }

    const usuario = await Usuario.findById(req.user._id);
    usuario.ra = ra;
    usuario.curso = curso;
    usuario.semestre = semestre;
    await usuario.save();

    let participante = await Participante.buscarPorRA(ra);
    if (!participante) {
      participante = new Participante({ ra, nome: usuario.nome, curso, semestre, email: usuario.email, usuarioId: usuario._id });
    } else {
      participante.nome = usuario.nome;
      participante.curso = curso;
      participante.semestre = semestre;
      participante.email = usuario.email;
    }
    await participante.save();

    res.json({ mensagem: "Dados complementados com sucesso", usuario, participante });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Listar administradores (somente admin)
router.get('/admins', ensureAdmin, async (req, res) => {
  try {
    const admins = await Usuario.find({ tipo: 'admin' })
      .select('_id nome email createdAt')
      .sort({ createdAt: -1 });

    return res.json({ admins });
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao listar administradores.' });
  }
});

// Status de bootstrap do admin (público)
router.get('/admins/bootstrap-status', async (_req, res) => {
  try {
    const totalAdmins = await Usuario.countDocuments({ tipo: 'admin' });
    return res.json({
      bootstrapEnabled: totalAdmins === 0,
      totalAdmins
    });
  } catch (_error) {
    return res.status(500).json({ erro: 'Erro ao verificar status de bootstrap.' });
  }
});

// Criar administrador
// Regra:
// - Se ainda não existe admin no sistema: permite criar o primeiro admin sem login.
// - Após existir ao menos 1 admin: somente admin autenticado pode criar novos admins.
router.post('/admins', async (req, res) => {
  try {
    const nome = String(req.body?.nome || '').trim();
    const email = sanitizeEmail(req.body?.email);
    const senha = String(req.body?.senha || '').trim();

    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });
    }

    const totalAdmins = await Usuario.countDocuments({ tipo: 'admin' });
    const bootstrapMode = totalAdmins === 0;
    if (!bootstrapMode) {
      const adminOk = await isRequesterAdmin(req);
      if (!adminOk) {
        return res.status(403).json({ erro: 'Acesso restrito aos administradores.' });
      }
    }

    const existente = await Usuario.findOne({ email });
    if (existente) {
      if (existente.tipo !== 'admin') {
        existente.nome = nome || existente.nome;
        existente.tipo = 'admin';
        if (!existente.senha) {
          existente.senha = senha;
        }
        await existente.save();
        return res.status(200).json({
          mensagem: bootstrapMode
            ? 'Primeiro administrador criado com sucesso.'
            : 'Usuário existente promovido para administrador.',
          admin: {
            _id: existente._id,
            nome: existente.nome,
            email: existente.email,
            createdAt: existente.createdAt
          },
          bootstrapUsed: bootstrapMode
        });
      }

      return res.status(409).json({ erro: 'Já existe um administrador com esse e-mail.' });
    }

    const novoAdmin = await Usuario.create({
      nome,
      email,
      senha,
      tipo: 'admin'
    });

    return res.status(201).json({
      mensagem: bootstrapMode
        ? 'Primeiro administrador criado com sucesso.'
        : 'Administrador criado com sucesso.',
      admin: {
        _id: novoAdmin._id,
        nome: novoAdmin.nome,
        email: novoAdmin.email,
        createdAt: novoAdmin.createdAt
      },
      bootstrapUsed: bootstrapMode
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ erro: 'E-mail já cadastrado.' });
    }
    return res.status(500).json({ erro: 'Erro ao criar administrador.' });
  }
});

// Remover administrador (somente admin)
router.delete('/admins/:id', ensureAdmin, async (req, res) => {
  try {
    const adminId = String(req.params?.id || '');
    if (!adminId) {
      return res.status(400).json({ erro: 'ID do administrador é obrigatório.' });
    }

    const requester = await Usuario.findOne({ email: sanitizeEmail(req.user?.email) }).select('_id tipo');
    if (!requester || requester.tipo !== 'admin') {
      return res.status(403).json({ erro: 'Acesso restrito aos administradores.' });
    }

    if (String(requester._id) === adminId) {
      return res.status(400).json({ erro: 'Você não pode remover seu próprio usuário admin.' });
    }

    const totalAdmins = await Usuario.countDocuments({ tipo: 'admin' });
    if (totalAdmins <= 1) {
      return res.status(400).json({ erro: 'Não é possível remover o único administrador.' });
    }

    const alvo = await Usuario.findById(adminId).select('_id tipo');
    if (!alvo || alvo.tipo !== 'admin') {
      return res.status(404).json({ erro: 'Administrador não encontrado.' });
    }

    await Usuario.deleteOne({ _id: adminId });
    return res.json({ mensagem: 'Administrador removido com sucesso.' });
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao remover administrador.' });
  }
});

// Google Login
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.send(`Login realizado! Bem-vindo ${req.user.nome} (${req.user.email}). Agora complete seus dados em /usuarios/completar`);
  }
);

module.exports = router;
