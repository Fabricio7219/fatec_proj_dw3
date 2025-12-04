const express = require('express');
const router = express.Router();

const Participante = require('../models/Participante');
const Palestra = require('../models/Palestra');
const Presenca = require('../models/Presenca');
const Pontuacao = require('../models/Pontuacao');

function diaCorrenteJanela(data) {
  const inicio = new Date(data);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(data);
  fim.setHours(23, 59, 59, 999);
  return { inicio, fim };
}

router.get('/overview', async (_req, res) => {
  try {
    const agora = new Date();
    const { inicio, fim } = diaCorrenteJanela(agora);

    const [
      totalParticipantes,
      totalPalestras,
      totalPontuacao,
      presencasHoje,
      proximasPalestras
    ] = await Promise.all([
      Participante.countDocuments(),
      Palestra.countDocuments({ status: { $ne: 'cancelada' } }),
      Pontuacao.aggregate([
        { $group: { _id: null, total: { $sum: '$valor' } } }
      ]),
      Presenca.countDocuments({ horario_entrada: { $gte: inicio, $lt: fim } }),
      Palestra.find({ data: { $gte: agora }, status: { $in: ['agendada', 'em_andamento'] } })
        .sort({ data: 1 })
        .limit(3)
        .select('titulo data local tipo vagas pontos')
        .lean()
    ]);

    const totalPontos = totalPontuacao[0]?.total || 0;

    res.json({
      atualizadoEm: agora,
      stats: {
        participantes: totalParticipantes,
        palestrasAtivas: totalPalestras,
        presencasHoje,
        pontosDistribuidos: totalPontos
      },
      proximasPalestras: proximasPalestras.map((palestra) => ({
        id: palestra._id,
        titulo: palestra.titulo,
        data: palestra.data,
        local: palestra.local,
        tipo: palestra.tipo,
        vagas: palestra.vagas,
        pontos: palestra.pontos
      }))
    });
  } catch (error) {
    console.error('Erro em /api/public/overview:', error);
    res.status(500).json({ erro: 'Não foi possível acessar o painel público agora' });
  }
});

module.exports = router;
