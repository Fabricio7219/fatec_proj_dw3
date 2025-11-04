const { initializeModels } = require('../models');
let models;

// Inicializa os modelos
initializeModels()
    .then(loadedModels => {
        models = loadedModels;
        console.log('✅ Modelos inicializados com sucesso');
    })
    .catch(error => {
        console.error('❌ Erro ao inicializar modelos:', error);
        process.exit(1);
    });

// Verifica se usuário já existe
exports.verificarUsuario = async (req, res) => {
    try {
        const { email } = req.body;
        
        // Procura nos modelos de Participante e Docente
        const participante = await models.Participante.findOne({ email });
        const docente = await models.Docente.findOne({ email });
        
        if (participante || docente) {
            return res.json({
                existe: true,
                tipo: docente ? "docente" : "aluno"
            });
        }
        
        return res.json({ existe: false });
    } catch (error) {
        console.error("Erro ao verificar usuário:", error);
        res.status(500).json({ erro: "Erro ao verificar cadastro" });
    }
};

exports.completarPerfil = async (req, res) => {
  try {
    const { email, nome, ra, curso, semestre, fatec } = req.body;
    
    // Se o frontend enviar explicitamente o tipo, respeitamos; senão tentamos inferir
    const tipo = req.body.tipo || (email.includes("@fatec") ? "docente" : "aluno");

    if (!email) {
      return res.status(400).json({ mensagem: "Email é obrigatório." });
    }

  // Verifica se usuário já existe
    let usuario = await models.Usuario.findOne({ email });
    
    if (usuario) {
      // Se já existe, redireciona para dashboard apropriado
      return res.json({ 
        mensagem: "Usuário já cadastrado", 
        tipo: usuario.tipo,
        redirect: usuario.tipo === "docente" ? "/dashboard-docente.html" : "/dashboard-aluno.html"
      });
    }

    // Cria novo usuário (respeitando tipo enviado pelo cliente)
    usuario = await models.Usuario.create({ nome, email, tipo });

    if (tipo === 'aluno') {
      // Cria participante para aluno
      if (!ra || !semestre) {
        return res.status(400).json({ mensagem: "RA e semestre são obrigatórios para alunos." });
      }

      await models.Participante.create({
        nome,
        email,
        ra,
        curso,
        semestre,
        fatec,
        ativo: true
      });
    } else if (tipo === 'docente') {
      // Cria docente
      await models.Docente.create({
        nome,
        email,
        fatec,
        cursos: curso ? [curso] : [], // Inicial com o curso informado, se houver
        tipo: "docente"
      });
    }

    res.json({ 
      mensagem: "✅ Perfil salvo com sucesso!", 
      tipo,
      redirect: tipo === "docente" ? "/dashboard-docente.html" : "/dashboard-aluno.html"
    });
  } catch (err) {
    console.error("❌ Erro completar perfil:", err);
    res.status(500).json({ mensagem: "Erro ao salvar perfil." });
  }
};
