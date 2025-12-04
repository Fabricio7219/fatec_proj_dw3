const mongoose = require('mongoose');

const participanteSchema = new mongoose.Schema({
  ra: { type: String, required: true, unique: true },
  nome: { type: String, required: true },
  curso: {
    type: String,
    enum: [
      "Automação Industrial",
      "Desenvolvimento de Software Multiplataforma",
      "Gestão Empresarial (EaD)",
      "Gestão Financeira",
      "Manutenção Industrial",
      "Redes de Computadores",
      "Sistemas Biomédicos",
      "Não informado"
    ],
    default: "Não informado"
  },
  semestre: {
    type: String,
    enum: [
      "1º Semestre",
      "2º Semestre",
      "3º Semestre",
      "4º Semestre",
      "5º Semestre",
      "6º Semestre"
    ],
    default: "1º Semestre"
  },
  fatec: {
    type: String,
    enum: [
      "Fatec Osasco",
      "Fatec São Paulo",
      "Fatec Barueri",
      "Fatec Carapicuíba",
      "Fatec Cotia",
      "Fatec Zona Leste",
      "Fatec Itaquera",
      "Outra"
    ],
    default: "Fatec Osasco"
  },
  email: { type: String, required: true, lowercase: true, trim: true },
  presente: { type: Boolean, default: false },
  horario_entrada: { type: Date, default: null },
  horario_saida: { type: Date, default: null },
  tempo_total_minutos: { type: Number, default: 0 },
  // Pontuação acumulada por atividades/presenças (para somar à nota)
  pontos_total: { type: Number, default: 0 },
  ultimaPontuacaoEm: { type: Date },
  cadastroCompletoEm: { type: Date },
  ultimaSincronizacao: { type: Date },
  ativo: { type: Boolean, default: true },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" }
}, { timestamps: true });

participanteSchema.index({ email: 1 }, { unique: true });
participanteSchema.index({ usuarioId: 1 }, { sparse: true });

// 📘 Métodos auxiliares
participanteSchema.statics.buscarPorRA = async function (ra) {
  return await this.findOne({ ra, ativo: true });
};

participanteSchema.statics.listarAtivos = async function () {
  return await this.find({ ativo: true });
};

participanteSchema.statics.listarPresentes = async function () {
  return await this.find({ presente: true, ativo: true });
};

participanteSchema.statics.buscarPorCurso = async function (curso) {
  return await this.find({ curso, ativo: true });
};

// 📊 Contagem por curso + semestre + fatec
participanteSchema.statics.contarPorCursoSemestreFatec = async function () {
  return await this.aggregate([
    { $match: { ativo: true } },
    {
      $group: {
        _id: { curso: "$curso", semestre: "$semestre", fatec: "$fatec" },
        total: { $sum: 1 }
      }
    },
    { $sort: { "_id.fatec": 1, "_id.curso": 1, "_id.semestre": 1 } }
  ]);
};

const Participante = mongoose.model('Participante', participanteSchema);
module.exports = Participante;
