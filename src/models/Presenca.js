const mongoose = require('mongoose');

const presencaSchema = new mongoose.Schema({
    participanteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participante', required: true },
    palestraId: { type: mongoose.Schema.Types.ObjectId, ref: 'Palestra', required: true },
    horario_entrada: { type: Date, default: Date.now },
    horario_saida: { type: Date, default: null },
    duracaoMinutos: { type: Number, default: 0 },
    certificadoEnviado: { type: Boolean, default: false },
    certificadoPath: { type: String, default: null },
    pontosCreditados: { type: Boolean, default: false },
    pontosValorAplicado: { type: Number, default: 0 },
    localizacao_entrada: {
        type: {
            lat: { type: Number },
            lng: { type: Number },
            timestamp: { type: Date }
        }
    },
    localizacao_saida: {
        type: {
            lat: { type: Number },
            lng: { type: Number },
            timestamp: { type: Date }
        }
    },
    dentro_perimetro: { type: Boolean, default: false }
}, {
    timestamps: true
});

presencaSchema.index({ participanteId: 1, palestraId: 1, horario_entrada: 1 });

const Presenca = mongoose.model('Presenca', presencaSchema);
module.exports = Presenca;
