const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const Usuario = require("../models/Usuario");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const nome = profile.displayName;

        // Verifica se já existe no banco
        let usuario = await Usuario.findOne({ email });

        if (!usuario) {
          console.log("🆕 Novo usuário detectado:", email);

          usuario = await Usuario.create({
            nome,
            email,
            tipo: "aluno", // Padrão é aluno, pode ser alterado depois
          });
        } else {
          console.log("🔁 Usuário já existe:", email);
        }

        return done(null, usuario);
      } catch (err) {
        console.error("❌ Erro Login Google:", err);
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const usuario = await Usuario.findById(id);
    done(null, usuario);
  } catch (err) {
    done(err, null);
  }
});

console.log("✅ Google OAuth configurado!");
