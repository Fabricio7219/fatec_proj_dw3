require('dotenv').config();
const mongoose = require('mongoose');
const Docente = require('../models/Docente');
const Participante = require('../models/Participante');
const Usuario = require('../models/Usuario');

async function convert() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Conectado ao MongoDB');

        const docentes = await Docente.find({});
        console.log(`Encontrados ${docentes.length} docentes.`);

        for (const doc of docentes) {
            // Verifica se já existe participante com esse email
            let part = await Participante.findOne({ email: doc.email });
            if (!part) {
                console.log(`Criando participante para docente: ${doc.nome}`);
                part = await Participante.create({
                    nome: doc.nome,
                    email: doc.email,
                    ra: 'DOCENTE', // RA fictício ou vazio
                    curso: 'Docente',
                    semestre: 'N/A',
                    periodo: 'N/A',
                    campus: doc.fatec || 'Não informado'
                });
            } else {
                console.log(`Participante já existe para: ${doc.nome}`);
            }

            // Verifica se existe Usuario
            let user = await Usuario.findOne({ email: doc.email });
            if (!user) {
                console.log(`Criando usuário para docente: ${doc.nome}`);
                user = await Usuario.create({
                    nome: doc.nome,
                    email: doc.email,
                    tipo: 'docente',
                    participanteId: part._id
                });
            } else {
                if (user.tipo !== 'docente') {
                    console.log(`Atualizando usuário ${doc.nome} para tipo docente`);
                    user.tipo = 'docente';
                    await user.save();
                }
            }
        }

        console.log('Conversão concluída.');
        process.exit(0);
    } catch (error) {
        console.error('Erro:', error);
        process.exit(1);
    }
}

convert();
