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
    const url = buildApiUrl(path);
    const defaultOptions = { credentials: 'include' };
    const finalOptions = { ...defaultOptions, ...options };
    return fetch(url, finalOptions);
}

// --- Estado Global ---
const state = {
    usuario: null,
    palestras: [],
    inscricoes: new Set(),
    inscricoesMap: {},
    metaDadosPalestras: {}
};

// --- Funções de Utilidade ---
function formatarDataHora(dataIso, duracaoMinutos = 60) {
    try {
        const inicio = new Date(dataIso);
        if (isNaN(inicio.getTime())) return 'Data a confirmar';
        
        const fim = new Date(inicio.getTime() + duracaoMinutos * 60000);
        
        const dia = inicio.toLocaleDateString('pt-BR');
        const horaInicio = inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const horaFim = fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        return `${dia} - ${horaInicio} às ${horaFim}`;
    } catch (e) {
        return 'Data a confirmar';
    }
}

// --- Autenticação e Usuário ---
async function carregarUsuario() {
    try {
        const res = await apiFetch('/api/auth/me');
        if (res.status === 401) {
            window.location.href = buildApiUrl('/api/auth/google?returnTo=' + encodeURIComponent(window.location.pathname));
            return;
        }
        if (!res.ok) throw new Error('Erro ao carregar usuário');
        
        state.usuario = await res.json();
        atualizarHeaderUsuario();
    } catch (error) {
        console.error('Erro auth:', error);
    }
}

function atualizarHeaderUsuario() {
    if (!state.usuario) return;
    
    const nomeEl = document.getElementById('userNome');
    const raEl = document.getElementById('userRA');
    const pontosEl = document.getElementById('pontosTotal');

    if (nomeEl) nomeEl.textContent = state.usuario.nome || state.usuario.displayName || 'Aluno';
    if (raEl) raEl.textContent = state.usuario.ra || '---';
    
    const pontos = state.usuario.pontos_total || 0;
    if (pontosEl) pontosEl.textContent = pontos;
}

async function logoutUsuario(e) {
    if (e) e.preventDefault();
    console.log('Iniciando logout...');
    
    const btn = document.getElementById('btnLogout');
    if (btn) {
        btn.textContent = 'Saindo...';
        btn.disabled = true;
    }

    try {
        // Tenta fazer logout via POST (padrão)
        const res = await apiFetch('/api/auth/logout', { method: 'POST' });
        
        if (res.ok) {
            console.log('Logout POST realizado com sucesso');
            window.location.href = 'index.html';
        } else {
            console.warn('Logout POST retornou erro, tentando fallback GET');
            window.location.href = buildApiUrl('/api/auth/logout');
        }
    } catch (error) {
        console.error('Erro de rede ao tentar logout, forçando redirecionamento', error);
        window.location.href = buildApiUrl('/api/auth/logout');
    }
}

// --- Palestras ---
async function carregarPalestras() {
    const container = document.getElementById('palestrasLista');
    container.innerHTML = '<p>Carregando palestras...</p>';

    try {
        const res = await apiFetch('/api/palestras');
        if (!res.ok) throw new Error('Falha ao buscar palestras');
        
        const dados = await res.json();
        state.palestras = Array.isArray(dados) ? dados : (dados.dados || []);

        renderizarPalestras();
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p>Não foi possível carregar as palestras.</p>';
    }
}

function renderizarPalestras() {
    const container = document.getElementById('palestrasLista');
    container.innerHTML = '';

    // Filtra palestras que já passaram ou que o aluno já está inscrito
    const agora = new Date();
    const palestrasDisponiveis = state.palestras.filter(p => {
        const dataPalestra = new Date(p.data);
        const duracao = p.duracao_minutos || 60;
        const fimPalestra = new Date(dataPalestra.getTime() + duracao * 60000);
        
        // Se a palestra já acabou, não mostra
        if (fimPalestra < agora) return false;

        // Se o aluno já está inscrito, não mostra na lista de "Disponíveis"
        // (Ele verá na lista de "Minhas Inscrições" ou "Meus Certificados")
        const id = String(p._id || p.id);
        if (state.inscricoes.has(id)) return false;

        return true;
    });

    if (palestrasDisponiveis.length === 0) {
        container.innerHTML = '<p>Nenhuma palestra disponível para inscrição no momento.</p>';
        return;
    }

    palestrasDisponiveis.forEach((p, index) => {
        const id = String(p._id || p.id || index);
        const duracao = p.duracao_minutos || 60;
        const horarioFormatado = formatarDataHora(p.data, duracao);
        
        state.metaDadosPalestras[id] = {
            titulo: p.titulo,
            horario: horarioFormatado,
            duracaoHoras: duracao / 60
        };

        const div = document.createElement('div');
        div.className = 'palestra-item';
        div.innerHTML = `
            <div class="palestra-badge">🎤</div>
            <div class="palestra-info-completa">
                <h3>${p.titulo}</h3>
                <div class="palestra-detalhes">
                    <span class="detalhe"><strong>📅 Data:</strong> ${new Date(p.data).toLocaleDateString()}</span>
                    <span class="detalhe"><strong>⏰ Horário:</strong> ${horarioFormatado}</span>
                    <span class="detalhe"><strong>📍 Local:</strong> ${p.local || 'A definir'}</span>
                    <span class="detalhe"><strong>👨‍🏫 Palestrante:</strong> ${p.palestrante || 'A definir'}</span>
                    <span class="detalhe"><strong>🏅 Pontos:</strong> ${p.pontos || 0}</span>
                </div>
                <p class="palestra-descricao">${p.descricao || ''}</p>
            </div>
            <button class="btn-inscrever" data-id="${id}">
                Inscrever-se
            </button>
        `;
        container.appendChild(div);
    });
    
    atualizarBotoesInscricao();
}

