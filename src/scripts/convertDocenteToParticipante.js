/**
 * Script para gerenciar conversão de registros entre Docente e Participante
 * 
 * Uso:
 *   node src/scripts/convertDocenteToParticipante.js --email=usuario@example.com --action=inspect
 *   node src/scripts/convertDocenteToParticipante.js --email=usuario@example.com --action=convert
 *   node src/scripts/convertDocenteToParticipante.js --email=usuario@example.com --action=delete
 * 
 * Ações:
 *   - inspect: Mostra onde o email está cadastrado (Usuario/Participante/Docente)
 *   - convert: Converte Docente para Participante e atualiza Usuario
 *   - delete: Remove registro Docente (usar com cuidado)
 * 
 * Ambiente:
 *   Requer arquivo .env com MONGO_URI
 */

// Dependências
require('dotenv').config();
const mongoose = require('mongoose');

// Models
const Docente = require('../models/Docente');
const Participante = require('../models/Participante');
const Usuario = require('../models/Usuario');

// Configurações
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fatecweek';
const ACTIONS = ['inspect', 'convert', 'delete'];

// Função para processar argumentos da linha de comando
function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.replace('--', '').split('=');
      args[key] = value || true;
    }
  });
  return args;
}

// Função principal
async function main() {
  console.log('🚀 Iniciando script de conversão...\n');
  
  // Validar argumentos
  const args = parseArgs();
  const email = args.email;
  const action = (args.action || 'inspect').toLowerCase();

  if (!email) {
    console.error('Uso: node src/scripts/convertDocenteToParticipante.js --email=usuario@example.com --action=inspect|convert|delete');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado ao MongoDB');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error.message);
    process.exit(1);
  }

  try {
    const docente = await Docente.findOne({ email });
    const participante = await Participante.findOne({ email });
    const usuario = await Usuario.findOne({ email });

    console.log('🔍 Resultado da inspeção para', email);
    console.log('📝 Docente:', docente ? `ENCONTRADO (_id=${docente._id})` : 'Não encontrado');
    console.log('👤 Participante:', participante ? `ENCONTRADO (_id=${participante._id})` : 'Não encontrado');
    console.log('👥 Usuario:', usuario ? `ENCONTRADO (_id=${usuario._id}, tipo=${usuario.tipo})` : 'Não encontrado');

    if (action === 'inspect') {
      console.log('✅ Inspeção concluída. Use --action=convert ou --action=delete para fazer alterações.');
      await mongoose.disconnect();
      return process.exit(0);
    }

    if (!docente) {
      console.error('❌ Não existe documento Docente para esse email. Nada para fazer.');
      await mongoose.disconnect();
      return process.exit(1);
    }

    if (action === 'delete') {
      try {
        await Docente.deleteOne({ _id: docente._id });
        console.log('✅ Docente removido com sucesso.');
        await mongoose.disconnect();
        return process.exit(0);
      } catch (error) {
        console.error('❌ Erro ao remover docente:', error);
        await mongoose.disconnect();
        return process.exit(1);
      }
    }

    if (action === 'convert') {
      // Se já existe participante, apenas remover docente (opcional)
      if (participante) {
        console.log('⚠️ Participante já existe. Removendo Docente...');
        await Docente.deleteOne({ _id: docente._id });
        console.log('✅ Docente removido.');
        await mongoose.disconnect();
        return process.exit(0);
      }

      // Se no existe usuario, cria um Usuario com tipo 'aluno'
      let user = usuario;
      if (!user) {
        user = new Usuario({ nome: docente.nome || 'Sem nome', email: docente.email, tipo: 'aluno' });
        await user.save();
        console.log('Usuario criado:', user._id);
      } else {
        // Atualiza tipo se estiver como docente
        if (user.tipo === 'docente') {
          user.tipo = 'aluno';
          await user.save();
          console.log('Usuario existente atualizado para tipo=aluno');
        }
      }

      try {
        // Cria participante usando campos do docente
        const novoParticipante = await Participante.create({
          ra: `CONV${Date.now().toString().slice(-6)}`, // RA temporário de 6 dígitos
          nome: docente.nome || user.nome || 'Sem nome',
          curso: (docente.cursos && docente.cursos[0]) || 'Não informado',
          semestre: '1º Semestre',
          fatec: docente.fatec || 'Não informado',
          email: docente.email,
          ativo: true,
          usuarioId: user._id
        });

        console.log('✅ Participante criado:', novoParticipante._id);

        // Remover docente para evitar confusão futura
        await Docente.deleteOne({ _id: docente._id });
        console.log('✅ Docente removido após conversão.');
        
        await mongoose.disconnect();
        return process.exit(0);
      } catch (error) {
        console.error('❌ Erro durante a conversão:', error);
        await mongoose.disconnect();
        return process.exit(1);
      }
    }

    console.error('❌ Ação desconhecida:', action);
    await mongoose.disconnect();
    process.exit(1);
  } catch (err) {
    console.error('❌ Erro no script:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Executar script
main();
