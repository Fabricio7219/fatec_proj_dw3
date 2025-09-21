// src/routes/presenca.js
const express = require('express');
const router = express.Router();

// Importar modelo de Participante
const Participante = require('../models/Participante');

/**
 * POST /presenca/entrada
 * Registrar entrada de participante
 */
router.post('/entrada', async (req, res) => {
    try {
        const { ra } = req.body;
        if (!ra) return res.status(400).json({ sucesso: false, erro: 'RA é obrigatório' });

        const participante = await Participante.buscarPorRA(ra);
        if (!participante) return res.status(404).json({ sucesso: false, erro: 'Participante não encontrado' });
        if (participante.presente) return res.status(409).json({ sucesso: false, erro: 'Participante já está presente' });

        participante.presente = true;
        participante.horario_entrada = new Date();
        participante.horario_saida = null;

        await participante.save();

        res.json({ sucesso: true, mensagem: 'Entrada registrada', dados: participante });
    } catch (error) {
        res.status(500).json({ sucesso: false, erro: error.message });
    }
});

/**
 * POST /presenca/saida
 * Registrar saída de participante
 */
router.post('/saida', async (req, res) => {
    try {
        const { ra } = req.body;
        if (!ra) return res.status(400).json({ sucesso: false, erro: 'RA é obrigatório' });

        const participante = await Participante.buscarPorRA(ra);
        if (!participante) return res.status(404).json({ sucesso: false, erro: 'Participante não encontrado' });
        if (!participante.presente) return res.status(409).json({ sucesso: false, erro: 'Participante não está presente' });

        const agora = new Date();
        participante.presente = false;
        participante.horario_saida = agora;

        // Calcular tempo de permanência
        const entrada = new Date(participante.horario_entrada);
        const tempoMinutos = Math.floor((agora.getTime() - entrada.getTime()) / (1000 * 60));
        participante.tempo_total_minutos += tempoMinutos;

        await participante.save();

        res.json({ sucesso: true, mensagem: 'Saída registrada', dados: { ...participante.toJSON(), tempo_permanencia_minutos: tempoMinutos } });
    } catch (error) {
        res.status(500).json({ sucesso: false, erro: error.message });
    }
});

/**
 * GET /presenca/status/:ra
 * Consultar status de presença
 */
router.get('/status/:ra', async (req, res) => {
    try {
        const ra = req.params.ra;
        const participante = await Participante.buscarPorRA(ra);
        if (!participante) return res.status(404).json({ sucesso: false, erro: 'Participante não encontrado' });

        res.json({ sucesso: true, dados: participante });
    } catch (error) {
        res.status(500).json({ sucesso: false, erro: error.message });
    }
});

/**
 * GET /presenca/presentes
 * Listar todos os participantes presentes
 */
router.get('/presentes', async (req, res) => {
    try {
        const presentes = await Participante.listarPresentes();
        res.json({ sucesso: true, total: presentes.length, dados: presentes });
    } catch (error) {
        res.status(500).json({ sucesso: false, erro: error.message });
    }
});

module.exports = router;
