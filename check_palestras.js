
const mongoose = require('mongoose');
require('dotenv').config();
const Palestra = require('./src/models/Palestra');

async function checkPalestras() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Conectado ao MongoDB');
        
        const count = await Palestra.countDocuments();
        console.log(`Total de palestras encontradas: ${count}`);
        
        if (count > 0) {
            const palestras = await Palestra.find().limit(3);
            console.log('Exemplos de palestras:', JSON.stringify(palestras, null, 2));
        } else {
            console.log('Nenhuma palestra encontrada. Criando uma de teste...');
            const novaPalestra = new Palestra({
                titulo: 'Palestra de Teste',
                descricao: 'Esta é uma palestra criada automaticamente para teste.',
                data: new Date(),
                duracao_minutos: 60,
                palestrante: 'Sistema',
                local: 'Auditório Virtual',
                tipo: 'palestra',
                vagas: 100,
                pontos: 10
            });
            await novaPalestra.save();
            console.log('Palestra de teste criada com sucesso!');
        }
        
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await mongoose.disconnect();
    }
}

checkPalestras();
