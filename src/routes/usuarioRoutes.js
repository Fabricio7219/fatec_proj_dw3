const express = require("express");
const router = express.Router();
const passport = require("passport");
const Usuario = require("../models/Usuario");
const Participante = require("../models/Participante");
const ensureAdmin = require('../middleware/ensureAdmin');

// Cadastro manual
router.post("/cadastro", async (req, res) => {
  try {
    const { nome, ra, email, senha, curso, semestre } = req.body;
    if (!nome || !ra || !email || !senha || !curso || !semestre) {
      return res.status(400).json({ erro: "Todos os campos são obrigatórios." });
    }

    const usuarioExistente = await Usuario.findOne({ $or: [{ email }, { ra }] });
    if (usuarioExistente) return res.status(409).json({ erro: "Usuário já existe." });

    const novoUsuario = new Usuario({ nome, ra, email, senha, curso, semestre });
    await novoUsuario.save();

    const novoParticipante = new Participante({ ra, nome, curso, semestre, email, usuarioId: novoUsuario._id });
    await novoParticipante.save();

    res.status(201).json({ mensagem: "Usuário cadastrado com sucesso", usuario: novoUsuario, participante: novoParticipante });
  } catch (error) {
    res.status(500).json({ erro: error.message });
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

    // req.user pode ser um objeto unificado { email, nome, tipo, data }
    // Tentamos encontrar o usuário por _id (data._id) ou por email como fallback
    let usuario;
    if (req.user.data && req.user.data._id) {
      usuario = await Usuario.findById(req.user.data._id);
    } else if (req.user._id) {
      usuario = await Usuario.findById(req.user._id);
    } else if (req.user.email) {
      usuario = await Usuario.findOne({ email: req.user.email });
    }
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado para completar dados.' });
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

// Admin management
router.get("/admins", ensureAdmin, async (req, res) => {
  try {
    const admins = await Usuario.find({ tipo: "admin" }).select("-senha").sort({ nome: 1 });
    res.json({ sucesso: true, admins });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

router.post("/admins", ensureAdmin, async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ sucesso: false, erro: "Nome, email e senha são obrigatórios." });
    }

    const existe = await Usuario.findOne({ email });
    if (existe) {
      return res.status(409).json({ sucesso: false, erro: "Email já cadastrado." });
    }

    const admin = new Usuario({ nome, email, senha, tipo: "admin", ativo: true, curso: "Não informado", semestre: "1º Semestre" });
    await admin.save();

    const dados = admin.toObject();
    delete dados.senha;

    res.status(201).json({ sucesso: true, admin: dados });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

router.delete("/admins/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ sucesso: false, erro: "ID obrigatório." });

    const totalAdmins = await Usuario.countDocuments({ tipo: "admin" });
    if (totalAdmins <= 1) {
      return res.status(400).json({ sucesso: false, erro: "Não é possível remover o último administrador." });
    }

    if (req.user?.data?._id?.toString() === id) {
      return res.status(400).json({ sucesso: false, erro: "Não é possível remover o próprio acesso." });
    }

    const removido = await Usuario.findOneAndDelete({ _id: id, tipo: "admin" });
    if (!removido) {
      return res.status(404).json({ sucesso: false, erro: "Administrador não encontrado." });
    }

    res.json({ sucesso: true, mensagem: "Administrador removido." });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

// Bootstrap: cria primeiro administrador quando ainda não existe nenhum (usa chave secreta)
router.post("/admins/bootstrap", async (req, res) => {
  try {
    const { nome, email, senha, chave } = req.body;
    if (!nome || !email || !senha || !chave) {
      return res.status(400).json({ sucesso: false, erro: "Nome, email, senha e chave são obrigatórios." });
    }

    if (!process.env.ADMIN_BOOTSTRAP_KEY) {
      return res.status(500).json({ sucesso: false, erro: "Variável ADMIN_BOOTSTRAP_KEY não configurada." });
    }

    if (chave !== process.env.ADMIN_BOOTSTRAP_KEY) {
      return res.status(403).json({ sucesso: false, erro: "Chave inválida." });
    }

    const existeAdmin = await Usuario.exists({ tipo: "admin" });
    if (existeAdmin) {
      return res.status(409).json({ sucesso: false, erro: "Já existe administrador cadastrado. Use /api/usuarios/admins." });
    }

    const existeEmail = await Usuario.findOne({ email });
    if (existeEmail) {
      return res.status(409).json({ sucesso: false, erro: "Já existe um usuário com este email." });
    }

    const admin = new Usuario({ nome, email, senha, tipo: "admin", ativo: true, curso: "Não informado", semestre: "1º Semestre" });
    await admin.save();

    const dados = admin.toObject();
    delete dados.senha;

    res.status(201).json({ sucesso: true, mensagem: "Administrador master criado com sucesso", admin: dados });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

module.exports = router;
