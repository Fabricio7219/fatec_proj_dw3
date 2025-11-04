const mongoose = require("mongoose");

const docenteSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  fatec: { type: String, required: true },
  cursos: [{ type: String, required: true }],
  tipo: { type: String, default: "docente" },
  dataRegistro: { type: Date, default: Date.now }
});

const Docente = mongoose.model("Docente", docenteSchema);
module.exports = Docente;
