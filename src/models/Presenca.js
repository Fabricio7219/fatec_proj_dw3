const mongoose = require('mongoose');

const presencaSchema = new mongoose.Schema({
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    evento: { type: String, required: true },
    horario_entrada: { type: Date, default: Date.now },
    horario_saida: { type: Date, default: null },
    confirmado: { type: Boolean, default: false }
}, {
    timestamps: true
});

const Presenca = mongoose.model('Presenca', presencaSchema);
module.exports = Presenca;
