const mongoose = require('mongoose');

const participanteSchema = new mongoose.Schema({
    ra: { type: String, required: true, unique: true },
    nome: { type: String, required: true },
    curso: { type: String, enum: [
        "Automação Industrial",
        "Desenvolvimento de Software Multiplataforma",
        "Gestão Empresarial (EaD)",
        "Gestão Financeira",
        "Manutenção Industrial",
        "Redes de Computadores",
        "Sistemas Biomédicos",
        "Não informado"
    ], default: "Não informado" },
    semestre: { type: String, enum: [
        "1º Semestre",
        "2º Semestre",
        "3º Semestre",
        "4º Semestre",
        "5º Semestre",
        "6º Semestre"
    ], default: "1º Semestre" },
    email: { type: String },
    presente: { type: Boolean, default: false },
    horario_entrada: { type: Date, default: null },
    horario_saida: { type: Date, default: null },
    tempo_total_minutos: { type: Number, default: 0 },
    ativo: { type: Boolean, default: true },
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" }
}, { timestamps: true });

// Métodos auxiliares
participanteSchema.statics.buscarPorRA = async function(ra) {
    return await this.findOne({ ra, ativo: true });
};
participanteSchema.statics.listarAtivos = async function() {
    return await this.find({ ativo: true });
};
participanteSchema.statics.listarPresentes = async function() {
    return await this.find({ presente: true, ativo: true });
};
participanteSchema.statics.buscarPorCurso = async function(curso) {
    return await this.find({ curso, ativo: true });
};

// Contar por curso + semestre
participanteSchema.statics.contarPorCursoSemestre = async function() {
    return await this.aggregate([
        { $match: { ativo: true } },
        { $group: { _id: { curso: "$curso", semestre: "$semestre" }, total: { $sum: 1 } } },
        { $sort: { "_id.curso": 1, "_id.semestre": 1 } }
    ]);
};

const Participante = mongoose.model('Participante', participanteSchema);
module.exports = Participante;
