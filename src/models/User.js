const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  nome: String,
  email: { type: String, required: true, unique: true },
  tipo: { type: String, enum: ["aluno", "docente", "admin", "pendente"], default: "pendente" },
  ra: String,
  curso: String,
  criadoEm: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
