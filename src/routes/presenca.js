// src/routes/presenca.js
const express = require('express');
const router = express.Router();

// Importar modelos e utilidades
const Participante = require('../models/Participante');
const Presenca = require('../models/Presenca');
const Palestra = require('../models/Palestra');
const { generateCertificate } = require('../utils/certificate');
const EmailAdapter = require('../utils/EmailAdapter');
const { verificarPerimetro } = require('../utils/location');
const { gpsStrategy, qrStrategy } = require('../utils/presencaStrategies');
const { creditPoints } = require('../utils/points');

// Tolerâncias configuráveis (minutos) — padrão: 30 antes do início, 30 após o fim
const TOL_BEFORE_MIN = Number(process.env.PRESENCA_TOL_BEFORE_MINUTES || 30);
const TOL_AFTER_MIN = Number(process.env.PRESENCA_TOL_AFTER_MINUTES || 30);

function calcularJanelaTempo(palestra) {
    const inicio = new Date(palestra.data);
    const dur = Number(palestra.duracao_minutos || 60);
    const fim = new Date(inicio.getTime() + dur * 60000);
    const inicioPermitido = new Date(inicio.getTime() - TOL_BEFORE_MIN * 60000);
    const fimPermitido = new Date(fim.getTime() + TOL_AFTER_MIN * 60000);
    return { inicio, fim, inicioPermitido, fimPermitido };
}


const ensureParticipante = require('../middleware/ensureParticipante');
const path = require('path');
const fs = require('fs');

/**
 * GET /presenca/certificados
 * Listar certificados do participante logado
 */
router.get('/certificados', ensureParticipante, async (req, res) => {
    try {
        const participanteId = req.body.participanteId;
        const presencas = await Presenca.find({
            participanteId,
            $or: [
                { certificadoEnviado: true },
                { certificadoPath: { $exists: true, $ne: null } }
            ]
        }).populate('palestraId', 'titulo data duracao_minutos');

        res.json({ sucesso: true, certificados: presencas });
    } catch (error) {
        res.status(500).json({ sucesso: false, erro: error.message });
    }
});

/**
 * GET /presenca/download-certificado/:presencaId
 * Baixar certificado
 */
router.get('/download-certificado/:presencaId', ensureParticipante, async (req, res) => {
    try {
        const presenca = await Presenca.findById(req.params.presencaId);
        if (!presenca) return res.status(404).json({ erro: 'Presença não encontrada' });

        // Verificar se o certificado pertence ao usuário logado
        if (presenca.participanteId.toString() !== req.body.participanteId.toString()) {
             return res.status(403).json({ erro: 'Acesso negado' });
        }

        if (!presenca.certificadoPath) {
            return res.status(404).json({ erro: 'Certificado não gerado' });
        }

        const filepath = presenca.certificadoPath;
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ erro: 'Arquivo do certificado não encontrado no servidor' });
        }

        res.download(filepath);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

/**
 * POST /presenca/entrada
 * Registrar entrada de participante
 */
