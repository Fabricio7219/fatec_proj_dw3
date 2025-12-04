const api = {
  palestras: '/palestras',
  presenca: id => '/presenca/palestra/' + id,
  me: '/auth/me',
  logout: '/auth/logout',
  admins: '/usuarios/admins'
};

// Helper para detectar ambiente e construir URL da API
function buildApiUrl(path) {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || !host;
    if ((window.location.port !== '3000' && isLocal) || window.location.protocol === 'file:') {
        return 'http://localhost:3000/api' + (path.startsWith('/') ? path : '/' + path);
    }
    return '/api' + (path.startsWith('/') ? path : '/' + path);
}

async function fetchJson(url, opts) {
  try {
    const fullUrl = url.startsWith('http') ? url : buildApiUrl(url);
    const res = await fetch(fullUrl, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts });
    if (res.status === 401 || res.status === 403) {
        // Se não autorizado, lança erro específico ou redireciona
        // throw { status: res.status, message: 'Unauthorized' };
    }
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function showEditForm(id) {
  try {
    const resp = await fetchJson(api.palestras + '/' + id);
    const palestra = (resp && resp.dados) ? resp.dados : resp;
    openPalestraModal('edit', palestra);
  } catch (err) {
    alert('Erro ao carregar palestra para edição');
    console.error(err);
  }
}

function hideAllModals() {
  try {
    document.getElementById('palestraModal')?.classList.add('hidden');
    document.getElementById('qrModal')?.classList.add('hidden');
  } catch (e) {}
}

async function loadUser() {
  try {
    const u = await fetchJson(api.me);
    if (!u || !(u.tipo === 'docente' || u.tipo === 'admin')) {
      hideAllModals();
      document.getElementById('userName').textContent = '';
      document.querySelector('main').innerHTML = `
        <div class="card">
          <h3>Acesso restrito</h3>
          <p class="small">É necessário efetuar login como docente/administrador para acessar o painel.</p>
          <div style="margin-top:8px"><button class="btn" onclick="window.location.href='/api/auth/google'">Entrar com Google</button></div>
        </div>`;
      throw new Error('Acesso restrito');
    }
    document.getElementById('userName').textContent = u.nome || u.email || '';
    return u;
  } catch (e) {
    try {
      hideAllModals();
      document.getElementById('userName').textContent = '';
      document.querySelector('main').innerHTML = `
        <div class="card">
          <h3>Faça login</h3>
          <p class="small">Para acessar o painel administrativo, entre com sua conta Google (docente/admin).</p>
          <div style="margin-top:8px"><button class="btn" onclick="window.location.href='/api/auth/google'">Entrar com Google</button></div>
        </div>`;
    } catch (ignore) {}
    throw e;
  }
}

async function loadPalestras() {
  const container = document.getElementById('palestrasList');
  container.innerHTML = 'Carregando...';
  try {
    let data = await fetchJson(api.palestras);
    if (data && data.dados && Array.isArray(data.dados)) data = data.dados;
    if (!Array.isArray(data)) data = [];
    if (data.length === 0) {
      container.innerHTML = '<div class="small">Nenhuma palestra cadastrada.</div>';
      updateStats([]);
      return;
    }
    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th>Título</th><th>Data</th><th>Local</th><th>Vagas</th><th>Pontos</th><th>Ações</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    data.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(p.titulo || '')}</strong><div class="small">${escapeHtml(p.palestrante || '')}</div></td>
        <td>${p.data ? new Date(p.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
        <td>${escapeHtml(p.local || '-')}</td>
        <td>${p.vagas ?? '-'}</td>
        <td>${p.pontos ?? 0}</td>
        <td class="actions">
          <button class="btn" data-id="${p._id}" data-action="view">Presenças</button>
          <button class="btn" data-id="${p._id}" data-action="qr">QR</button>
          <button class="btn" data-id="${p._id}" data-action="edit">Editar</button>
          <button class="btn danger" data-id="${p._id}" data-action="delete">Remover</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);

    container.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.dataset.id;
        const action = b.dataset.action;
        if (action === 'view') return viewPresencas(id);
        if (action === 'qr') return showQr(id);
        if (action === 'edit') return showEditForm(id);
        if (action === 'delete') return deletePalestra(id);
      });
    });

    updateStats(data);
  } catch (err) {
    document.getElementById('palestrasList').innerHTML = `<div class="small">Erro ao carregar palestras</div>`;
  }
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function updateStats(palestras) {
  const total = palestras.length;
  const vagas = palestras.reduce((s, p) => s + (Number(p.vagas) || 0), 0);
  document.getElementById('stats').innerHTML = `Total palestras: <strong>${total}</strong><br>Total vagas: <strong>${vagas}</strong>`;
}

