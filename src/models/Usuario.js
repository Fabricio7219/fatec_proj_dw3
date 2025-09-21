const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const usuarioSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    ra: { type: String, required: false, unique: true, sparse: true },
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
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
    pontos: { type: Number, default: 0 },
    ativo: { type: Boolean, default: true }
}, { timestamps: true });

usuarioSchema.pre('save', async function(next) {
    if (!this.isModified('senha')) return next();
    this.senha = await bcrypt.hash(this.senha, 10);
    next();
});

usuarioSchema.methods.verificarSenha = async function(senha) {
    return await bcrypt.compare(senha, this.senha);
};

const Usuario = mongoose.model('Usuario', usuarioSchema);
module.exports = Usuario;
