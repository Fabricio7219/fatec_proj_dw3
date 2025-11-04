// src/scripts/drop-ra-index.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');

async function dropRaIndex() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI não definido no .env');
    process.exit(1);
  }
  try {
    console.log('⏳ Conectando ao MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Conectado ao MongoDB');

    // Nome da coleção padrão do model Usuario é 'usuarios'
    const db = mongoose.connection.db;
    const collection = db.collection('usuarios');

    const indexes = await collection.indexes();
    console.log('🔎 Índices atuais da coleção usuarios:', indexes.map(i => i.name));

    const raIndex = indexes.find(i => i.name === 'ra_1');
    if (!raIndex) {
      console.log('ℹ️ Índice ra_1 não encontrado. Nada a fazer.');
    } else {
      console.log('🗑️ Removendo índice único ra_1...');
      await collection.dropIndex('ra_1');
      console.log('✅ Índice ra_1 removido com sucesso.');
    }

    // Opcional: garantir que não existam documentos com ra: null fixando o schema já ajustado
  } catch (err) {
    console.error('❌ Erro ao remover índice ra_1:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Conexão com MongoDB fechada.');
  }
}

dropRaIndex();