async function loadInscricoes() {
  const container = document.getElementById('inscricoesList');
  container.innerHTML = 'Carregando inscrições...';
  try {
    let resp = await fetch('/api/inscricoes', { credentials: 'include' });
    if (!resp.ok) throw new Error('Erro ao buscar');
    let json = await resp.json();
    let lista = [];
    if (json.dados && Array.isArray(json.dados)) lista = json.dados;
    else if (Array.isArray(json)) lista = json;
    else if (json.length) lista = json;

    if (lista.length === 0) {
      container.innerHTML = '<div class="small">Nenhuma inscrição registrada.</div>';
      return;
    }

    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th>Usuário</th><th>Palestra</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    lista.forEach(item => {
      const tr = document.createElement('tr');
      const participante = (item.participanteId && (item.participanteId.nome || item.participanteId.email)) || item.email || (item.participante && item.participante.nome) || '—';
      const palestra = (item.palestraId && (item.palestraId.titulo || item.palestraId)) || item.palestra || '—';
      const data = item.createdAt ? new Date(item.createdAt).toLocaleString() : '-';
      tr.innerHTML = `<td>${escapeHtml(participante)}</td><td>${escapeHtml(palestra)}</td><td>${data}</td><td>${escapeHtml(item.status || '—')}</td><td><button class="btn" data-id="${item._id}" data-action="cancel">Cancelar</button></td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);

    container.querySelectorAll('button[data-action="cancel"]').forEach(b => {
      b.addEventListener('click', async () => {
        if (!confirm('Confirmar cancelamento desta inscrição?')) return;
        const id = b.dataset.id;
        try {
          const r = await fetch('/api/inscricoes/' + id, { method: 'DELETE', credentials: 'include' });
          if (!r.ok) throw new Error('Erro');
          await loadInscricoes();
        } catch (err) {
          alert('Erro ao cancelar inscrição');
        }
      });
    });
  } catch (err) {
    container.innerHTML = '<div class="small">Erro ao carregar inscrições</div>';
  }
}

async function loadAdmins() {
  const container = document.getElementById('adminList');
  container.innerHTML = 'Carregando administradores...';
  try {
    const resp = await fetchJson(api.admins);
    let lista = [];
    if (resp && Array.isArray(resp.admins)) lista = resp.admins;

    if (lista.length === 0) {
      container.innerHTML = '<div class="small">Nenhum administrador cadastrado.</div>';
      return;
    }

    const table = document.createElement('table');
    table.innerHTML = '<thead><tr><th>Nome</th><th>Email</th><th>Criado em</th><th>Ações</th></tr></thead>';
    const tbody = document.createElement('tbody');
    lista.forEach(item => {
      const tr = document.createElement('tr');
      const criado = item.createdAt ? new Date(item.createdAt).toLocaleString() : '-';
      tr.innerHTML = `<td>${escapeHtml(item.nome || '-')}</td><td>${escapeHtml(item.email || '-')}</td><td>${criado}</td><td><button class="btn danger" data-id="${item._id}" data-action="delete-admin">Remover</button></td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);

    container.querySelectorAll('button[data-action="delete-admin"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remover este administrador?')) return;
        try {
          await fetchJson(`${api.admins}/${btn.dataset.id}`, { method: 'DELETE' });
          await loadAdmins();
        } catch (err) {
          alert('Erro ao remover administrador');
        }
      });
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div class="small">Erro ao carregar administradores</div>';
  }
}

