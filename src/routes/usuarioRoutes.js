const express = require("express");
const router = express.Router();
const passport = require("passport");
const Usuario = require("../models/Usuario");
const Participante = require("../models/Participante");

// Cadastro manual
router.post("/cadastro", async (req, res) => {
  try {
    const { nome, ra, email, senha, curso, semestre } = req.body;
    if (!nome || !ra || !email || !senha || !curso || !semestre) {
      return res.status(400).json({ erro: "Todos os campos são obrigatórios." });
    }

    const emailNormalizado = String(email).trim().toLowerCase();

    const usuarioExistente = await Usuario.findOne({ $or: [{ email: emailNormalizado }, { ra }] });
    if (usuarioExistente) return res.status(409).json({ erro: "Usuário já existe." });

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

    req.login({ email: usuario.email, nome: usuario.nome }, (err) => {
      if (err) {
        return res.status(500).json({ sucesso: false, erro: 'Falha ao iniciar sessão.' });
      }

      return res.json({
        sucesso: true,
        mensagem: 'Login realizado com sucesso.',
        usuario: {
          _id: usuario._id,
          nome: usuario.nome,
          email: usuario.email,
          tipo: usuario.tipo || 'aluno'
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

// Google Login
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.send(`Login realizado! Bem-vindo ${req.user.nome} (${req.user.email}). Agora complete seus dados em /usuarios/completar`);
  }
);

module.exports = router;
