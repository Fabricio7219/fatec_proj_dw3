const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const Usuario = require("../models/Usuario");
const Participante = require("../models/Participante");
const Docente = require("../models/Docente");

console.log("✅ Modelos carregados:", { 
  Usuario: !!Usuario, 
  Participante: !!Participante, 
  Docente: !!Docente 
});

// Estratégia: não criamos registros automaticamente aqui.
// Apenas retornamos o perfil básico ao Passport e deixamos a lógica de criação/atualização
// para as rotas (ex: /api/auth/completar ou fluxo de callback em authRoutes).
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI,
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("🔍 Perfil Google recebido:", {
          id: profile.id,
          displayName: profile.displayName,
          emails: profile.emails
        });

        const email = profile.emails?.[0]?.value;
        const nome = profile.displayName || profile.name?.givenName || '';
        
        if (!email) {
          console.error("❌ Email não disponível no perfil Google");
          return done(new Error('E-mail não disponível no perfil Google'));
        }

        console.log("✅ Autenticação Google bem sucedida para:", email);
        
        // Passa um objeto simples para a sessão. A rota de callback decide o que criar/atualizar.
        return done(null, { email, nome });
      } catch (err) {
        console.error("❌ Erro Login Google:", err);
        return done(err, null);
      }
    }
  )
);

// Serializa apenas o email (string) para a sessão
passport.serializeUser((user, done) => {
  if (!user) return done(new Error('No user to serialize'));
  done(null, user.email || user);
});

// Desserializa consultando as coleções na ordem Usuario -> Participante -> Docente
passport.deserializeUser(async (email, done) => {
  try {
    if (!email) return done(null, null);
    
    try {
      // 1) Usuario (manuais / completados)
      const usuario = await Usuario.findOne({ email });
      if (usuario) {
        return done(null, { 
          origem: 'usuario', 
          data: usuario, 
          email: usuario.email, 
          nome: usuario.nome, 
          tipo: usuario.tipo || 'aluno' 
        });
      }

      // 2) Participante (alunos)
      const participante = await Participante.findOne({ email });
      if (participante) {
        return done(null, { 
          origem: 'participante', 
          data: participante, 
          email: participante.email, 
          nome: participante.nome, 
          tipo: 'aluno' 
        });
      }

      // 3) Docente
      const docente = await Docente.findOne({ email });
      if (docente) {
        return done(null, { 
          origem: 'docente', 
          data: docente, 
          email: docente.email, 
          nome: docente.nome, 
          tipo: 'docente' 
        });
      }

      // Não encontrado — retorna objeto mínimo com email
      return done(null, { 
        origem: 'oauth', 
        data: { email }, 
        email, 
        nome: undefined, 
        tipo: undefined 
      });
    } catch (err) {
      console.error('Erro ao buscar usuário:', err);
      return done(err);
    }
  } catch (err) {
    console.error('Erro no deserializeUser (Google):', err);
    done(err, null);
  }
});

console.log("✅ Google OAuth configurado (não cria registros automaticamente).");
