// --- Configuração da API ---
const API_BASE_URL = (function() {
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    const port = window.location.port;
    
    // Se estiver rodando em arquivo ou porta diferente de 3000, assume localhost:3000
    if (protocol === 'file:' || (port && port !== '3000')) {
        return 'http://localhost:3000';
    }
    return '';
})();

function buildApiUrl(path) {
    if (/^https?:/.test(path)) return path;
    const base = API_BASE_URL;
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return base + cleanPath;
}

async function apiFetch(path, options = {}) {
    const url = buildApiUrl(path.startsWith('/api') ? path : '/api' + (path.startsWith('/') ? path : '/' + path));
    const defaultOptions = { credentials: 'include' };
    const finalOptions = { ...defaultOptions, ...options };
    return fetch(url, finalOptions);
}

// --- Estado Global ---
let palestraSelecionada = null;
let todosOsDados = [];

// --- Autenticação e Usuário ---
async function preencherHeaderUsuario() {
    try {
        const res = await apiFetch('/auth/me');
        if (res.ok) {
            const data = await res.json();
            if (data && data.nome) {
                const userNomeEl = document.getElementById('userNome');
                if (userNomeEl) userNomeEl.textContent = data.nome;
            }
        } else {
            const userNomeEl = document.getElementById('userNome');
            if (userNomeEl) userNomeEl.textContent = 'Docente';
        }
    } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        const userNomeEl = document.getElementById('userNome');
        if (userNomeEl) userNomeEl.textContent = 'Docente';
    }
}

async function logoutUsuario(e) {
    if (e) e.preventDefault();
    console.log('Iniciando logout...');
    
    try {
        // Tenta fazer logout via POST (padrão)
        const res = await apiFetch('/auth/logout', { method: 'POST' });
        
        localStorage.clear();
        sessionStorage.clear();

        if (res.ok) {
            console.log('Logout POST realizado com sucesso');
            window.location.href = 'index.html';
        } else {
            console.warn('Logout POST retornou erro, tentando fallback GET');
            window.location.href = buildApiUrl('/api/auth/logout');
        }
    } catch (error) {
        console.error('Erro de rede ao tentar logout, forçando redirecionamento', error);
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = buildApiUrl('/api/auth/logout');
    }
}

// --- Palestras e Presenças ---
async function carregarPalestras() {
    try {
        const res = await apiFetch('/palestras');
        if (!res.ok) throw new Error('Falha ao buscar palestras');
        
        const json = await res.json();
        const palestras = (json && json.dados) ? json.dados : (Array.isArray(json) ? json : []);
        const grid = document.getElementById('palestrasGrid');
        
        if (!grid) return;
        grid.innerHTML = '';

        if (palestras.length === 0) {
            grid.innerHTML = '<p>Nenhuma palestra encontrada.</p>';
            return;
        }

        palestras.forEach((p, idx) => {
            const btn = document.createElement('button');
            btn.className = 'palestra-btn';
            if (idx === 0) btn.classList.add('active');
            btn.setAttribute('data-id', p._id || p.id);
            
            // Event listener para seleção
            btn.addEventListener('click', () => selecionarPalestra(p._id || p.id, p.titulo));
            
            btn.innerHTML = `
                <span class="palestra-icon">🎤</span>
                <span class="palestra-titulo">${p.titulo || 'Sem título'}</span>
                <span class="palestra-tema">${p.palestrante || ''}</span>
                <span class="palestra-info">${new Date(p.data).toLocaleString('pt-BR')}</span>
            `;
            grid.appendChild(btn);
        });

        // Selecionar a primeira palestra por padrão
        if (palestras.length > 0) {
            selecionarPalestra(palestras[0]._id || palestras[0].id, palestras[0].titulo);
        }
    } catch (err) {
        console.error('Erro ao carregar palestras:', err);
        const grid = document.getElementById('palestrasGrid');
        if (grid) grid.innerText = 'Erro ao carregar palestras';
    }
}

