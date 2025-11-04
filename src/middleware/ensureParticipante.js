// src/middleware/ensureParticipante.js
// Middleware para garantir que exista um Participante vinculado ao usuário autenticado

const Participante = require('../models/Participante');

module.exports = async function ensureParticipante(req, res, next) {
  try {
    // Se já informaram participanteId no corpo, aceite
    if (req.body && req.body.participanteId) {
      return next();
    }

    // Se for passado via query (GET), também aceite
    if (req.query && req.query.participanteId) {
      if (!req.body) req.body = {};
      req.body.participanteId = req.query.participanteId;
      return next();
    }

    // Tentar inferir a partir de req.user
    const user = req.user;
    if (!user || !user.email) {
      return res.status(401).json({ sucesso: false, erro: 'Usuário não autenticado. Faça login.' });
    }

    // Se o próprio deserialize já trouxe um participante, use-o
    if (user.origem === 'participante' && user.data && user.data._id) {
      req.participante = user.data; // doc
      if (!req.body) req.body = {};
      req.body.participanteId = user.data._id;
      return next();
    }

    // Tentar procurar Participante por usuarioId (usuário local) ou email
    const participante = await Participante.findOne({ $or: [{ usuarioId: user.data?._id }, { email: user.email }] });
    if (participante) {
      req.participante = participante;
      if (!req.body) req.body = {};
      req.body.participanteId = participante._id;
      return next();
    }

    // Não encontrou — responder com instrução para completar perfil
    return res.status(400).json({ 
      sucesso: false, 
      erro: 'Nenhum participante vinculado encontrado. Complete seu perfil em /completar-perfil.html ou forneça participanteId.'
    });
  } catch (err) {
    console.error('Erro middleware ensureParticipante:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno ao validar participante' });
  }
};