router.post('/entrada', ensureParticipante, async (req, res) => {
    try {
        const { participanteId, palestraId, localizacao } = req.body;
        
        if (!participanteId || !palestraId) {
            return res.status(400).json({ sucesso: false, erro: 'participanteId e palestraId são obrigatórios' });
        }

        // Verifica se a palestra existe
        const palestra = await Palestra.findById(palestraId);
        if (!palestra) {
            return res.status(404).json({ 
                sucesso: false, 
                erro: 'Palestra não encontrada' 
            });
        }

        // Janela de tolerância: 30min antes do início e 30min após o fim (configurável)
        const agora = new Date();
        const { inicioPermitido, fimPermitido } = calcularJanelaTempo(palestra);
        if (agora < inicioPermitido || agora > fimPermitido) {
            return res.status(400).json({
                sucesso: false,
                erro: `Fora da janela de registro. Permitido entre ${inicioPermitido.toLocaleString()} e ${fimPermitido.toLocaleString()}.`
            });
        }

        // Verificação de presença via Strategy (modo padrão GPS)
        const modo = req.body.modo || 'gps'; // 'gps' ou 'qr'
        let verifica;
        if (modo === 'qr') {
            // Agora passamos localização também para o QR Strategy
            verifica = await qrStrategy({ qrData: req.body.qrData, palestra, localizacao });
        } else {
            verifica = await gpsStrategy({ localizacao, palestra });
        }

        if (!verifica || !verifica.ok) {
            return res.status(403).json({ sucesso: false, erro: verifica && verifica.motivo ? `Validação falhou: ${verifica.motivo}` : 'Não autorizado' });
        }

        // Verifica se já existe presença registrada
        let presenca = await Presenca.findOne({
            participanteId,
            palestraId: palestra._id,
            horario_saida: null
        });

        if (presenca) {
            return res.status(409).json({ 
                sucesso: false, 
                erro: 'Participante já registrou entrada' 
            });
        }

        // Cria novo registro de presença
        presenca = new Presenca({
            participanteId,
            palestraId: palestra._id,
            horario_entrada: new Date(),
            localizacao_entrada: {
                ...localizacao,
                timestamp: new Date()
            },
            dentro_perimetro: true
        });

        await presenca.save();

        res.json({ 
            sucesso: true, 
            mensagem: 'Entrada registrada com sucesso',
            dados: presenca
        });
    } catch (error) {
        res.status(500).json({ sucesso: false, erro: error.message });
    }
});

/**
 * POST /presenca/saida
 * Registrar saída de participante
 */
