document.addEventListener('DOMContentLoaded', () => {
  function getSafeReturnTo() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('returnTo');
    if (!raw) return null;
    if (!raw.startsWith('/')) return null;
    if (raw.startsWith('//')) return null;
    if (raw.includes('http://') || raw.includes('https://')) return null;
    return raw;
  }

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
  const emailField = document.getElementById('email');
  const nomeField = document.getElementById('nome');

  if (!form || !camposAluno || !emailField || !nomeField) {
    console.error('Elementos necessários não foram encontrados em completar-perfil.');
    return;
  }

  camposAluno.style.display = 'block';

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
    } catch (err) {
      console.error('Erro ao carregar dados do usuário:', err);
      emailField.value = localStorage.getItem('email') || '';
      nomeField.value = localStorage.getItem('nome') || '';
    }
  }

  preencherDadosUsuario();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const tipo = 'aluno';

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
      const returnTo = getSafeReturnTo();
      window.location.href = returnTo || '/dashboard-aluno.html';
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      alert('Erro ao salvar perfil. Tente novamente.');
    }
  });
});
