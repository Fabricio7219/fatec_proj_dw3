// src/config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Usuario = require('../models/Usuario');
const Participante = require('../models/Participante'); // 🔗 importa o modelo de participante

// Mostra se as variáveis foram carregadas
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET);

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/usuarios/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // 1️⃣ Verifica se já existe usuário com o email
        let usuario = await Usuario.findOne({ email: profile.emails[0].value });

        if (!usuario) {
            usuario = new Usuario({
                nome: profile.displayName,
                email: profile.emails[0].value,
                senha: Math.random().toString(36).slice(-8) // senha aleatória
            });
            await usuario.save();
        }

        // 2️⃣ Vincula ou cria participante com base no email
        let participante = await Participante.findOne({ email: usuario.email });

        if (!participante) {
            participante = new Participante({
                ra: Math.random().toString(36).slice(-6), // RA aleatório
                nome: usuario.nome,
                email: usuario.email,
                curso: "Não informado",
                usuarioId: usuario._id
            });
            await participante.save();
        } else if (!participante.usuarioId) {
            participante.usuarioId = usuario._id;
            await participante.save();
        }

        // Retorna o usuário logado
        done(null, usuario);
    } catch (err) {
        done(err, null);
    }
}));

// Serialize e deserialize
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    const user = await Usuario.findById(id);
    done(null, user);
});
