// Script para criar admin master direto no MongoDB
// Execute: node criar-admin.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const usuarioSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    ra: { type: String, required: false, unique: true, sparse: true },
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: false },
    tipo: { type: String, enum: ['aluno', 'docente', 'admin'], default: 'aluno' },
    curso: { type: String },
    semestre: { type: String },
    pontos: { type: Number, default: 0 },
    ativo: { type: Boolean, default: true }
}, { timestamps: true });

usuarioSchema.pre('save', async function(next) {
    if (!this.isModified('senha') || !this.senha) return next();
    this.senha = await bcrypt.hash(this.senha, 10);
    next();
});

const Usuario = mongoose.model('Usuario', usuarioSchema);

async function criarAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fatecweek');
        console.log('✅ Conectado ao MongoDB');

        // CONFIGURE AQUI OS DADOS DO ADMIN:
        const dadosAdmin = {
            nome: 'Fabricio Admin',
            email: 'fabricionotes.ofc@gmail.com', // TROQUE PELO SEU EMAIL DO GOOGLE
            senha: 'admin123',
            tipo: 'admin',
            curso: 'Não informado',
            semestre: '1º Semestre',
            ativo: true
        };

        // Verifica se já existe
        const existe = await Usuario.findOne({ email: dadosAdmin.email });
        if (existe) {
            console.log('❌ Já existe um usuário com este email:', dadosAdmin.email);
            if (existe.tipo !== 'admin') {
                existe.tipo = 'admin';
                await existe.save();
                console.log('✅ Usuário atualizado para admin!');
            } else {
                console.log('ℹ️ Usuário já é admin');
            }
        } else {
            const admin = new Usuario(dadosAdmin);
            await admin.save();
            console.log('✅ Admin master criado com sucesso!');
            console.log('📧 Email:', dadosAdmin.email);
            console.log('🔑 Senha:', dadosAdmin.senha);
        }

        console.log('\n🎉 Pronto! Agora faça login com Google usando o email:', dadosAdmin.email);
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }
}

criarAdmin();
