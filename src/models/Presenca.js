const mongoose = require('mongoose');

const presencaSchema = new mongoose.Schema({
    participanteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participante', required: true },
    palestraId: { type: String, required: true },
    horario_entrada: { type: Date, default: Date.now },
    horario_saida: { type: Date, default: null },
    duracaoMinutos: { type: Number, default: 0 },
    certificadoEnviado: { type: Boolean, default: false },
    certificadoPath: { type: String, default: null },
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

const Presenca = mongoose.model('Presenca', presencaSchema);
module.exports = Presenca;
