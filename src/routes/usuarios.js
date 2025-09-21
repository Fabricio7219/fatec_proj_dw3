const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || "segredo123";

// Cadastro
router.post('/cadastro', async (req, res) => {
    try {
        const { nome, ra, email, senha } = req.body;
        if (!nome || !ra || !email || !senha)
            return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });

        const existe = await Usuario.findOne({ $or: [{ ra }, { email }] });
        if (existe) return res.status(409).json({ erro: 'RA ou Email já cadastrado' });

        const novoUsuario = new Usuario({ nome, ra, email, senha });
        await novoUsuario.save();

        res.status(201).json({ sucesso: true, mensagem: 'Usuário cadastrado', usuario: novoUsuario });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const usuario = await Usuario.findOne({ email });
        if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });

        const senhaValida = await usuario.verificarSenha(senha);
        if (!senhaValida) return res.status(401).json({ erro: 'Senha inválida' });

        const token = jwt.sign({ id: usuario._id }, JWT_SECRET, { expiresIn: '2h' });
        res.json({ sucesso: true, token });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

module.exports = router;
