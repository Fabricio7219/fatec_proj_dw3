require('dotenv').config(); // ⚠️ Deve vir antes de qualquer importação que use env

const express = require("express");
const session = require("express-session");
const passport = require("passport");
require("./config/passport"); // importa passport configurado
const { connectToDatabase } = require("./config/database");
const participanteRoutes = require("./routes/participantes");
const usuarioRoutes = require("./routes/usuarioRoutes");

connectToDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Sessões
app.use(session({
    secret: "seuSegredoAqui",
    resave: false,
    saveUninitialized: true
}));

// Inicializa Passport
app.use(passport.initialize());
app.use(passport.session());

// Rotas
app.use("/participantes", participanteRoutes);
app.use("/usuarios", usuarioRoutes);

app.get("/", (req, res) => {
    res.send("🚀 API Fatec funcionando!");
});

const relatoriosRoutes = require("./routes/relatorios");
app.use("/relatorios", relatoriosRoutes);

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
