require('dotenv').config();

const { configureSecurity } = require('./utils/security');

// Configurar segurança baseado no ambiente
configureSecurity();

const express = require('express');
const passport = require('passport');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

require('./config/passportGoogle');
const { connectToDatabase } = require('./config/database');

// Rotas API
const authRoutes = require('./routes/authRoutes');
const docenteRoutes = require('./routes/docenteRoutes');
const participanteRoutes = require('./routes/participantes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const relatoriosRoutes = require('./routes/relatorios');
const presencaRoutes = require('./routes/presenca');
const inscricoesRoutes = require('./routes/inscricoes');
const palestrasRoutes = require('./routes/palestras');
const pontosRoutes = require('./routes/pontos');

connectToDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Permitir que Express reconheça IP real quando estiver atrás de proxy/reverso
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: false }));

const parsedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!parsedOrigins.length || !origin) {
      return callback(null, true);
    }
    if (parsedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin não autorizado pelo CORS'));
  }
};

app.use(cors(corsOptions));

const rateLimitWindowMinutes = Number(process.env.RATE_LIMIT_WINDOW_MINUTES || 15);
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || 300);

const limiter = rateLimit({
  windowMs: rateLimitWindowMinutes * 60 * 1000,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'seuSegredoAqui',
    resave: false,
    saveUninitialized: false,
    name: 'fatecweek.sid',
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ✅ AQUI — SERVIR OS ARQUIVOS HTML
// Serve arquivos da raiz do projeto (volta um nível a partir de /src)
// 🗂️ Arquivos estáticos (HTML/CSS/JS)
app.use(express.static('public'));



// Agora abre:
// http://localhost:3000/login-aluno.html
// http://localhost:3000/completar.html
// http://localhost:3000/dashboard-aluno.html
// http://localhost:3000/dashboard-docente.html

// Rotas API
app.use('/api/auth', authRoutes);
app.use('/api/docentes', docenteRoutes);
app.use('/api/participantes', participanteRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/presenca', presencaRoutes);
app.use('/api/inscricoes', inscricoesRoutes);
app.use('/api/palestras', palestrasRoutes);
app.use('/api/pontos', pontosRoutes);

app.get('/', (req, res) => {
  res.send('🚀 API rodando.');
});

app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
