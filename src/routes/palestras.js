const express = require('express');
const router = express.Router();
const Palestra = require('../models/Palestra');
const qr = require('qrcode');

// Rota para criar uma nova palestra
router.post('/', async (req, res) => {
    try {
        const {
            titulo,
            descricao,
            data,
            duracao_minutos,
            palestrante,
            local,
            tipo,
            localizacao,
            vagas,
            pontos
        } = req.body;

        // Validações básicas
        if (!titulo || !data || !duracao_minutos || !palestrante) {
            return res.status(400).json({
                sucesso: false,
                erro: 'Campos obrigatórios faltando: titulo, data, duracao_minutos e palestrante'
            });
        }

        // Cria a palestra no banco
        const DEFAULT_PONTOS_PALESTRA = Number(process.env.DEFAULT_PONTOS_PALESTRA || 0.15);
        const DEFAULT_PONTOS_EXPOSICAO = Number(process.env.DEFAULT_PONTOS_EXPOSICAO || 0.20);

        const palestra = new Palestra({
            titulo,
            descricao,
            data: new Date(data),
            duracao_minutos: Number(duracao_minutos),
            palestrante,
            local: local && String(local).trim() ? String(local).trim() : 'Local a definir',
            tipo: (tipo === 'exposicao') ? 'exposicao' : 'palestra',
            vagas: vagas != null ? Number(vagas) : undefined,
            pontos: pontos != null ? Number(pontos) : ((tipo === 'exposicao') ? DEFAULT_PONTOS_EXPOSICAO : DEFAULT_PONTOS_PALESTRA),
            localizacao: localizacao && localizacao.lat != null && localizacao.lng != null ? {
                lat: Number(localizacao.lat),
                lng: Number(localizacao.lng),
                raio_metros: Number(localizacao.raio_metros || 50)
            } : undefined
        });

        // Se localização não veio, define um padrão seguro (0,0) com raio 50m
        if (!palestra.localizacao) {
            palestra.localizacao = { lat: 0, lng: 0, raio_metros: 50 };
        }

    await palestra.save();

        // Gera o QR Code como uma URL para fluxo de escaneamento
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const scanUrl = `${baseUrl}/qr.html?p=${palestra._id}`;
        const qrCodeUrl = await qr.toDataURL(scanUrl);
        palestra.qr_code = qrCodeUrl;
        palestra.qr_url = scanUrl;
        await palestra.save();

        res.status(201).json({
            sucesso: true,
            mensagem: 'Palestra criada com sucesso',
            dados: palestra
        });
    } catch (error) {
        res.status(500).json({
            sucesso: false,
            erro: error.message
        });
    }
});

// Rota para iniciar uma palestra
router.post('/:id/iniciar', async (req, res) => {
    try {
        const palestra = await Palestra.findById(req.params.id);
        
        if (!palestra) {
            return res.status(404).json({
                sucesso: false,
                erro: 'Palestra não encontrada'
            });
        }

        if (palestra.status !== 'agendada') {
            return res.status(400).json({
                sucesso: false,
                erro: 'Palestra não está no status adequado para início'
            });
        }

        palestra.status = 'em_andamento';
        await palestra.save();

        res.json({
            sucesso: true,
            mensagem: 'Palestra iniciada com sucesso',
            dados: palestra
        });
    } catch (error) {
        res.status(500).json({
            sucesso: false,
            erro: error.message
        });
    }
});

// Rota para finalizar uma palestra
router.post('/:id/finalizar', async (req, res) => {
    try {
        const palestra = await Palestra.findById(req.params.id);
        
        if (!palestra) {
            return res.status(404).json({
                sucesso: false,
                erro: 'Palestra não encontrada'
            });
        }

        if (palestra.status !== 'em_andamento') {
            return res.status(400).json({
                sucesso: false,
                erro: 'Palestra não está em andamento'
            });
        }

        palestra.status = 'finalizada';
        await palestra.save();

        res.json({
            sucesso: true,
            mensagem: 'Palestra finalizada com sucesso',
            dados: palestra
        });
    } catch (error) {
        res.status(500).json({
            sucesso: false,
            erro: error.message
        });
    }
});

// Rota para listar todas as palestras
router.get('/', async (req, res) => {
    try {
        const palestras = await Palestra.find();
        res.json({
            sucesso: true,
            dados: palestras
        });
    } catch (error) {
        res.status(500).json({
            sucesso: false,
            erro: error.message
        });
    }
});

// Rota para obter uma palestra específica
router.get('/:id', async (req, res) => {
    try {
        const palestra = await Palestra.findById(req.params.id);
        
        if (!palestra) {
            return res.status(404).json({
                sucesso: false,
                erro: 'Palestra não encontrada'
            });
        }

        res.json({
            sucesso: true,
            dados: palestra
        });
    } catch (error) {
        res.status(500).json({
            sucesso: false,
            erro: error.message
        });
    }
});

// Rota para atualizar uma palestra (admin)
router.put('/:id', async (req, res) => {
    try {
        const updates = req.body;
        // Apenas campos permitidos (proteção básica)
    const allowed = ['titulo', 'descricao', 'data', 'duracao_minutos', 'palestrante', 'local', 'localizacao', 'status', 'vagas', 'pontos'];
        const payload = {};
        Object.keys(updates).forEach(k => { if (allowed.includes(k)) payload[k] = updates[k]; });

        if (payload.data) payload.data = new Date(payload.data);

        // defaults ao atualizar: se pontos vier undefined, não mexe; se vier null ou string vazia, recalcula conforme tipo
        if (Object.prototype.hasOwnProperty.call(payload, 'pontos')) {
            if (payload.pontos === '' || payload.pontos === null) {
                const tipoAtual = payload.tipo || (await Palestra.findById(req.params.id))?.tipo || 'palestra';
                payload.pontos = (tipoAtual === 'exposicao') ? Number(process.env.DEFAULT_PONTOS_EXPOSICAO || 0.20) : Number(process.env.DEFAULT_PONTOS_PALESTRA || 0.15);
            } else {
                payload.pontos = Number(payload.pontos);
            }
        }

        const palestra = await Palestra.findByIdAndUpdate(req.params.id, payload, { new: true });
        if (!palestra) return res.status(404).json({ sucesso: false, erro: 'Palestra não encontrada' });

        // Regenera o QR Code com o host atual (útil se mudou de localhost para IP)
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const scanUrl = `${baseUrl}/qr.html?p=${palestra._id}`;
        const qrCodeUrl = await qr.toDataURL(scanUrl);
        palestra.qr_code = qrCodeUrl;
        palestra.qr_url = scanUrl;
        await palestra.save();

        res.json({ sucesso: true, mensagem: 'Palestra atualizada', dados: palestra });
    } catch (error) {
        res.status(500).json({ sucesso: false, erro: error.message });
    }
});

// Rota para deletar uma palestra (apenas se não finalizada)
router.delete('/:id', async (req, res) => {
    try {
        const palestra = await Palestra.findById(req.params.id);
        if (!palestra) return res.status(404).json({ sucesso: false, erro: 'Palestra não encontrada' });

        if (palestra.status === 'finalizada') {
            return res.status(400).json({ sucesso: false, erro: 'Não é possível deletar uma palestra finalizada' });
        }

        await Palestra.findByIdAndDelete(req.params.id);
        res.json({ sucesso: true, mensagem: 'Palestra removida com sucesso' });
    } catch (error) {
        res.status(500).json({ sucesso: false, erro: error.message });
    }
});

module.exports = router;