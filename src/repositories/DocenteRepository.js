// src/repositories/DocenteRepository.js
const Docente = require("../models/Docente");

class DocenteRepository {
  // 🔍 Buscar todos os docentes
  async listarTodos() {
    try {
      return await Docente.find().sort({ nome: 1 });
    } catch (err) {
      console.error("Erro ao listar docentes (Repository):", err);
      throw new Error("Erro ao buscar docentes no banco de dados.");
    }
  }

  // 🔍 Buscar docente por e-mail
  async buscarPorEmail(email) {
    try {
      return await Docente.findOne({ email });
    } catch (err) {
      console.error("Erro ao buscar docente por e-mail:", err);
      throw new Error("Erro na busca por e-mail.");
    }
  }

  // ➕ Cadastrar novo docente
  async criar(dadosDocente) {
    try {
      const novoDocente = new Docente(dadosDocente);
      return await novoDocente.save();
    } catch (err) {
      console.error("Erro ao criar docente:", err);
      throw new Error("Erro ao cadastrar docente no banco.");
    }
  }

  // ✏️ Atualizar docente
  async atualizar(id, dados) {
    try {
      return await Docente.findByIdAndUpdate(id, dados, { new: true });
    } catch (err) {
      console.error("Erro ao atualizar docente:", err);
      throw new Error("Erro ao atualizar docente no banco.");
    }
  }

  // 🗑️ Remover docente
  async remover(id) {
    try {
      return await Docente.findByIdAndDelete(id);
    } catch (err) {
      console.error("Erro ao remover docente:", err);
      throw new Error("Erro ao remover docente do banco.");
    }
  }
}

module.exports = new DocenteRepository();
