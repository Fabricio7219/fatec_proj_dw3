// src/controllers/docenteController.js
const docenteRepository = require("../repositories/DocenteRepository");

exports.listar = async (req, res) => {
  try {
    const docentes = await docenteRepository.listarTodos();
    res.json(docentes);
  } catch (err) {
    console.error("❌ Erro listar docentes:", err);
    res.status(500).json({ erro: "Erro ao listar docentes." });
  }
};

exports.buscarPorEmail = async (req, res) => {
  try {
    const docente = await docenteRepository.buscarPorEmail(req.params.email);
    if (!docente) return res.status(404).json({ erro: "Docente não encontrado" });
    res.json(docente);
  } catch (err) {
    console.error("❌ Erro buscar docente:", err);
    res.status(500).json({ erro: "Erro ao buscar docente." });
  }
};

exports.criar = async (req, res) => {
  try {
    const novo = await docenteRepository.criar(req.body);
    res.status(201).json({ mensagem: "Docente cadastrado!", docente: novo });
  } catch (err) {
    console.error("❌ Erro criar docente:", err);
    res.status(500).json({ erro: "Erro ao cadastrar docente." });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const atualizado = await docenteRepository.atualizar(req.params.id, req.body);
    res.json({ mensagem: "Docente atualizado!", docente: atualizado });
  } catch (err) {
    console.error("❌ Erro atualizar docente:", err);
    res.status(500).json({ erro: "Erro ao atualizar docente." });
  }
};

exports.remover = async (req, res) => {
  try {
    await docenteRepository.remover(req.params.id);
    res.json({ mensagem: "Docente removido com sucesso!" });
  } catch (err) {
    console.error("❌ Erro remover docente:", err);
    res.status(500).json({ erro: "Erro ao remover docente." });
  }
};
