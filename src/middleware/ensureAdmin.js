const Usuario = require('../models/Usuario');

function getFixedAdminEmails() {
  return String(process.env.ADMIN_FIXED_ADMINS || '')
    .split(',')
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);
}

module.exports = async function ensureAdmin(req, res, next) {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ erro: 'Não autenticado' });
    }

    const reqEmail = String(req.user.email || '').trim().toLowerCase();
    const fixedAdmins = getFixedAdminEmails();
    if (fixedAdmins.includes(reqEmail)) {
      req.user.tipo = 'admin';
      return next();
    }

    // Se sessão já marcou como admin
    if (req.user.tipo === 'admin') {
      return next();
    }

    // Busca no banco para confirmar
    const usuario = await Usuario.findOne({ email: reqEmail }).select('tipo');
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