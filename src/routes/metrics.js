const express = require('express');
const router = express.Router();

const Participante = require('../models/Participante');
const Usuario = require('../models/Usuario');
const Palestra = require('../models/Palestra');
const Inscricao = require('../models/Inscricao');
const Presenca = require('../models/Presenca');
const Pontuacao = require('../models/Pontuacao');

function getDayWindow(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

router.get('/resumo', async (req, res) => {
  try {
    const agora = new Date();
    const { start: inicioDia, end: fimDia } = getDayWindow(agora);

    const [
      totalUsuarios,
      totalParticipantes,
      totalPalestras,
      totalInscricoesAtivas,
      totalPresencas,
      pontosAggregate,
      presencasHoje,
      pontosHojeAggregate
    ] = await Promise.all([
      Usuario.countDocuments(),
      Participante.countDocuments(),
      Palestra.countDocuments(),
      Inscricao.countDocuments({ status: { $ne: 'cancelado' } }),
      Presenca.countDocuments(),
      Pontuacao.aggregate([
        { $group: { _id: null, total: { $sum: '$valor' } } }
      ]),
      Presenca.countDocuments({
        horario_entrada: { $gte: inicioDia, $lt: fimDia }
      }),
      Pontuacao.aggregate([
        { $match: { createdAt: { $gte: inicioDia, $lt: fimDia } } },
        { $group: { _id: null, total: { $sum: '$valor' } } }
      ])
    ]);

    const totalPontos = pontosAggregate[0]?.total || 0;
    const pontosHoje = pontosHojeAggregate[0]?.total || 0;

    res.json({
      atualizadoEm: agora,
      totais: {
        usuarios: totalUsuarios,
        participantes: totalParticipantes,
        palestras: totalPalestras,
        inscricoesAtivas: totalInscricoesAtivas,
        presencasRegistradas: totalPresencas,
        pontosConcedidos: totalPontos
      },
      hoje: {
        presencas: presencasHoje,
        pontosConcedidos: pontosHoje
      }
    });
  } catch (error) {
    console.error('Erro em /api/metrics/resumo:', error);
    res.status(500).json({ erro: 'Não foi possível gerar o resumo de métricas' });
  }
});

module.exports = router;
