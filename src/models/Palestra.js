const mongoose = require('mongoose');

const palestraSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    descricao: { type: String },
    data: { type: Date, required: true },
    duracao_minutos: { type: Number, required: true },
    palestrante: { type: String, required: true },
    local: { type: String, required: true },
    tipo: { type: String, enum: ['palestra','exposicao'], default: 'palestra' },
    vagas: { type: Number, default: 0 },
    pontos: { type: Number, default: 0 }, // Pontos definidos pelo administrador para esta palestra
    qr_code: { type: String }, // DataURL do QR code (imagem)
    qr_url: { type: String },  // URL embutida no QR para fluxo de escaneamento
    // Localização simples (lat/lng). Não usamos GeoJSON aqui para evitar erros de índice.
    localizacao: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 },
        raio_metros: { type: Number, default: 50 } // Tolerância em metros
    },
    status: {
        type: String,
        enum: ['agendada', 'em_andamento', 'finalizada', 'cancelada'],
        default: 'agendada'
    }
}, {
    timestamps: true
});

// Removido índice 2dsphere incorreto (exigia GeoJSON e derrubava o servidor na criação)

const Palestra = mongoose.model('Palestra', palestraSchema);
module.exports = Palestra;