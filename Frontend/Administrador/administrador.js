const API_BASE_URL = 'http://localhost:3001';

// Protege a página administrativa e bloqueia acesso após logout ou sem login
async function protegerPaginaAdmin() {
    const dadosLocaisTexto = sessionStorage.getItem('usuarioLogado');
    let usuarioLocal = null;

    if (dadosLocaisTexto) {
        try {
            usuarioLocal = JSON.parse(dadosLocaisTexto);
        } catch (e) {
            usuarioLocal = null;
        }
    }

    try {
        const resposta = await fetch(`${API_BASE_URL}/login/sessao`, {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store'
        });

        if (resposta.ok) {
            const dados = await resposta.json();
            if (dados.logado && dados.usuario && dados.usuario.tipo_usuario === 'administrador') {
                sessionStorage.setItem('usuarioLogado', JSON.stringify(dados.usuario));
                return true;
            }
        }
    } catch (erro) {
        console.warn('Não foi possível validar cookie no servidor, verificando sessão local...');
    }

    // Se o navegador bloqueou o cookie cross-port (ex: 127.0.0.1:5500 -> localhost:3001),
    // mantém o acesso enquanto a sessão local da aba estiver ativa
    if (usuarioLocal && usuarioLocal.tipo_usuario === 'administrador') {
        return true;
    }

    // Se não há sessão no servidor nem na aba (ou se o usuário já clicou em Sair), expulsa para o login
    sessionStorage.clear();
    window.location.replace('../login/login.html');
    return false;
}

async function sairAdmin() {
    try {
        await fetch(`${API_BASE_URL}/login/sair`, {
            method: 'POST',
            credentials: 'include'
        });
    } finally {
        sessionStorage.clear();
        window.location.replace('../login/login.html');
    }
}

async function listarProdutos() {
    const vitrine = document.getElementById('lista-produtos');
    if (!vitrine) return;

    try {
        const resposta = await fetch(`${API_BASE_URL}/produto`, {
            credentials: 'include'
        });

        if (!resposta.ok) {
            throw new Error('Erro ao buscar produtos.');
        }

        const produtos = await resposta.json();
        mostrarProdutos(produtos);

    } catch (erro) {
        vitrine.innerHTML = `<p>Não foi possível carregar os produtos.</p>`;
        console.error(erro);
    }
}

function mostrarProdutos(produtos) {
    const vitrine = document.getElementById('lista-produtos');
    vitrine.innerHTML = '';

    if (produtos.length === 0) {
        vitrine.innerHTML = `<p>Nenhum produto cadastrado na loja.</p>`;
        return;
    }

    produtos.forEach(produto => {
        const card = document.createElement('div');
        card.className = 'produto-card';

        const imagem = produto.imagem_url
            ? `${API_BASE_URL}/${produto.imagem_url.replace(/^\/+/, '')}`
            : `${API_BASE_URL}/imagem/silhueta.png`;

        const nome = escaparHTML(produto.nome);

        const preco = Number(produto.preco_galeoes || 0).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        const estoque = Number(produto.estoque || 0);

        card.innerHTML = `
            <img src="${imagem}" alt="${nome}"
                onerror="this.src='${API_BASE_URL}/imagem/silhueta.png'">

            <h3>${nome}</h3>

            <p class="estoque">
                Estoque: ${estoque} unidades
            </p>

            <p class="preco">${preco} Galeões</p>
        `;

        vitrine.appendChild(card);
    });
}

function escaparHTML(texto) {
    return String(texto).replace(/[&<>"']/g, caractere => {
        const caracteres = {
            '&': '\u0026amp;',
            '<': '\u0026lt;',
            '>': '\u0026gt;',
            '"': '\u0026quot;',
            "'": '\u0026#39;'
        };
        return caracteres[caractere];
    });
}

// Bloqueia botão Voltar do navegador após sair (bfcache)
window.addEventListener('pageshow', async (evento) => {
    if (evento.persisted) {
        await protegerPaginaAdmin();
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    const autorizado = await protegerPaginaAdmin();
    if (!autorizado) return;

    listarProdutos();

    const btnSair = document.getElementById('botao-sair-admin');
    if (btnSair) {
        btnSair.addEventListener('click', sairAdmin);
    }
});