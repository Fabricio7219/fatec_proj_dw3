document.addEventListener('DOMContentLoaded', () => {
  // Helper para detectar ambiente e construir URL da API
  function buildApiUrl(path) {
      const host = window.location.hostname;
      const isLocal = host === 'localhost' || host === '127.0.0.1' || !host;
      if ((window.location.port !== '3000' && isLocal) || window.location.protocol === 'file:') {
          return 'http://localhost:3000/api' + (path.startsWith('/') ? path : '/' + path);
      }
      return '/api' + (path.startsWith('/') ? path : '/' + path);
  }

  const form = document.getElementById('formPerfil');
  const camposAluno = document.getElementById('camposAluno');
  const tipoAluno = document.getElementById('tipoAluno');
  const tipoDocente = document.getElementById('tipoDocente');
  const emailField = document.getElementById('email');
  const nomeField = document.getElementById('nome');

  if (!form || !camposAluno || !tipoAluno || !tipoDocente || !emailField || !nomeField) {
    console.error('Elementos necessários não foram encontrados em completar-perfil.');
    return;
  }

  function updateCampos() {
    const tipoSelecionado = document.querySelector('input[name="tipo"]:checked');
    if (tipoSelecionado && tipoSelecionado.value === 'aluno') {
      camposAluno.style.display = 'block';
    } else {
      camposAluno.style.display = 'none';
    }
  }

  tipoAluno.addEventListener('change', updateCampos);
  tipoDocente.addEventListener('change', updateCampos);

  tipoAluno.checked = true;
  updateCampos();

  async function preencherDadosUsuario() {
    try {
      const res = await fetch(buildApiUrl('/auth/me'), { credentials: 'include' });
      if (!res.ok) {
        emailField.value = localStorage.getItem('email') || '';
        nomeField.value = localStorage.getItem('nome') || '';
        return;
      }

      const user = await res.json();
      if (user.cadastroCompleto) {
        if (user.tipo === 'admin') {
          window.location.href = '/admin.html';
          return;
        }
        window.location.href = user.tipo === 'docente' ? '/dashboard-docente.html' : '/dashboard-aluno.html';
        return;
      }

      emailField.value = user.email || localStorage.getItem('email') || '';
      nomeField.value = user.nome || user.displayName || localStorage.getItem('nome') || '';

      if (user.tipo === 'docente') {
        tipoDocente.checked = true;
      } else {
        tipoAluno.checked = true;
      }
      updateCampos();
    } catch (err) {
      console.error('Erro ao carregar dados do usuário:', err);
      emailField.value = localStorage.getItem('email') || '';
      nomeField.value = localStorage.getItem('nome') || '';
      tipoAluno.checked = true;
      updateCampos();
    }
  }

  preencherDadosUsuario();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const tipo = formData.get('tipo');

    if (!tipo) {
      alert('Escolha se você é Aluno ou Docente');
      return;
    }

    let emailVal = formData.get('email');
    let nomeVal = formData.get('nome');

    if (!emailVal || !nomeVal) {
      try {
        const me = await fetch(buildApiUrl('/auth/me'), { credentials: 'include' });
        if (me.ok) {
          const u = await me.json();
          emailVal = emailVal || u.email || '';
          nomeVal = nomeVal || u.nome || u.displayName || '';
        }
      } catch (err) {
        console.warn('Não foi possível obter /api/auth/me antes do submit:', err);
      }
    }

    const payload = {
      email: emailVal,
      nome: nomeVal,
      tipo,
      fatec: formData.get('fatec') || undefined,
      curso: formData.get('curso') || undefined
    };

    if (tipo === 'aluno') {
      payload.ra = formData.get('ra');
      payload.semestre = formData.get('semestre');
      if (!payload.ra || !payload.semestre) {
        alert('RA e semestre são obrigatórios para alunos');
        return;
      }
    }

    try {
      const resp = await fetch(buildApiUrl('/auth/completar'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await resp.json();
      if (!resp.ok) {
        alert(data.erro || data.mensagem || 'Erro ao salvar perfil');
        return;
      }

      alert(data.mensagem || 'Perfil salvo com sucesso');
      window.location.href = tipo === 'docente' ? '/dashboard-docente.html' : '/dashboard-aluno.html';
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      alert('Erro ao salvar perfil. Tente novamente.');
    }
  });
});