function selecionarPalestra(id, titulo) {
    palestraSelecionada = id;
    const nomeEl = document.getElementById('palestraNome');
    if (nomeEl) nomeEl.textContent = titulo;
    
    // Atualizar botões ativos
    document.querySelectorAll('.palestra-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.getAttribute('data-id') === String(id)) {
            btn.classList.add('active');
        }
    });

    carregarPresencas(id);
}

async function carregarPresencas(palestraId) {
    try {
        const res = await apiFetch(`/presenca/palestra/${palestraId}`);
        if (!res.ok) throw new Error('Erro ao buscar presenças');
        
        const json = await res.json();
        if (json && json.dados) {
            // Mapear para formato esperado pela UI
            todosOsDados = json.dados.map(p => {
                const part = p.participanteId || {};
                return {
                    ra: part.ra || (part.ra && part.ra.toString()) || '-',
                    nome: part.nome || part.email || '—',
                    fatec: part.campus || part.fatec || '-',
                    curso: part.curso || '-',
                    data: new Date(p.horario_entrada).toLocaleDateString('pt-BR'),
                    entrada: new Date(p.horario_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    saida: p.horario_saida ? new Date(p.horario_saida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                    status: p.horario_saida ? 'saiu' : 'presente'
                };
            });
        } else {
            todosOsDados = [];
        }

        renderizarTabela(todosOsDados);
        atualizarEstatisticas(todosOsDados);
    } catch (err) {
        console.error('Erro ao carregar presenças:', err);
        todosOsDados = [];
        renderizarTabela(todosOsDados);
        atualizarEstatisticas(todosOsDados);
    }
}

function renderizarTabela(dados) {
    const tbody = document.getElementById('tabelaPresencas');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (dados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">Nenhum registro encontrado</td></tr>';
        const totalEl = document.getElementById('totalRegistros');
        if (totalEl) totalEl.textContent = '0';
        return;
    }
    
    dados.forEach(aluno => {
        const tr = document.createElement('tr');
        const statusClass = aluno.status === 'presente' ? 'status-presente' : 'status-saiu';
        const statusText = aluno.status === 'presente' ? '✅ Presente' : '🚪 Saiu';
        
        tr.innerHTML = `
            <td><strong>${aluno.ra}</strong></td>
            <td>${aluno.nome}</td>
            <td>${aluno.fatec}</td>
            <td><span class="badge-curso">${aluno.curso}</span></td>
            <td>${aluno.data}</td>
            <td><strong>${aluno.entrada}</strong></td>
            <td>${aluno.saida || '-'}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        `;
        tbody.appendChild(tr);
    });
    
    const totalEl = document.getElementById('totalRegistros');
    if (totalEl) totalEl.textContent = dados.length;
}

function atualizarEstatisticas(dados) {
    const presentes = dados.filter(a => a.status === 'presente').length;
    const saidas = dados.filter(a => a.status === 'saiu').length;
    const entradas = dados.length;
    
    const elPresentes = document.getElementById('totalPresentes');
    const elEntradas = document.getElementById('totalEntradas');
    const elSaidas = document.getElementById('totalSaidas');
    const elTempo = document.getElementById('tempoMedio');

    if (elPresentes) elPresentes.textContent = presentes;
    if (elEntradas) elEntradas.textContent = entradas;
    if (elSaidas) elSaidas.textContent = saidas;
    
    // Calcular tempo médio (simplificado)
    const temposMinutos = dados
        .filter(a => a.saida)
        .map(a => {
            const [hE, mE] = a.entrada.split(':').map(Number);
            const [hS, mS] = a.saida.split(':').map(Number);
            return (hS * 60 + mS) - (hE * 60 + mE);
        });
    
    if (elTempo) {
        if (temposMinutos.length > 0) {
            const media = temposMinutos.reduce((a, b) => a + b, 0) / temposMinutos.length;
            const horas = Math.floor(media / 60);
            const minutos = Math.round(media % 60);
            elTempo.textContent = `${horas}h${minutos}m`;
        } else {
            elTempo.textContent = '0h';
        }
    }
}

// --- Filtros e Ações ---
function filtrarPresencas() {
    const filtroNome = document.getElementById('filtroNome').value.toLowerCase();
    const filtroStatus = document.getElementById('filtroStatus').value;
    const filtroFatec = document.getElementById('filtroFatec').value;
    const filtroCurso = document.getElementById('filtroCurso').value;
    
    let dadosFiltrados = todosOsDados;
    
    // Filtro por nome ou RA
    if (filtroNome) {
        dadosFiltrados = dadosFiltrados.filter(a => 
            a.nome.toLowerCase().includes(filtroNome) || 
            a.ra.includes(filtroNome)
        );
    }
    
    // Filtro por status
    if (filtroStatus) {
        dadosFiltrados = dadosFiltrados.filter(a => a.status === filtroStatus);
    }

    // Filtro por FATEC
    if (filtroFatec) {
        dadosFiltrados = dadosFiltrados.filter(a => a.fatec === filtroFatec);
    }

    // Filtro por Curso
    if (filtroCurso) {
        dadosFiltrados = dadosFiltrados.filter(a => a.curso === filtroCurso);
    }
    
    renderizarTabela(dadosFiltrados);
    atualizarResumoFiltros(filtroNome, filtroStatus, filtroFatec, filtroCurso, dadosFiltrados.length);
}

function atualizarResumoFiltros(nome, status, fatec, curso, total) {
    const resumoDiv = document.getElementById('resumoFiltros');
    const resumoTexto = document.getElementById('resumoTexto');
    
    if (!resumoDiv || !resumoTexto) return;

    const filtrosAtivos = [];
    
    if (nome) filtrosAtivos.push(`Busca: "${nome}"`);
    if (status) filtrosAtivos.push(`Status: ${status === 'presente' ? 'Presentes' : 'Saíram'}`);
    if (fatec) filtrosAtivos.push(`FATEC: ${fatec}`);
    if (curso) filtrosAtivos.push(`Curso: ${curso}`);
    
    if (filtrosAtivos.length > 0) {
        resumoDiv.style.display = 'block';
        resumoTexto.innerHTML = filtrosAtivos.join(' • ') + ` <strong>(${total} resultado${total !== 1 ? 's' : ''})</strong>`;
    } else {
        resumoDiv.style.display = 'none';
    }
}

function limparFiltros() {
    const fNome = document.getElementById('filtroNome');
    const fStatus = document.getElementById('filtroStatus');
    const fFatec = document.getElementById('filtroFatec');
    const fCurso = document.getElementById('filtroCurso');

    if (fNome) fNome.value = '';
    if (fStatus) fStatus.value = '';
    if (fFatec) fFatec.value = '';
    if (fCurso) fCurso.value = '';
    
    filtrarPresencas();
}

function exportarCSV() {
    let csv = 'RA,Nome,FATEC,Curso,Data,Hora Entrada,Hora Saída,Status\n';
    
    todosOsDados.forEach(aluno => {
        csv += `${aluno.ra},${aluno.nome},${aluno.fatec},${aluno.curso},${aluno.data},${aluno.entrada},${aluno.saida || '-'},${aluno.status}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presencas_palestra_${palestraSelecionada}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function gerarListaChamada() {
    const filtroFatec = document.getElementById('filtroFatec').value;
    const filtroCurso = document.getElementById('filtroCurso').value;
    
    let dadosListar = todosOsDados;
    
    // Aplicar filtros se existirem
    if (filtroFatec) {
        dadosListar = dadosListar.filter(a => a.fatec === filtroFatec);
    }
    if (filtroCurso) {
        dadosListar = dadosListar.filter(a => a.curso === filtroCurso);
    }

    // Ordenar por nome
    dadosListar.sort((a, b) => a.nome.localeCompare(b.nome));

    // Criar janela de impressão
    const janelaImpressao = window.open('', '_blank');
    
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Lista de Chamada - Palestra ${palestraSelecionada}</title>
            <style>
                @page { margin: 2cm; }
                body {
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                }
                .cabecalho {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 15px;
                }
                .cabecalho h1 {
                    margin: 0 0 10px 0;
                    font-size: 20px;
                }
                .info-palestra {
                    margin: 20px 0;
                    background: #f0f0f0;
                    padding: 15px;
                }
                .info-palestra p {
                    margin: 5px 0;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th, td {
                    border: 1px solid #333;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background: #333;
                    color: white;
                    font-weight: bold;
                }
                .assinatura {
                    width: 200px;
                }
                .rodape {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #ccc;
                    text-align: center;
                    font-size: 10px;
                }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="cabecalho">
                <h1>📋 LISTA DE CHAMADA - FATECWEEK 2025</h1>
                <h2>Palestra ${palestraSelecionada}</h2>
            </div>

            <div class="info-palestra">
                <p><strong>Palestra:</strong> ${document.querySelector('.palestra-btn.active .palestra-tema')?.textContent || 'Palestra ' + palestraSelecionada}</p>
                <p><strong>Data:</strong> ${todosOsDados[0]?.data || new Date().toLocaleDateString('pt-BR')}</p>
                <p><strong>Horário:</strong> ${document.querySelector('.palestra-btn.active .palestra-info')?.textContent || '-'}</p>
                ${filtroFatec ? `<p><strong>FATEC:</strong> ${filtroFatec}</p>` : ''}
                ${filtroCurso ? `<p><strong>Curso:</strong> ${filtroCurso}</p>` : ''}
                <p><strong>Total de Alunos:</strong> ${dadosListar.length}</p>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 40px;">#</th>
                        <th style="width: 80px;">RA</th>
                        <th>Nome Completo</th>
                        <th style="width: 120px;">FATEC</th>
                        <th style="width: 60px;">Curso</th>
                        <th class="assinatura">Assinatura</th>
                    </tr>
                </thead>
                <tbody>
    `;

    dadosListar.forEach((aluno, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${aluno.ra}</td>
                <td>${aluno.nome}</td>
                <td>${aluno.fatec.replace('FATEC ', '')}</td>
                <td>${aluno.curso}</td>
                <td class="assinatura"></td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>

            <div class="rodape">
                <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                <p>FatecWeek 2025 - Sistema de Controle de Presença</p>
            </div>

            <div class="no-print" style="margin-top: 20px; text-align: center;">
                <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; cursor: pointer;">
                    🖨️ Imprimir
                </button>
                <button onclick="window.close()" style="padding: 10px 30px; font-size: 16px; cursor: pointer; margin-left: 10px;">
                    ❌ Fechar
                </button>
            </div>
        </body>
        </html>
    `;

    janelaImpressao.document.write(html);
    janelaImpressao.document.close();
}

function atualizarDados() {
    carregarPresencas(palestraSelecionada);
    alert('✅ Dados atualizados com sucesso!');
}

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    // Listeners estáticos
    const btnSair = document.querySelector('.btn-sair');
    if (btnSair) btnSair.addEventListener('click', logoutUsuario);

    const btnListaChamada = document.querySelector('.btn-lista-chamada');
    if (btnListaChamada) btnListaChamada.addEventListener('click', gerarListaChamada);

    const btnExportar = document.querySelector('.btn-exportar');
    if (btnExportar) btnExportar.addEventListener('click', exportarCSV);

    const btnAtualizar = document.querySelector('.btn-atualizar');
    if (btnAtualizar) btnAtualizar.addEventListener('click', atualizarDados);

    const btnLimparFiltros = document.querySelector('.btn-limpar-filtros');
    if (btnLimparFiltros) btnLimparFiltros.addEventListener('click', limparFiltros);

    // Filtros
    const filtroNome = document.getElementById('filtroNome');
    if (filtroNome) filtroNome.addEventListener('keyup', filtrarPresencas);

    const filtroStatus = document.getElementById('filtroStatus');
    if (filtroStatus) filtroStatus.addEventListener('change', filtrarPresencas);

    const filtroFatec = document.getElementById('filtroFatec');
    if (filtroFatec) filtroFatec.addEventListener('change', filtrarPresencas);

    const filtroCurso = document.getElementById('filtroCurso');
    if (filtroCurso) filtroCurso.addEventListener('change', filtrarPresencas);

    // Carregar dados iniciais
    preencherHeaderUsuario();
    carregarPalestras();
});