async function loadDocentes() {
  const container = document.getElementById('docentesList');
  if (!container) return;
  container.innerHTML = 'Carregando docentes...';
  try {
    const resp = await fetch('/api/docentes');
    if (!resp.ok) throw new Error('Erro');
    const lista = await resp.json();
    if (!Array.isArray(lista) || lista.length === 0) {
      container.innerHTML = '<div class="small">Nenhum docente cadastrado.</div>';
      return;
    }
    const table = document.createElement('table');
    table.innerHTML = '<thead><tr><th>Nome</th><th>Email</th><th>Fatec</th><th>Cursos</th><th>Ações</th></tr></thead>';
    const tbody = document.createElement('tbody');
    lista.forEach(d => {
      const tr = document.createElement('tr');
      const cursos = Array.isArray(d.cursos) ? d.cursos.join(', ') : (d.cursos || '');
      tr.innerHTML = `<td>${escapeHtml(d.nome || '-')}</td><td>${escapeHtml(d.email || '-')}</td><td>${escapeHtml(d.fatec || '-')}</td><td>${escapeHtml(cursos)}</td><td><button class="btn danger" data-id="${d._id}" data-action="delete-docente">Remover</button></td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);

    container.querySelectorAll('button[data-action="delete-docente"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remover este docente?')) return;
        try {
          const r = await fetch(`/api/docentes/${btn.dataset.id}`, { method: 'DELETE' });
          if (!r.ok) throw new Error('Erro');
          await loadDocentes();
        } catch (e) {
          alert('Erro ao remover docente');
        }
      });
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div class="small">Erro ao carregar docentes</div>';
  }
}

function closeModal() {
  document.getElementById('palestraModal').classList.add('hidden');
  document.getElementById('m_titulo').value = '';
  document.getElementById('m_palestrante').value = '';
  document.getElementById('m_data_br').value = '';
  document.getElementById('m_hora').value = '';
  document.getElementById('m_local').value = '';
  document.getElementById('m_vagas').value = '';
  document.getElementById('m_tipo').value = 'palestra';
  document.getElementById('m_pontos').value = '';
  document.getElementById('m_descricao').value = '';
}

function openPalestraModal(mode, data) {
  document.getElementById('palestraModal').classList.remove('hidden');
  document.getElementById('modalTitle').textContent = mode === 'edit' ? 'Editar Palestra' : 'Nova Palestra';
  document.getElementById('m_titulo').value = data?.titulo || '';
  document.getElementById('m_palestrante').value = data?.palestrante || '';
  document.getElementById('m_duracao').value = data?.duracao_minutos || '';
  const d = data?.data ? new Date(data.data) : null;
  if (d && !isNaN(d)) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    document.getElementById('m_data_br').value = `${yyyy}-${mm}-${dd}`;
    document.getElementById('m_hora').value = `${hh}:${mi}`;
  } else {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    document.getElementById('m_data_br').value = `${yyyy}-${mm}-${dd}`;
    document.getElementById('m_hora').value = '19:00';
  }
  document.getElementById('m_local').value = data?.local || '';
  document.getElementById('m_vagas').value = data?.vagas || '';
  document.getElementById('m_tipo').value = data?.tipo || 'palestra';
  const defaultPalestra = 0.15;
  const defaultExpo = 0.20;
  const pontosVal = (data && typeof data.pontos !== 'undefined') ? data.pontos : ((data?.tipo || 'palestra') === 'exposicao' ? defaultExpo : defaultPalestra);
  document.getElementById('m_pontos').value = pontosVal;
  document.getElementById('m_descricao').value = data?.descricao || '';
  document.getElementById('m_lat').value = (data?.localizacao && data.localizacao.lat != null) ? data.localizacao.lat : '';
  document.getElementById('m_lng').value = (data?.localizacao && data.localizacao.lng != null) ? data.localizacao.lng : '';
  document.getElementById('m_raio').value = (data?.localizacao && data.localizacao.raio_metros != null) ? data.localizacao.raio_metros : '';
  document.getElementById('m_save').dataset.mode = mode;
  document.getElementById('m_save').dataset.id = data?._id || '';
}

async function deletePalestra(id) {
  if (!confirm('Confirma remoção desta palestra?')) return;
  try {
    await fetchJson(api.palestras + '/' + id, { method: 'DELETE' });
    await loadPalestras();
  } catch (err) {
    alert('Erro ao remover palestra');
  }
}

async function savePalestraFromModal() {
  const mode = document.getElementById('m_save').dataset.mode;
  const id = document.getElementById('m_save').dataset.id;
  const titulo = document.getElementById('m_titulo').value.trim();
  if (!titulo) {
    alert('Título obrigatório');
    return;
  }
  const palestrante = document.getElementById('m_palestrante').value.trim();
  const dataBr = document.getElementById('m_data_br').value.trim();
  const hora = document.getElementById('m_hora').value.trim();
  const local = document.getElementById('m_local').value.trim();
  const vagas = Number(document.getElementById('m_vagas').value || 0);
  const tipo = document.getElementById('m_tipo').value || 'palestra';
  const pontos = Number(document.getElementById('m_pontos').value || 0);
  const duracao = Number(document.getElementById('m_duracao').value || 60);
  const descricao = document.getElementById('m_descricao').value.trim();
  if (!dataBr || !hora) {
    alert('Informe data e hora');
    return;
  }
  // dataBr vem do input type="date" (YYYY-MM-DD)
  const dataIsoLocal = `${dataBr}T${hora}`;
  const latVal = document.getElementById('m_lat').value;
  const lngVal = document.getElementById('m_lng').value;
  const raioVal = document.getElementById('m_raio').value;
  const localizacao = (latVal !== '' && lngVal !== '') ? {
    lat: Number(latVal),
    lng: Number(lngVal),
    raio_metros: Number(raioVal || 50)
  } : undefined;

  const body = { titulo, palestrante, data: dataIsoLocal, local, vagas, tipo, pontos, descricao, duracao_minutos: duracao };
  if (localizacao) body.localizacao = localizacao;
  try {
    if (mode === 'edit' && id) {
      await fetchJson(api.palestras + '/' + id, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await fetchJson(api.palestras, { method: 'POST', body: JSON.stringify(body) });
    }
    closeModal();
    await loadPalestras();
  } catch (err) {
    alert('Erro ao salvar palestra');
    console.error(err);
  }
}

async function viewPresencas(id) {
  const details = document.getElementById('palestraDetails');
  details.innerHTML = 'Carregando presenças...';
  try {
    const pres = await fetchJson(api.presenca(id));
    if (!Array.isArray(pres) || pres.length === 0) {
      details.innerHTML = '<div class="small">Nenhuma presença registrada.</div>';
      return;
    }
    let html = '<table><thead><tr><th>Nome</th><th>Email</th><th>Entrada</th><th>Saída</th></tr></thead><tbody>';
    pres.forEach(r => {
      html += `<tr><td>${escapeHtml((r.participante || {}).nome || (r.nome || ''))}</td><td>${escapeHtml((r.participante || {}).email || r.email || '')}</td><td>${r.entrada ? new Date(r.entrada).toLocaleString() : '-'}</td><td>${r.saida ? new Date(r.saida).toLocaleString() : '-'}</td></tr>`;
    });
    html += '</tbody></table>';
    details.innerHTML = html;
  } catch (err) {
    details.innerHTML = '<div class="small">Erro ao carregar presenças.</div>';
  }
}

async function showQr(id) {
  const modal = document.getElementById('qrModal');
  const img = document.getElementById('qrImage');
  const meta = document.getElementById('qrMeta');
  modal.classList.remove('hidden');
  meta.textContent = 'Carregando...';
  img.src = '';
  try {
    const resp = await fetchJson(api.palestras + '/' + id);
    const palestra = (resp && resp.dados) ? resp.dados : resp;
    const qr = palestra.qr_code || palestra.qrcode || palestra.qr || null;
    if (!qr) {
      meta.textContent = 'QR não disponível para esta palestra.';
      return;
    }
    img.src = qr;
    meta.textContent = `${palestra.titulo || ''} — ${palestra.palestrante || ''}`;
    modal.dataset.currentQr = qr;
    modal.dataset.titulo = palestra.titulo || '';
    modal.dataset.palestrante = palestra.palestrante || '';
  } catch (err) {
    meta.textContent = 'Erro ao carregar QR.';
    console.error(err);
  }
}

function closeQrModal() {
  const modal = document.getElementById('qrModal');
  modal.classList.add('hidden');
  delete modal.dataset.currentQr;
}

document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'qrClose') closeQrModal();
  if (e.target && e.target.id === 'qrPrint') {
    const modal = document.getElementById('qrModal');
    const qr = modal.dataset.currentQr;
    if (!qr) return alert('QR não carregado');
    const titulo = modal.dataset.titulo || '';
    const palestrante = modal.dataset.palestrante || '';
    const w = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Imprimir QR</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #111; }
            .container { max-width: 720px; margin: 0 auto; text-align: center; }
            h1 { font-size: 22px; margin: 0 0 8px; }
            h2 { font-size: 26px; margin: 0 0 12px; color: #222; }
            .sub { font-size: 18px; margin: 0 0 20px; color: #444; }
            .qr { border: 1px solid #ddd; padding: 12px; background:#fff; display: inline-block; }
            .note { margin-top: 10px; font-size: 14px; color: #555; }
            @media print {
              .note { color: #000; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Seja bem-vindo(a) à palestra</h1>
            <h2>${titulo ? titulo.replace(/</g, '&lt;') : ''}</h2>
            <div class="sub">com ${palestrante ? palestrante.replace(/</g, '&lt;') : 'palestrante a definir'}</div>
            <div class="qr">
              <img src="${qr}" alt="QR Code" style="max-width: 100%; height: auto;"/>
            </div>
            <div class="note">Escaneie este QR para registrar sua presença (entrada/saída).</div>
          </div>
        </body>
      </html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  }
  if (e.target && e.target.id === 'qrDownload') {
    const modal = document.getElementById('qrModal');
    const qr = modal.dataset.currentQr;
    if (!qr) return alert('QR não carregado');
    const titulo = (modal.dataset.titulo || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '').substring(0, 40);
    const a = document.createElement('a');
    a.href = qr;
    a.download = titulo ? `qr_${titulo}.png` : 'qr_palestra.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
});

document.getElementById('btnCreateNew').addEventListener('click', () => openPalestraModal('create'));
document.getElementById('m_cancel').addEventListener('click', () => closeModal());
document.getElementById('m_save').addEventListener('click', () => savePalestraFromModal());
document.getElementById('m_tipo').addEventListener('change', () => {
  const tipo = document.getElementById('m_tipo').value;
  const pontosEl = document.getElementById('m_pontos');
  const atual = pontosEl.value;
  if (atual === '' || Number(atual) === 0) {
    pontosEl.value = (tipo === 'exposicao') ? 0.20 : 0.15;
  }
});
document.getElementById('btnLogout').addEventListener('click', async () => {
  try {
    const apiUrl = buildApiUrl(api.logout);
    await fetch(apiUrl, { method: 'POST', credentials: 'include' });
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/index.html';
  } catch (e) {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = buildApiUrl(api.logout);
  }
});
document.getElementById('adminForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const nome = document.getElementById('adminNome').value.trim();
  const email = document.getElementById('adminEmail').value.trim();
  const senha = document.getElementById('adminSenha').value.trim();
  if (!nome || !email || !senha) {
    alert('Informe nome, email e senha');
    return;
  }
  try {
    await fetchJson(api.admins, {
      method: 'POST',
      body: JSON.stringify({ nome, email, senha })
    });
    document.getElementById('adminForm').reset();
    await loadAdmins();
  } catch (err) {
    alert('Erro ao criar administrador');
  }
});

document.getElementById('docenteForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const nome = document.getElementById('docenteNome').value.trim();
  const email = document.getElementById('docenteEmail').value.trim();
  const fatec = document.getElementById('docenteFatec').value.trim();
  const cursosStr = document.getElementById('docenteCursos').value.trim();
  if (!nome || !email || !fatec) {
    alert('Informe nome, email e Fatec');
    return;
  }
  const cursos = cursosStr ? cursosStr.split(',').map(s => s.trim()).filter(Boolean) : [];
  try {
    await fetchJson('/docentes', {
      method: 'POST',
      body: JSON.stringify({ nome, email, fatec, cursos })
    });
    document.getElementById('docenteForm').reset();
    await loadDocentes();
  } catch (err) {
    alert(err.erro || 'Erro ao criar docente');
  }
});

document.getElementById('volForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const ra = document.getElementById('volRa').value.trim();
  const valorRaw = document.getElementById('volValor').value;
  const motivo = document.getElementById('volMotivo').value.trim();
  const msg = document.getElementById('volMsg');
  msg.textContent = '';
  if (!ra) {
    alert('Informe o RA');
    return;
  }
  let valor = Number(valorRaw);
  if (Number.isNaN(valor)) valor = 1;
  if (valor < 0) valor = 0;
  if (valor > 1) valor = 1;
  try {
    const j = await fetchJson('/pontos/voluntario', {
      method: 'POST',
      body: JSON.stringify({ ra, valor, motivo: motivo || undefined })
    });
    msg.style.color = '#27ae60';
    msg.textContent = `Sucesso: creditado ${j?.dados?.creditado ?? valor} ponto(s). Total agora: ${j?.dados?.pontos_total ?? '—'}.`;
    document.getElementById('volForm').reset();
    document.getElementById('volValor').value = 1;
  } catch (err) {
    msg.style.color = '#e74c3c';
    msg.textContent = 'Falha ao creditar: ' + (err?.message || 'erro').toString();
  }
});

(async function init() {
  await loadUser();
  await loadPalestras();
  await loadInscricoes();
  await loadAdmins();
  await loadDocentes();
})();
