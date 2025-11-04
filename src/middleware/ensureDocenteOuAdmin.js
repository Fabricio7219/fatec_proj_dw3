const Usuario = require('../models/Usuario');

module.exports = async function ensureDocenteOuAdmin(req, res, next) {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ erro: 'Não autenticado' });
    }

    const tipoAtual = req.user.tipo;
    if (tipoAtual === 'admin' || tipoAtual === 'docente') {
      return next();
    }

    const usuario = await Usuario.findOne({ email: req.user.email }).select('tipo');
    if (usuario && (usuario.tipo === 'admin' || usuario.tipo === 'docente')) {
      req.user.tipo = usuario.tipo;
      return next();
    }

    return res.status(403).json({ erro: 'Acesso restrito' });
  } catch (error) {
    console.error('Erro no ensureDocenteOuAdmin:', error);
    return res.status(500).json({ erro: 'Erro ao validar permissão' });
  }
};
