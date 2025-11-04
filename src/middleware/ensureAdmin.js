const Usuario = require('../models/Usuario');

module.exports = async function ensureAdmin(req, res, next) {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ erro: 'Não autenticado' });
    }

    // Se sessão já marcou como admin
    if (req.user.tipo === 'admin') {
      return next();
    }

    // Busca no banco para confirmar
    const usuario = await Usuario.findOne({ email: req.user.email }).select('tipo');
    if (usuario && usuario.tipo === 'admin') {
      req.user.tipo = 'admin';
      return next();
    }

    return res.status(403).json({ erro: 'Acesso restrito aos administradores' });
  } catch (error) {
    console.error('Erro no ensureAdmin:', error);
    return res.status(500).json({ erro: 'Erro ao validar permissão' });
  }
};