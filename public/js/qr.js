
// public/js/qr.js

document.addEventListener('DOMContentLoaded', async () => {
    const qs = new URLSearchParams(location.search);
    const palestraId = qs.get('p');
    
    const els = {
        loading: document.getElementById('loadingState'),
        content: document.getElementById('contentState'),
        titulo: document.getElementById('palestraTitulo'),
        data: document.getElementById('palestraData'),
        statusMsg: document.getElementById('statusMessage'),
        btnIngressar: document.getElementById('btnIngressar'),
        btnFinalizar: document.getElementById('btnFinalizar'),
        btnLogin: document.getElementById('btnLogin'),
        userHeader: document.getElementById('userHeader'),
        userName: document.getElementById('userName')
    };

    if (!palestraId) {
        showStatus('QR Code inválido ou incompleto.', 'error');
        els.loading.classList.add('hidden');
        els.content.classList.remove('hidden');
        return;
    }

    // Helper para mostrar mensagens
    function showStatus(msg, type = 'loading') {
        els.statusMsg.textContent = msg;
        els.statusMsg.className = `status-box status-${type}`;
        els.statusMsg.classList.remove('hidden');
    }

    // Helper para API
    async function fetchJson(url, options = {}) {
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        if (res.status === 401) return null; // Não autorizado
        return res.json();
    }

    // Event Listeners (Definidos antes para garantir funcionamento)
    els.btnLogin.addEventListener('click', () => {
        // Redireciona para a tela de login, passando a URL atual como retorno
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login-aluno.html?returnTo=${returnTo}`;
    });

    try {
        // 1. Carregar Palestra (Independente de Login)
        const palestraRes = await fetchJson(`/api/palestras/${palestraId}`);
        if (!palestraRes || !palestraRes.dados) {
            throw new Error('Palestra não encontrada.');
        }
        const palestra = palestraRes.dados;
        
        els.titulo.textContent = palestra.titulo;
        const data = new Date(palestra.data);
        els.data.textContent = data.toLocaleDateString() + ' às ' + data.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        // 2. Verificar Login
        const user = await fetchJson('/api/auth/me');
        
        if (!user) {
            els.loading.classList.add('hidden');
            els.content.classList.remove('hidden');
            showStatus('Você precisa estar logado para registrar presença.', 'error');
            els.btnLogin.classList.remove('hidden');
            return;
        }

        // Mostrar usuário no header
        els.userHeader.style.display = 'block';
        els.userName.textContent = user.nome || user.email;

        // 3. Verificar Status do Usuário na Palestra
        // Precisamos do ID do participante. O endpoint /me/:palestraId vai usar o user da sessão.
        const statusRes = await fetchJson(`/api/presenca/me/${palestraId}`);
        
        els.loading.classList.add('hidden');
        els.content.classList.remove('hidden');

        if (!statusRes.sucesso) {
            showStatus('Erro ao verificar status: ' + statusRes.erro, 'error');
            return;
        }

        const status = statusRes.status; // 'nao_registrado', 'presente', 'finalizado'

        if (status === 'nao_registrado') {
            els.btnIngressar.classList.remove('hidden');
            showStatus('Você ainda não registrou entrada.', 'loading');
        } else if (status === 'presente') {
            // Lógica de 20% do tempo para liberar botão de saída
            const agora = new Date();
            const inicioPalestra = new Date(palestra.data);
            const duracaoMinutos = palestra.duracao_minutos || 60;
            const tempoMinimoSaida = new Date(inicioPalestra.getTime() + (duracaoMinutos * 0.2 * 60000));

            if (agora < tempoMinimoSaida) {
                els.btnFinalizar.classList.remove('hidden');
                els.btnFinalizar.disabled = true;
                els.btnFinalizar.style.opacity = '0.5';
                els.btnFinalizar.style.cursor = 'not-allowed';
                
                const minutosRestantes = Math.ceil((tempoMinimoSaida - agora) / 60000);
                els.btnFinalizar.textContent = `Saída liberada em ${minutosRestantes} min`;
                showStatus(`Entrada registrada! A saída será liberada após 20% do evento.`, 'success');

                // Timer para habilitar o botão automaticamente
                const timer = setInterval(() => {
                    const now = new Date();
                    if (now >= tempoMinimoSaida) {
                        clearInterval(timer);
                        els.btnFinalizar.disabled = false;
                        els.btnFinalizar.style.opacity = '1';
                        els.btnFinalizar.style.cursor = 'pointer';
                        els.btnFinalizar.textContent = '🏁 Registrar Saída';
                        showStatus('Saída liberada! Não esqueça de registrar para garantir seu certificado.', 'success');
                    } else {
                        const min = Math.ceil((tempoMinimoSaida - now) / 60000);
                        els.btnFinalizar.textContent = `Saída liberada em ${min} min`;
                    }
                }, 60000); // Atualiza a cada minuto

            } else {
                els.btnFinalizar.classList.remove('hidden');
                showStatus('Entrada registrada! Não esqueça de registrar a saída no final.', 'success');
            }
        } else if (status === 'finalizado') {
            showStatus('Sua participação nesta palestra foi concluída. Obrigado!', 'success');
        }

    } catch (err) {
        console.error(err);
        els.loading.classList.add('hidden');
        els.content.classList.remove('hidden');
        showStatus('Ocorreu um erro ao carregar os dados.', 'error');
    }

    // Helper para obter localização
    function obterLocalizacao() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocalização não suportada pelo navegador.'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => reject(err),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }

    // Event Listeners
    els.btnIngressar.addEventListener('click', async () => {
        try {
            els.btnIngressar.disabled = true;
            els.btnIngressar.textContent = 'Obtendo localização...';
            
            let localizacao = null;
            try {
                localizacao = await obterLocalizacao();
            } catch (e) {
                console.warn('Erro ao obter localização:', e);
                // Tenta prosseguir sem localização (o backend decidirá se bloqueia ou não)
                // Mas se a palestra exigir, vai falhar.
                if (!confirm('Não foi possível obter sua localização precisa. Isso pode impedir o registro se o evento exigir validação de local. Deseja tentar mesmo assim?')) {
                    els.btnIngressar.disabled = false;
                    els.btnIngressar.textContent = '✅ Registrar Entrada';
                    return;
                }
            }

            els.btnIngressar.textContent = 'Registrando...';
            
            const res = await fetchJson('/api/presenca/entrada', {
                method: 'POST',
                body: JSON.stringify({ 
                    palestraId, 
                    modo: 'qr', 
                    qrData: window.location.href,
                    localizacao 
                })
            });

            if (res && res.sucesso) {
                showStatus('Entrada registrada com sucesso!', 'success');
                els.btnIngressar.classList.add('hidden');
                els.btnFinalizar.classList.remove('hidden');
            } else {
                showStatus(res.erro || 'Erro ao registrar entrada.', 'error');
                els.btnIngressar.disabled = false;
                els.btnIngressar.textContent = '✅ Registrar Entrada';
            }
        } catch (e) {
            showStatus('Erro de conexão.', 'error');
            els.btnIngressar.disabled = false;
            els.btnIngressar.textContent = '✅ Registrar Entrada';
        }
    });

    els.btnFinalizar.addEventListener('click', async () => {
        try {
            els.btnFinalizar.disabled = true;
            els.btnFinalizar.textContent = 'Obtendo localização...';
            
            let localizacao = null;
            try {
                localizacao = await obterLocalizacao();
            } catch (e) {
                console.warn('Erro ao obter localização:', e);
                if (!confirm('Não foi possível obter sua localização. Deseja tentar registrar a saída mesmo assim?')) {
                    els.btnFinalizar.disabled = false;
                    els.btnFinalizar.textContent = '🏁 Registrar Saída';
                    return;
                }
            }

            els.btnFinalizar.textContent = 'Registrando...';
            
            const res = await fetchJson('/api/presenca/saida', {
                method: 'POST',
                body: JSON.stringify({ 
                    palestraId, 
                    modo: 'qr', 
                    qrData: window.location.href,
                    localizacao
                })
            });

            if (res && res.sucesso) {
                showStatus('Saída registrada! Certificado será enviado se aplicável.', 'success');
                els.btnFinalizar.classList.add('hidden');
            } else {
                showStatus(res.erro || 'Erro ao registrar saída.', 'error');
                els.btnFinalizar.disabled = false;
                els.btnFinalizar.textContent = '🏁 Registrar Saída';
            }
        } catch (e) {
            showStatus('Erro de conexão.', 'error');
            els.btnFinalizar.disabled = false;
        }
    });
});