// --- Inscrições ---
async function carregarInscricoes() {
    try {
        const res = await apiFetch('/api/inscricoes');
        if (!res.ok) return;
        
        const dados = await res.json();
        const lista = Array.isArray(dados) ? dados : (dados.dados || []);

        state.inscricoes.clear();
        state.inscricoesMap = {};

        lista.forEach(ins => {
            const pid = String(ins.palestraId);
            state.inscricoes.add(pid);
            state.inscricoesMap[pid] = ins._id || ins.id;
        });

        atualizarBotoesInscricao();
        atualizarEstatisticas();
        renderizarMinhasInscricoes();
    } catch (error) {
        console.error('Erro ao carregar inscrições:', error);
    }
}

function atualizarBotoesInscricao() {
    document.querySelectorAll('.btn-inscrever').forEach(btn => {
        const id = btn.getAttribute('data-id');
        if (state.inscricoes.has(id)) {
            btn.textContent = '✓ Inscrito';
            btn.classList.add('inscrito');
        } else {
            btn.textContent = 'Inscrever-se';
            btn.classList.remove('inscrito');
        }
    });
}

async function handleInscricaoClick(id, btn) {
    if (state.inscricoes.has(id)) {
        if (confirm('Deseja cancelar sua inscrição nesta palestra?')) {
            await cancelarInscricao(id);
        }
    } else {
        await realizarInscricao(id);
    }
}

async function realizarInscricao(palestraId) {
    try {
        const res = await apiFetch('/api/inscricoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ palestraId })
        });

        if (!res.ok) {
            const err = await res.json();
            alert(err.erro || 'Erro ao realizar inscrição.');
            return;
        }

        const data = await res.json();
        const inscricao = data.inscricao || data;
        
        state.inscricoes.add(palestraId);
        state.inscricoesMap[palestraId] = inscricao._id || inscricao.id;
        
        // Atualiza a lista removendo a palestra recém inscrita
        renderizarPalestras();
        
        atualizarBotoesInscricao();
        atualizarEstatisticas();
        renderizarMinhasInscricoes();
        
        alert('✅ Inscrição realizada com sucesso!');
    } catch (error) {
        console.error('Erro ao inscrever:', error);
        alert('Erro de conexão ao tentar inscrever.');
    }
}

