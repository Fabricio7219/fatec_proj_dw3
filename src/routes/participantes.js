const express = require('express');
const router = express.Router();
const Participante = require('../models/Participante');

// Listar todos os participantes
router.get('/', async (req, res) => {
  try {
    const participantes = await Participante.find().sort({ nome: 1 });
    res.json({ sucesso: true, participantes });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

// Buscar participante por RA
router.get('/:ra', async (req, res) => {
  try {
    const participante = await Participante.findOne({ ra: req.params.ra });
    if (!participante) {
      return res.status(404).json({ sucesso: false, erro: 'Participante não encontrado' });
    }
    res.json({ sucesso: true, participante });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

// Criar novo participante
router.post('/', async (req, res) => {
  try {
    const participante = new Participante(req.body);
    await participante.save();
    res.status(201).json({ sucesso: true, participante });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

// Atualizar participante
router.put('/:ra', async (req, res) => {
  try {
    const participante = await Participante.findOneAndUpdate(
      { ra: req.params.ra },
      req.body,
      { new: true }
    );
    if (!participante) {
      return res.status(404).json({ sucesso: false, erro: 'Participante não encontrado' });
    }
    res.json({ sucesso: true, participante });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

// Deletar participante
router.delete('/:ra', async (req, res) => {
  try {
    const participante = await Participante.findOneAndDelete({ ra: req.params.ra });
    if (!participante) {
      return res.status(404).json({ sucesso: false, erro: 'Participante não encontrado' });
    }
    res.json({ sucesso: true, mensagem: 'Participante removido com sucesso' });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

// Estatísticas por curso + semestre
router.get("/estatisticas/curso-semestre", async (req, res) => {
  try {
    const estatisticas = await Participante.contarPorCursoSemestre();
    res.json({
      sucesso: true,
      total_grupos: estatisticas.length,
      dados: estatisticas.map(e => ({
        curso: e._id.curso,
        semestre: e._id.semestre,
        total: e.total
      }))
    });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

module.exports = router;
