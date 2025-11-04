const mongoose = require('mongoose');

const pontuacaoSchema = new mongoose.Schema({
  participanteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participante', required: true },
  tipo: { type: String, enum: ['palestra', 'voluntario'], required: true },
  valor: { type: Number, required: true },
  palestraId: { type: mongoose.Schema.Types.ObjectId, ref: 'Palestra' },
  motivo: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Pontuacao', pontuacaoSchema);
