const { generateCertificate } = require('../utils/certificate');
const path = require('path');

async function run() {
    console.log('Gerando certificados de teste...');

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
        palestrante: 'Dr. Joao Especialista',
        tipo: 'palestra'
    };

    const mockExposicao = {
        palestraNome: 'Feira de Exposicao de Projetos Integradores',
        data: new Date(),
        duracaoMinutos: 240,
        local: 'Patio Central',
        palestrante: 'Profa. Marina Coordenadora',
        tipo: 'exposicao'
    };

    try {
        const filePathPalestra = await generateCertificate(mockParticipante, mockPalestra);
        const filePathExposicao = await generateCertificate(mockParticipante, mockExposicao);
        console.log('\n✅ Certificados gerados com sucesso!');
        console.log(`📂 Palestra: ${filePathPalestra}`);
        console.log(`📂 Exposicao: ${filePathExposicao}`);
        console.log('👉 Abra os arquivos para visualizar o novo layout.');
    } catch (error) {
        console.error('Erro ao gerar:', error);
    }
}

run();