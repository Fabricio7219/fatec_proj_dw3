const mongoose = require('mongoose');

// Carrega os modelos diretamente
const Usuario = require('./Usuario');
const Participante = require('./Participante');
const Docente = require('./Docente');

// Exporta os modelos já carregados
module.exports = {
    Usuario,
    Participante,
    Docente
};