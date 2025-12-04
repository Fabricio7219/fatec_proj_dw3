const { generateCertificate } = require('../utils/certificate');
const path = require('path');

async function run() {
    console.log('Gerando certificado de teste...');

    const mockParticipante = {
        nome: 'Fulano de Tal da Silva',
        ra: '123456789',
        email: 'fulano@fatec.sp.gov.br',
        _id: 'teste_id_123'
    };

    const mockPalestra = {
        palestraNome: 'Inteligência Artificial na Indústria 4.0',
        data: new Date(),
        duracaoMinutos: 90,
        local: 'Auditório Principal',
        palestrante: 'Dr. João Especialista'
    };

    try {
        const filePath = await generateCertificate(mockParticipante, mockPalestra);
        console.log('\n✅ Certificado gerado com sucesso!');
        console.log(`📂 Local: ${filePath}`);
        console.log('👉 Abra este arquivo para visualizar o novo layout.');
    } catch (error) {
        console.error('Erro ao gerar:', error);
    }
}

run();