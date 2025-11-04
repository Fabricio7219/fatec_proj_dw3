const mongoose = require('mongoose');

const inscricaoSchema = new mongoose.Schema({
  participanteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participante', required: true },
  palestraId: { type: String, required: true }, // pode ser string ou ObjectId dependendo do modelo de palestra
  status: { type: String, enum: ['pendente', 'confirmado', 'cancelado'], default: 'pendente' },
}, { timestamps: true });

const Inscricao = mongoose.model('Inscricao', inscricaoSchema);
module.exports = Inscricao;
