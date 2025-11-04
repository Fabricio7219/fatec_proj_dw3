// src/scripts/create-admin.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');

// --- Argument Parsing ---
const args = process.argv.slice(2);
const emailArg = args.find(arg => arg.startsWith('--email='));
const senhaArg = args.find(arg => arg.startsWith('--senha='));

if (!emailArg || !senhaArg) {
    console.error('❌ Erro: Por favor, forneça os argumentos --email e --senha.');
    console.error('Uso: npm run create-admin -- --email="seu-email@exemplo.com" --senha="suaSenha"');
    process.exit(1);
}

const email = emailArg.split('=')[1].replace(/"/g, '');
const senha = senhaArg.split('=')[1].replace(/"/g, '');
const nome = email.split('@')[0]; // Nome padrão a partir do email

if (!email || !senha) {
    console.error('❌ Erro: Email e senha não podem ser vazios.');
    process.exit(1);
}

// --- Database Connection and Admin Creation ---
async function createAdmin() {
    try {
        console.log('⏳ Conectando ao MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado ao MongoDB com sucesso!');

        const existingUser = await Usuario.findOne({ email });

        if (existingUser) {
            console.log(`🟡 Usuário com o email "${email}" já existe.`);
            existingUser.tipo = 'admin';
            existingUser.senha = senha; // O hook pre-save no model vai hashear
            await existingUser.save();
            console.log(`✅ Usuário "${email}" promovido/atualizado para admin com sucesso!`);
        } else {
            console.log(`✨ Criando novo admin com o email "${email}"...`);
            await Usuario.create({
                nome,
                email,
                senha, // O hook pre-save vai hashear
                tipo: 'admin'
            });
            console.log(`✅ Novo admin "${email}" criado com sucesso!`);
        }

    } catch (error) {
        console.error('❌ Ocorreu um erro durante a operação:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Conexão com o MongoDB fechada.');
    }
}

createAdmin();
