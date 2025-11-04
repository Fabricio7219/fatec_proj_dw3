const express = require('express');
const router = express.Router();
const Inscricao = require('../models/Inscricao');
const Participante = require('../models/Participante');

// Criar inscrição (usuário autenticado ou informar participanteId/email)
const ensureParticipante = require('../middleware/ensureParticipante');
router.post('/', ensureParticipante, async (req, res) => {
  try {
    const { palestraId } = req.body;
    if (!palestraId) return res.status(400).json({ erro: 'palestraId é obrigatório' });

    // participanteId será injetado pelo middleware se possível
    const pid = req.body.participanteId;
    if (!pid) return res.status(400).json({ erro: 'participanteId necessário (ou autentique-se)' });

    const existente = await Inscricao.findOne({ participanteId: pid, palestraId });
    if (existente) return res.status(409).json({ erro: 'Já inscrito nesta palestra' });

    const ins = await Inscricao.create({ participanteId: pid, palestraId, status: 'confirmado' });
    res.json({ mensagem: 'Inscrição criada', inscricao: ins });
  } catch (err) {
    console.error('Erro em /inscricoes POST:', err);
    res.status(500).json({ erro: 'Erro ao criar inscrição' });
  }
});

// Listar inscrições do participante (ou todas se admin/docente)
router.get('/', async (req, res) => {
  try {
    // Se fornecer participanteId via query, filtra
    const participanteId = req.query.participanteId;
    let filtro = {};
    if (participanteId) filtro.participanteId = participanteId;
    else if (req.user && req.user.email) {
      const participante = await Participante.findOne({ $or: [{ usuarioId: req.user.data?._id }, { email: req.user.email }] });
      if (participante) filtro.participanteId = participante._id;
    }

    const lista = await Inscricao.find(filtro).sort({ createdAt: -1 });
    res.json({ total: lista.length, dados: lista });
  } catch (err) {
    console.error('Erro em /inscricoes GET:', err);
    res.status(500).json({ erro: 'Erro ao listar inscrições' });
  }
});

// Cancelar inscrição
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const inscr = await Inscricao.findById(id);
    if (!inscr) return res.status(404).json({ erro: 'Inscrição não encontrada' });

    inscr.status = 'cancelado';
    await inscr.save();
    res.json({ mensagem: 'Inscrição cancelada' });
  } catch (err) {
    console.error('Erro em /inscricoes DELETE:', err);
    res.status(500).json({ erro: 'Erro ao cancelar inscrição' });
  }
});

module.exports = router;
