const Participante = require('../models/Participante');
const Pontuacao = require('../models/Pontuacao');

/**
 * Centraliza a lógica de crédito de pontos para garantir persistência consistente e logging.
 * @param {Object} params
 * @param {string|import('mongoose').Types.ObjectId} params.participanteId
 * @param {number} params.valor
 * @param {('palestra'|'voluntario')} params.tipo
 * @param {string|import('mongoose').Types.ObjectId} [params.palestraId]
 * @param {string} [params.motivo]
 * @returns {Promise<{participante: any, log: any}>}
 */
async function creditPoints({ participanteId, valor, tipo, palestraId, motivo }) {
  const quantidade = Number(valor);
  if (!participanteId) throw new Error('participanteId é obrigatório para crédito de pontos');
  if (!quantidade || Number.isNaN(quantidade)) throw new Error('Valor inválido para crédito de pontos');
  if (quantidade <= 0) throw new Error('Valor de pontos precisa ser positivo');

  const participante = await Participante.findByIdAndUpdate(
    participanteId,
    {
      $inc: { pontos_total: quantidade },
      $set: { ultimaPontuacaoEm: new Date() }
    },
    { new: true }
  );

  if (!participante) throw new Error('Participante não encontrado para crédito de pontos');

  const log = await Pontuacao.create({
    participanteId: participante._id,
    tipo,
    valor: quantidade,
    palestraId,
    motivo
  });

  return { participante, log };
}

module.exports = { creditPoints };
