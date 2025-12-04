const express = require('express');
const router = express.Router();
const ensureDocenteOuAdmin = require('../middleware/ensureDocenteOuAdmin');
const Participante = require('../models/Participante');
const { creditPoints } = require('../utils/points');

// POST /api/pontos/voluntario -> creditar pontos de voluntariado (padrão 1.0)
router.post('/voluntario', ensureDocenteOuAdmin, async (req, res) => {
  try {
    const { participanteId, ra, valor, motivo } = req.body || {};
    let participante = null;
    if (participanteId) {
      participante = await Participante.findById(participanteId);
    } else if (ra) {
      participante = await Participante.findOne({ ra });
    }
    if (!participante) return res.status(404).json({ sucesso: false, erro: 'Participante não encontrado' });

    const credit = Math.min(1, Math.max(0, Number(valor != null ? valor : 1)));
    const result = await creditPoints({ participanteId: participante._id, valor: credit, tipo: 'voluntario', motivo });

    return res.json({
      sucesso: true,
      mensagem: 'Pontos de voluntariado creditados',
      dados: {
        participanteId: participante._id,
        pontos_total: result.participante.pontos_total,
        creditado: result.log?.valor ?? credit
      }
    });
  } catch (err) {
    console.error('Erro em POST /pontos/voluntario:', err);
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
});

module.exports = router;
