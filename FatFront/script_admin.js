// Credenciais admin (em produção, use backend!)
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

// Banco de dados simulado de usuários
let usuarios = JSON.parse(localStorage.getItem('usuariosAutorizados')) || [
    { email: 'prof.joao@fatec.sp.gov.br', tipo: 'docente', id: 1 },
    { email: 'prof.maria@fatec.sp.gov.br', tipo: 'docente', id: 2 },
    { email: 'aluno1@fatec.sp.gov.br', tipo: 'aluno', id: 3 },
    { email: 'aluno2@fatec.sp.gov.br', tipo: 'aluno', id: 4 }
];

let filtroAtual = 'todos';

// Verificar se admin já está logado
window.onload = function() {
    if (localStorage.getItem('adminLogado') === 'true') {
        mostrarDashboard();
    }
};

// Login do admin
function loginAdmin(event) {
    event.preventDefault();
    const user = document.getElementById('adminUser').value;
    const pass = document.getElementById('adminPass').value;

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        localStorage.setItem('adminLogado', 'true');
        mostrarDashboard();
    } else {
        alert('❌ Credenciais inválidas!');
    }
}

// Logout do admin
function logoutAdmin() {
    if (confirm('Deseja realmente sair?')) {
        localStorage.removeItem('adminLogado');
        document.getElementById('adminLogin').style.display = 'flex';
        document.getElementById('adminDashboard').style.display = 'none';
    }
}

// Mostrar dashboard
function mostrarDashboard() {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
    renderizarUsuarios();
}

// Trocar tab
function trocarTab(tipo) {
    filtroAtual = tipo;
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    renderizarUsuarios();
}

// Renderizar lista de usuários
function renderizarUsuarios() {
    let usuariosFiltrados = usuarios;

    if (filtroAtual === 'docentes') {
        usuariosFiltrados = usuarios.filter(u => u.tipo === 'docente');
    } else if (filtroAtual === 'alunos') {
        usuariosFiltrados = usuarios.filter(u => u.tipo === 'aluno');
    }

    const lista = document.getElementById('listaUsuarios');
    lista.innerHTML = '';

    if (usuariosFiltrados.length === 0) {
        lista.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Nenhum usuário encontrado</p>';
        document.getElementById('totalUsuarios').textContent = '0';
        return;
    }

    usuariosFiltrados.forEach(usuario => {
        const div = document.createElement('div');
        div.className = `usuario-item ${usuario.tipo}`;
        div.innerHTML = `
            <div class="usuario-info">
                <h4>${usuario.email}</h4>
                <p>Tipo: <strong>${usuario.tipo === 'docente' ? '👨‍🏫 Docente' : '🎓 Aluno'}</strong></p>
            </div>
            <div class="usuario-acoes">
                <button class="btn-toggle ${usuario.tipo === 'docente' ? 'btn-aluno' : 'btn-docente'}" 
                        onclick="alternarTipo(${usuario.id})">
                    ${usuario.tipo === 'docente' ? 'Tornar Aluno' : 'Tornar Docente'}
                </button>
                <button class="btn-toggle btn-remover" onclick="removerUsuario(${usuario.id})">
                    Remover
                </button>
            </div>
        `;
        lista.appendChild(div);
    });

    document.getElementById('totalUsuarios').textContent = usuariosFiltrados.length;
}

// Adicionar usuário
function adicionarUsuario(event) {
    event.preventDefault();
    const email = document.getElementById('novoEmail').value.toLowerCase();
    const tipo = document.getElementById('novoTipo').value;

    // Validar email @fatec.sp.gov.br
    if (!email.endsWith('@fatec.sp.gov.br')) {
        alert('⚠️ O e-mail deve ser @fatec.sp.gov.br');
        return;
    }

    // Verificar se já existe
    if (usuarios.find(u => u.email === email)) {
        alert('⚠️ Este e-mail já está cadastrado!');
        return;
    }

    // Adicionar
    const novoId = Math.max(...usuarios.map(u => u.id), 0) + 1;
    usuarios.push({ email, tipo, id: novoId });
    salvarUsuarios();
    renderizarUsuarios();

    // Limpar form
    document.getElementById('novoEmail').value = '';
    document.getElementById('novoTipo').value = '';

    alert('✅ Usuário adicionado com sucesso!');
}

// Alternar tipo (docente <-> aluno)
function alternarTipo(id) {
    const usuario = usuarios.find(u => u.id === id);
    if (usuario) {
        const novoTipo = usuario.tipo === 'docente' ? 'aluno' : 'docente';
        if (confirm(`Alterar ${usuario.email} para ${novoTipo}?`)) {
            usuario.tipo = novoTipo;
            salvarUsuarios();
            renderizarUsuarios();
            alert(`✅ ${usuario.email} agora é ${novoTipo}!`);
        }
    }
}

// Remover usuário
function removerUsuario(id) {
    const usuario = usuarios.find(u => u.id === id);
    if (usuario && confirm(`Tem certeza que deseja remover ${usuario.email}?`)) {
        usuarios = usuarios.filter(u => u.id !== id);
        salvarUsuarios();
        renderizarUsuarios();
        alert('✅ Usuário removido com sucesso!');
    }
}

// Salvar no localStorage
function salvarUsuarios() {
    localStorage.setItem('usuariosAutorizados', JSON.stringify(usuarios));
}