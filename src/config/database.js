// src/config/database.js
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fatecweek";

async function connectToDatabase() {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Conectado ao MongoDB com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao conectar ao MongoDB:', error.message);
        throw error;
    }
}

module.exports = { connectToDatabase };