router.post('/saida', ensureParticipante, async (req, res) => {
    try {
        const { participanteId, palestraId, localizacao } = req.body;
        
        if (!participanteId || !palestraId) {
            return res.status(400).json({ 
                sucesso: false, 
                erro: 'participanteId e palestraId são obrigatórios' 
            });
        }

        // Verifica se a palestra existe
        const palestra = await Palestra.findById(palestraId);
        if (!palestra) {
            return res.status(404).json({ 
                sucesso: false, 
                erro: 'Palestra não encontrada' 
            });
        }

        // Janela de tolerância para saída também
        const agora = new Date();
        const { inicioPermitido, fimPermitido } = calcularJanelaTempo(palestra);
        if (agora < inicioPermitido || agora > fimPermitido) {
            return res.status(400).json({
                sucesso: false,
                erro: `Fora da janela de registro de saída. Permitido entre ${inicioPermitido.toLocaleString()} e ${fimPermitido.toLocaleString()}.`
            });
        }

        // Verificação de presença via Strategy (modo padrão GPS)
        const modoSaida = req.body.modo || 'gps';
        let verificaSaida;
        if (modoSaida === 'qr') {
            verificaSaida = await qrStrategy({ qrData: req.body.qrData, palestra, localizacao });
        } else {
            verificaSaida = await gpsStrategy({ localizacao, palestra });
        }

        if (!verificaSaida || !verificaSaida.ok) {
            return res.status(403).json({ sucesso: false, erro: verificaSaida && verificaSaida.motivo ? `Validação falhou: ${verificaSaida.motivo}` : 'Não autorizado' });
        }

        // Busca o registro de presença ativo
        const presenca = await Presenca.findOne({
            participanteId,
            palestraId: palestra._id,
            horario_saida: null
        });

        if (!presenca) {
            return res.status(404).json({ 
                sucesso: false, 
                erro: 'Nenhuma entrada registrada para este participante' 
            });
        }

        // Finaliza a presença existente
        const agoraSaida = new Date();
        const entrada = new Date(presenca.horario_entrada);
        const tempoMinutos = Math.max(0, Math.floor((agoraSaida.getTime() - entrada.getTime()) / (1000 * 60)));
        presenca.horario_saida = agoraSaida;
        presenca.duracaoMinutos = tempoMinutos;
        if (localizacao && typeof localizacao === 'object') {
            presenca.localizacao_saida = { ...localizacao, timestamp: new Date() };
        }
        await presenca.save();

        // Gera certificado e pontuação se atingiu limiar
        try {
            // O tempo mínimo agora é 60% da duração da palestra (tolerância)
            const duracaoTotal = Number(palestra.duracao_minutos || process.env.CERT_THRESHOLD_MINUTES || 90);
            const thresh = duracaoTotal * 0.6; 

            if (tempoMinutos >= thresh) {
                // Buscar participante para dados de email/certificado
                const participanteDoc = await Participante.findById(participanteId);
                if (participanteDoc) {
                    const certificadoPath = await generateCertificate(participanteDoc.toObject(), { 
                        palestraNome: palestra.titulo || palestraId,
                        data: palestra.data,
                        duracaoMinutos: palestra.duracao_minutos,
                        local: palestra.local,
                        palestrante: palestra.palestrante
                    });
                    
                    // Envio de email em standby conforme solicitação
                    /*
                    const emailEnviado = await EmailAdapter.sendCertificate(
                        participanteDoc.email,
                        `Certificado de participação: ${palestra.titulo || palestraId}`,
                        `Parabéns, veja em anexo o certificado da palestra ${palestra.titulo || palestraId}.`,
                        certificadoPath
                    );
                    presenca.certificadoEnviado = !!(emailEnviado && (emailEnviado.success || emailEnviado.messageId));
                    */
                   
                    // Apenas salva o caminho para download no dashboard
                    presenca.certificadoEnviado = false; 
                    presenca.certificadoPath = certificadoPath;
                    await presenca.save();

                    const pontosPalestra = Number(palestra.pontos || 0);
                    if (!presenca.pontosCreditados && !Number.isNaN(pontosPalestra) && pontosPalestra > 0) {
                        try {
                            const creditResult = await creditPoints({
                                participanteId: participanteDoc._id,
                                valor: pontosPalestra,
                                tipo: 'palestra',
                                palestraId: palestra._id
                            });
                            presenca.pontosCreditados = true;
                            presenca.pontosValorAplicado = creditResult.log?.valor || pontosPalestra;
                            await presenca.save();
                        } catch (e) {
                            console.error('Falha ao creditar pontos por palestra:', e?.message || e);
                        }
                    }
                }
            }
        } catch (errPres) {
            console.error('Erro ao finalizar/gerar certificado:', errPres);
        }

        res.json({ sucesso: true, mensagem: 'Saída registrada', dados: { presencaId: presenca._id, tempo_permanencia_minutos: tempoMinutos } });
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

// GET /presenca/palestra/:id  -> listar presenças de uma palestra
router.get('/palestra/:id', async (req, res) => {
    try {
        const palestraId = req.params.id;
        const presencas = await Presenca.find({ palestraId }).populate('participanteId').sort({ horario_entrada: 1 });
        res.json({ sucesso: true, total: presencas.length, dados: presencas });
    } catch (error) {
        res.status(500).json({ sucesso: false, erro: error.message });
    }
});

/**
 * GET /presenca/me/:palestraId
 * Verifica o status de presença do usuário atual na palestra
 */
router.get('/me/:palestraId', ensureParticipante, async (req, res) => {
    try {
        const palestraId = req.params.palestraId;
        const participanteId = req.body.participanteId; // Injetado pelo middleware

        if (!participanteId) {
            return res.status(400).json({ sucesso: false, erro: 'Participante não identificado' });
        }

        const presenca = await Presenca.findOne({
            participanteId,
            palestraId
        }).sort({ horario_entrada: -1 }); // Pega o último registro

        if (!presenca) {
            return res.json({ sucesso: true, status: 'nao_registrado' });
        }

        if (presenca.horario_saida) {
            return res.json({ sucesso: true, status: 'finalizado', dados: presenca });
        }

        return res.json({ sucesso: true, status: 'presente', dados: presenca });

    } catch (error) {
        res.status(500).json({ sucesso: false, erro: error.message });
    }
});

module.exports = router;
