const express = require('express');
const router = express.Router();
const Participante = require('../models/Participante');

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
