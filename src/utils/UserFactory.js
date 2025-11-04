// src/utils/UserFactory.js
// Padrão Criacional - Factory para normalizar/produzir objetos de usuário

function buildFromUsuario(usuarioDoc) {
  if (!usuarioDoc) return null;
  return {
    tipo: usuarioDoc.tipo || 'usuario',
    usuarioId: usuarioDoc._id,
    nome: usuarioDoc.nome,
    email: usuarioDoc.email,
    ra: usuarioDoc.ra,
    data: usuarioDoc
  };
}

function buildFromParticipante(partDoc) {
  if (!partDoc) return null;
  return {
    tipo: 'participante',
    participanteId: partDoc._id,
    nome: partDoc.nome,
    email: partDoc.email,
    ra: partDoc.ra,
    curso: partDoc.curso,
    semestre: partDoc.semestre,
    data: partDoc
  };
}

function buildFromDocente(docenteDoc) {
  if (!docenteDoc) return null;
  return {
    tipo: 'docente',
    docenteId: docenteDoc._id,
    nome: docenteDoc.nome || docenteDoc.email,
    email: docenteDoc.email,
    data: docenteDoc
  };
}

module.exports = {
  buildFromUsuario,
  buildFromParticipante,
  buildFromDocente
};