async function cancelarInscricao(palestraId) {
    const inscricaoId = state.inscricoesMap[palestraId];
    if (!inscricaoId) return;

    try {
        const res = await apiFetch(`/api/inscricoes/${inscricaoId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao cancelar');

        state.inscricoes.delete(palestraId);
        delete state.inscricoesMap[palestraId];

        // Re-renderiza para a palestra voltar a aparecer na lista de disponíveis (se ainda for válida)
        renderizarPalestras();

        atualizarBotoesInscricao();
        atualizarEstatisticas();
        renderizarMinhasInscricoes();
        
        alert('Inscrição cancelada.');
    } catch (error) {
        alert('Não foi possível cancelar a inscrição.');
    }
}

// --- UI Auxiliar ---
function atualizarEstatisticas() {
    // Total Inscritas: baseada nas inscrições ativas
    const totalInscritas = state.inscricoes.size;
    document.getElementById('totalInscritas').textContent = totalInscritas;
    
    // As estatísticas de conclusão (Comparecidas, Horas, Progresso) 
    // agora são calculadas com base nos CERTIFICADOS (palestras concluídas)
    // e não mais nas inscrições.
    // Isso é feito dentro de carregarCertificados()
}

function renderizarMinhasInscricoes() {
    const container = document.getElementById('minhasInscricoes');
    const lista = document.getElementById('listaInscricoes');
    
    if (state.inscricoes.size === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    lista.innerHTML = '';
    
    state.inscricoes.forEach(pid => {
        const meta = state.metaDadosPalestras[pid];
        if (!meta) return;

        const div = document.createElement('div');
        div.className = 'inscricao-item';
        div.innerHTML = `
            <div class="inscricao-info">
                <h4>${meta.titulo}</h4>
                <p>📅 ${meta.horario}</p>
            </div>
            <button class="btn-cancelar" data-id="${pid}">Cancelar</button>
        `;
        lista.appendChild(div);
    });
}

// --- Popup de Notícias ---
function gerenciarPopup() {
    const hoje = new Date().toDateString();
    const naoMostrar = localStorage.getItem('popupNoticiasNaoMostrar');
    const ultimaVez = localStorage.getItem('popupNoticiasData');

    if (naoMostrar !== 'true' || ultimaVez !== hoje) {
        setTimeout(() => {
            document.getElementById('popupNoticias').style.display = 'flex';
        }, 1000);
    }
}

function fecharPopup() {
    document.getElementById('popupNoticias').style.display = 'none';
    localStorage.setItem('popupNoticiasData', new Date().toDateString());
}

function salvarPreferencia() {
    const chk = document.getElementById('naoMostrarNovamente');
    if (chk.checked) localStorage.setItem('popupNoticiasNaoMostrar', 'true');
    else localStorage.removeItem('popupNoticiasNaoMostrar');
}

function fecharModal() {
    document.getElementById('modalInscricao').style.display = 'none';
}

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', async () => {
    // Listeners estáticos
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) btnLogout.addEventListener('click', logoutUsuario);

    const btnFecharPopupX = document.querySelector('.popup-close');
    if (btnFecharPopupX) btnFecharPopupX.addEventListener('click', fecharPopup);

    const btnFecharPopupEntendi = document.querySelector('.btn-fechar-popup');
    if (btnFecharPopupEntendi) btnFecharPopupEntendi.addEventListener('click', fecharPopup);

    const chkPreferencia = document.getElementById('naoMostrarNovamente');
    if (chkPreferencia) chkPreferencia.addEventListener('change', salvarPreferencia);

    const btnFecharModalX = document.querySelector('.modal-close');
    if (btnFecharModalX) btnFecharModalX.addEventListener('click', fecharModal);

    // Event Delegation para elementos dinâmicos
    const palestrasLista = document.getElementById('palestrasLista');
    if (palestrasLista) {
        palestrasLista.addEventListener('click', function(e) {
            if (e.target && e.target.classList.contains('btn-inscrever')) {
                const id = e.target.getAttribute('data-id');
                handleInscricaoClick(id, e.target);
            }
        });
    }

    const listaInscricoes = document.getElementById('listaInscricoes');
    if (listaInscricoes) {
        listaInscricoes.addEventListener('click', function(e) {
            if (e.target && e.target.classList.contains('btn-cancelar')) {
                const id = e.target.getAttribute('data-id');
                cancelarInscricao(id);
            }
        });
    }

    await carregarUsuario();
    await carregarPalestras();
    await carregarInscricoes();
    await carregarCertificados();
    
    gerenciarPopup();
});

async function carregarCertificados() {
    const container = document.getElementById('listaCertificados');
    if (!container) return;

    try {
        const res = await apiFetch('/api/presenca/certificados');
        if (!res.ok) throw new Error('Erro ao carregar certificados');
        
        const data = await res.json();
        const certificados = data.certificados || [];

        if (certificados.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">Nenhum certificado disponível ainda.</p>';
            return;
        }

        container.innerHTML = '';
        
        // Variáveis para estatísticas
        let totalComparecidas = 0;
        let minutosTotais = 0;

        certificados.forEach(cert => {
            const palestra = cert.palestraId || {};
            const titulo = palestra.titulo || 'Palestra sem título';
            const dataPalestra = palestra.data ? new Date(palestra.data).toLocaleDateString('pt-BR') : 'Data desconhecida';
            const link = buildApiUrl(`/api/presenca/download-certificado/${cert._id}`);
            
            // Contabiliza estatísticas
            totalComparecidas++;
            // Usa a duração da palestra para contabilizar horas de certificado (se disponível), 
            // ou o tempo de permanência se for maior (embora o certificado valha pela carga horária da palestra)
            const duracaoPalestra = palestra.duracao_minutos || 0;
            minutosTotais += duracaoPalestra > 0 ? duracaoPalestra : (cert.duracaoMinutos || 0);

            const div = document.createElement('div');
            div.className = 'palestra-card'; 
            div.innerHTML = `
                <div class="palestra-info">
                    <h3>${titulo}</h3>
                    <p>📅 ${dataPalestra}</p>
                    <p>⏱️ Carga Horária: ${duracaoPalestra} min</p>
                </div>
                <div class="palestra-actions">
                    <a href="${link}" target="_blank" class="btn-inscrever" style="text-decoration: none; text-align: center; display: block; width: 100%;">
                        📄 Baixar Certificado
                    </a>
                </div>
            `;
            container.appendChild(div);
        });

        // Atualiza UI de estatísticas
        const horasTotais = minutosTotais / 60;
        document.getElementById('totalComparecidas').textContent = totalComparecidas;
        document.getElementById('horasCertificado').textContent = horasTotais.toFixed(1) + 'h';
        
        // Meta de 20 horas
        const progresso = Math.min((horasTotais / 20) * 100, 100);
        document.getElementById('progressoCertificado').textContent = progresso.toFixed(0) + '%';

    } catch (error) {
        console.error('Erro ao carregar certificados:', error);
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: red;">Erro ao carregar certificados.</p>';
    }
}
