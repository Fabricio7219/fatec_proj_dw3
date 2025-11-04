const express = require('express');
const router = express.Router();
const ensureDocenteOuAdmin = require('../middleware/ensureDocenteOuAdmin');
const Participante = require('../models/Participante');
const Pontuacao = require('../models/Pontuacao');

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
    participante.pontos_total = Number(participante.pontos_total || 0) + credit;
    await participante.save();

    try {
      await Pontuacao.create({ participanteId: participante._id, tipo: 'voluntario', valor: credit, motivo });
    } catch (e) { console.warn('Falha ao registrar Pontuacao (voluntario):', e?.message); }

    return res.json({ sucesso: true, mensagem: 'Pontos de voluntariado creditados', dados: { participanteId: participante._id, pontos_total: participante.pontos_total, creditado: credit } });
  } catch (err) {
    console.error('Erro em POST /pontos/voluntario:', err);
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
});

module.exports = router;
