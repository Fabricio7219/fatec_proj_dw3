// src/routes/presenca.js
const express = require('express');
const router = express.Router();
const path = require('path');

// Importar modelos e utilidades
const Participante = require('../models/Participante');
const Presenca = require('../models/Presenca');
const Palestra = require('../models/Palestra');
const { generateCertificate } = require('../utils/certificate');
const Pontuacao = require('../models/Pontuacao');
const EmailAdapter = require('../utils/EmailAdapter');
const { verificarPerimetro } = require('../utils/location');
const { gpsStrategy, qrStrategy } = require('../utils/presencaStrategies');

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

function calcularMinimoCertificado(palestra) {
    const percentualRaw = Number(process.env.CERT_THRESHOLD_PERCENT || 0.6);
    const percentual = Number.isFinite(percentualRaw) ? Math.min(1, Math.max(0, percentualRaw)) : 0.6;
    const duracao = Math.max(1, Number(palestra?.duracao_minutos || 60));
    return Math.max(1, Math.ceil(duracao * percentual));
}


const ensureParticipante = require('../middleware/ensureParticipante');

/**
 * GET /presenca/minhas
 * Lista presenças do participante autenticado e links de certificados disponíveis
 */
router.get('/minhas', ensureParticipante, async (req, res) => {
    try {
        const participanteId = req.body?.participanteId;
        if (!participanteId) {
            return res.status(400).json({ sucesso: false, erro: 'Participante não identificado' });
        }

        const presencas = await Presenca.find({ participanteId }).sort({ createdAt: -1 });
        const palestraIds = [...new Set(presencas.map(p => String(p.palestraId)).filter(Boolean))];
        const palestras = await Palestra.find({ _id: { $in: palestraIds } }).select('_id titulo data duracao_minutos');
        const palestraMap = palestras.reduce((acc, p) => {
            acc[String(p._id)] = p;
            return acc;
        }, {});

        const dados = presencas.map(p => {
            const palestra = palestraMap[String(p.palestraId)] || null;
            const certificadoUrl = p.certificadoPath
                ? `/certificates/${encodeURIComponent(path.basename(p.certificadoPath))}`
                : null;
            const minimoCertificadoMinutos = calcularMinimoCertificado(palestra || { duracao_minutos: 60 });

            return {
                _id: p._id,
                palestraId: p.palestraId,
                palestraTitulo: palestra?.titulo || 'Palestra',
                palestraData: palestra?.data || null,
                palestraDuracaoMinutos: Number(palestra?.duracao_minutos || 60),
                minimoCertificadoMinutos,
                duracaoMinutos: p.duracaoMinutos || 0,
                horarioEntrada: p.horario_entrada,
                horarioSaida: p.horario_saida,
                certificadoEnviado: !!p.certificadoEnviado,
                certificadoDisponivel: !!certificadoUrl,
                certificadoUrl
            };
        });

        return res.json({
            sucesso: true,
            total: dados.length,
            comparecidas: dados.filter(d => !!d.horarioSaida).length,
            comCertificado: dados.filter(d => d.certificadoDisponivel).length,
            dados
        });
    } catch (error) {
        return res.status(500).json({ sucesso: false, erro: error.message });
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
            verifica = await qrStrategy({ qrData: req.body.qrData, palestra });
        } else {
            verifica = await gpsStrategy({ localizacao, palestra });
        }

        if (!verifica || !verifica.ok) {
            return res.status(403).json({ sucesso: false, erro: verifica && verifica.motivo ? `Validação falhou: ${verifica.motivo}` : 'Não autorizado' });
        }

        // Verifica se já existe presença registrada
        let presenca = await Presenca.findOne({
            participanteId,
            palestraId,
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
            palestraId,
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
            verificaSaida = await qrStrategy({ qrData: req.body.qrData, palestra });
        } else {
            verificaSaida = await gpsStrategy({ localizacao, palestra });
        }

        if (!verificaSaida || !verificaSaida.ok) {
            return res.status(403).json({ sucesso: false, erro: verificaSaida && verificaSaida.motivo ? `Validação falhou: ${verificaSaida.motivo}` : 'Não autorizado' });
        }

        // Busca o registro de presença ativo
        const presenca = await Presenca.findOne({
            participanteId,
            palestraId,
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
        const diffMs = Math.max(0, agoraSaida.getTime() - entrada.getTime());
        const tempoMinutos = diffMs > 0 ? Math.max(1, Math.ceil(diffMs / (1000 * 60))) : 0;
        presenca.horario_saida = agoraSaida;
        presenca.duracaoMinutos = tempoMinutos;
        if (localizacao && typeof localizacao === 'object') {
            presenca.localizacao_saida = { ...localizacao, timestamp: new Date() };
        }
        await presenca.save();

        // Gera certificado e pontuação se atingiu limiar
        let certificadoGerado = false;
        let certificadoEnviado = false;
        const limiarCertificado = calcularMinimoCertificado(palestra);
        try {
            const thresh = limiarCertificado;
            if (tempoMinutos >= thresh) {
                // Buscar participante para dados de email/certificado
                const participanteDoc = await Participante.findById(participanteId);
                if (participanteDoc) {
                    const certificadoPath = await generateCertificate(participanteDoc.toObject(), { palestraNome: palestraId });
                    presenca.certificadoEnviado = false;
                    presenca.certificadoPath = certificadoPath;
                    await presenca.save();
                    certificadoGerado = true;

                    try {
                        const emailResult = await EmailAdapter.sendCertificate(
                            participanteDoc.email,
                            `Certificado de participação: ${palestraId}`,
                            `Parabéns, veja em anexo o certificado da palestra ${palestraId}.`,
                            certificadoPath
                        );
                        presenca.certificadoEnviado = !!(emailResult && (emailResult.success || emailResult.messageId));
                        await presenca.save();
                        certificadoEnviado = !!presenca.certificadoEnviado;
                    } catch (errEmail) {
                        console.warn('Falha ao enviar certificado por e-mail:', errEmail?.message || errEmail);
                    }

                    // Pontuação definida pelo admin na palestra: ao atingir o limiar, credita pontos totais da palestra
                    const pontosPalestra = Number(palestra.pontos || 0);
                                        if (!isNaN(pontosPalestra) && pontosPalestra > 0) {
                                                participanteDoc.pontos_total = Number(participanteDoc.pontos_total || 0) + pontosPalestra;
                                                try {
                                                    await Pontuacao.create({ participanteId: participanteDoc._id, tipo: 'palestra', valor: pontosPalestra, palestraId: palestra._id });
                                                } catch (e) { console.warn('Falha ao registrar Pontuacao (palestra):', e?.message); }
                                        }
                    await participanteDoc.save();
                }
            }
        } catch (errPres) {
            console.error('Erro ao finalizar/gerar certificado:', errPres);
        }

        res.json({ sucesso: true, mensagem: 'Saída registrada', dados: { presencaId: presenca._id, tempo_permanencia_minutos: tempoMinutos, limiar_certificado_minutos: limiarCertificado, tempo_restante_certificado_minutos: Math.max(0, limiarCertificado - tempoMinutos), elegivel_certificado: tempoMinutos >= limiarCertificado, certificado_gerado: certificadoGerado, certificado_enviado_email: certificadoEnviado } });
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

module.exports = router;
