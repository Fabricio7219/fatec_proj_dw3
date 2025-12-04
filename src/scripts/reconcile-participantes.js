/* eslint-disable no-console */
require('dotenv').config();

const mongoose = require('mongoose');
const { connectToDatabase } = require('../config/database');
const Usuario = require('../models/Usuario');
const Participante = require('../models/Participante');

(async function main() {
  try {
    await connectToDatabase();

    const usuarios = await Usuario.find({ tipo: 'aluno', ativo: true });
    let criados = 0;
    let sincronizados = 0;
    let avisos = 0;

    for (const usuario of usuarios) {
      const participante = await Participante.findOne({
        $or: [
          { usuarioId: usuario._id },
          { email: usuario.email },
          usuario.ra ? { ra: usuario.ra } : null
        ].filter(Boolean)
      });

      if (!participante) {
        if (!usuario.ra) {
          console.warn(`⚠️ Usuário ${usuario.email} não possui RA — não foi possível criar Participante automaticamente.`);
          avisos += 1;
          continue;
        }

        const novoParticipante = await Participante.create({
          nome: usuario.nome,
          email: usuario.email,
          ra: usuario.ra,
          curso: usuario.curso || 'Não informado',
          semestre: usuario.semestre || '1º Semestre',
          fatec: 'Fatec Osasco',
          ativo: true,
          usuarioId: usuario._id,
          cadastroCompletoEm: new Date(),
          ultimaSincronizacao: new Date()
        });

        usuario.participanteId = novoParticipante._id;
        usuario.perfilCompletoEm = usuario.perfilCompletoEm || new Date();
        await usuario.save();
        criados += 1;
        continue;
      }

      let alterouParticipante = false;
      if (!participante.usuarioId) {
        participante.usuarioId = usuario._id;
        alterouParticipante = true;
      }
      if (!participante.email && usuario.email) {
        participante.email = usuario.email;
        alterouParticipante = true;
      }
      if (!participante.ra && usuario.ra) {
        participante.ra = usuario.ra;
        alterouParticipante = true;
      }
      if (alterouParticipante) {
        participante.ultimaSincronizacao = new Date();
        await participante.save();
        sincronizados += 1;
      }

      if (!usuario.participanteId || usuario.participanteId.toString() !== participante._id.toString()) {
        usuario.participanteId = participante._id;
        if (!usuario.ra && participante.ra) usuario.ra = participante.ra;
        if (!usuario.perfilCompletoEm && participante.cadastroCompletoEm) {
          usuario.perfilCompletoEm = participante.cadastroCompletoEm;
        }
        await usuario.save();
      }
    }

    console.log('✅ Reconciliação concluída');
    console.log(`➡️ Participantes criados: ${criados}`);
    console.log(`➡️ Participantes sincronizados: ${sincronizados}`);
    if (avisos) console.log(`⚠️ Avisos (precisam de intervenção manual): ${avisos}`);
  } catch (error) {
    console.error('❌ Erro na reconciliação:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
})();
