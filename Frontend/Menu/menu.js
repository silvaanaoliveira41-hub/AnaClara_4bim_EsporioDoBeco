const API_BASE_URL = 'http://localhost:3001';

let usuarioAtual = null;
let produtosCarregados = [];

function obterHeadersAutenticados(comJson = false) {
    const headers = {};
    if (comJson) {
        headers['Content-Type'] = 'application/json';
    }
    const token = sessionStorage.getItem('authToken');
    if (token) {
        headers['x-auth-token'] = token;
    }
    return headers;
}

function atualizarInterfaceUsuario(usuario) {
    const botaoEntrar = document.getElementById('botao-entrar');
    const usuarioLogado = document.getElementById('usuario-logado');
    const nomeUsuario = document.getElementById('nome-usuario');
    const mensagemMagica = document.getElementById('mensagem-magica');

    if (usuario) {
        usuarioAtual = usuario;
        if (botaoEntrar) {
            botaoEntrar.hidden = true;
            botaoEntrar.style.display = 'none';
        }
        if (usuarioLogado) {
            usuarioLogado.hidden = false;
            usuarioLogado.style.display = 'flex';
        }
        if (nomeUsuario) {
            nomeUsuario.textContent = `Olá, ${usuario.nome}!`;
        }
        if (mensagemMagica) {
            mensagemMagica.hidden = true;
        }
    } else {
        usuarioAtual = null;
        if (botaoEntrar) {
            botaoEntrar.hidden = false;
            botaoEntrar.style.display = '';
        }
        if (usuarioLogado) {
            usuarioLogado.hidden = true;
            usuarioLogado.style.display = 'none';
        }
        if (mensagemMagica) {
            mensagemMagica.hidden = false;
        }
    }
}

// Carrega os produtos da loja no catálogo
async function carregarProdutosMenu() {
    const container = document.getElementById('lista-produtos');
    if (!container) return;

    try {
        const resposta = await fetch(`${API_BASE_URL}/produto`, {
            credentials: 'include',
            headers: obterHeadersAutenticados()
        });

        if (!resposta.ok) throw new Error('Erro ao carregar produtos.');

        const produtos = await resposta.json();
        produtosCarregados = produtos;
        renderizarGrid(produtos, container);
    } catch (erro) {
        console.error(erro);
        container.innerHTML = `
            <p class="mensagem-erro">Não foi possível carregar os produtos mágicos.</p>
        `;
    }
}

function renderizarGrid(produtos, container) {
    container.innerHTML = '';

    const produtosDisponiveis = produtos.filter(prod => Number(prod.estoque) > 0);

    if (produtosDisponiveis.length === 0) {
        container.innerHTML = `
            <p class="mensagem-carregamento">
                Nenhum artefato disponível no momento.
            </p>
        `;
        return;
    }

    produtosDisponiveis.forEach(prod => {
        const card = document.createElement('article');
        card.classList.add('cartao-produto');

        const imagem = prod.imagem_url
            ? `${API_BASE_URL}/${prod.imagem_url.replace(/^\/+/, '')}`
            : 'logo-emporio.png';

        const preco = Number(prod.preco_galeoes || prod.preco || 0).toFixed(2);
        const estoque = Number(prod.estoque || 0);

        card.innerHTML = `
            <div class="area-imagem">
                <img src="${imagem}" alt="${prod.nome}" onerror="this.src='logo-emporio.png'">
            </div>

            <div class="informacoes-produto">
                <h3>${prod.nome}</h3>
                <p class="descricao-produto">${prod.descricao || 'Artefato mágico exclusivo do Beco.'}</p>
                <p style="color: var(--lilas); font-size: 13px; margin-bottom: 8px;">
                    Disponível: ${estoque} un.
                </p>
                <p class="preco-produto">${preco} Galeões</p>
                <button
                    type="button"
                    class="botao-comprar"
                    data-id="${prod.id}"
                    style="width: 100%; border: none; font-family: Georgia, serif; font-size: 15px; font-weight: bold; cursor: pointer;">
                    Comprar
                </button>
            </div>
        `;

        const botao = card.querySelector('.botao-comprar');
        botao.addEventListener('click', () => comprarNoMenu(prod.id));

        container.appendChild(card);
    });
}

// Ação do botão Comprar
async function comprarNoMenu(produtoId) {
    // Garante leitura atualizada do usuário logado
    if (!usuarioAtual) {
        const salvo = sessionStorage.getItem('usuarioLogado');
        if (salvo) {
            try {
                usuarioAtual = JSON.parse(salvo);
            } catch (e) {
                usuarioAtual = null;
            }
        }
    }

    if (!usuarioAtual) {
        alert('Faça login na sua conta para comprar no Empório Mágico do Beco!');
        window.location.href = '../login/login.html';
        return;
    }

    const produto = produtosCarregados.find(p => Number(p.id) === Number(produtoId));
    if (!produto) {
        alert('Produto não encontrado. Atualize a página e tente novamente.');
        return;
    }

    const estoqueDisponivel = Number(produto.estoque);
    if (estoqueDisponivel <= 0) {
        alert('Este produto está esgotado no momento.');
        return;
    }

    const entrada = prompt(
        `Quantas unidades de "${produto.nome}" você deseja comprar?\n(Estoque disponível: ${estoqueDisponivel})`,
        '1'
    );

    if (entrada === null) return;

    const quantidade = Number(entrada);

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
        alert('Digite uma quantidade válida (número inteiro maior que zero).');
        return;
    }

    if (quantidade > estoqueDisponivel) {
        alert(`Quantidade indisponível. Temos apenas ${estoqueDisponivel} unidade(s) em estoque.`);
        return;
    }

    try {
        const resposta = await fetch(`${API_BASE_URL}/api/pedidos`, {
            method: 'POST',
            credentials: 'include',
            headers: obterHeadersAutenticados(true),
            body: JSON.stringify({
                usuario_id: usuarioAtual.id,
                itens: [
                    {
                        produto_id: produto.id,
                        quantidade: quantidade
                    }
                ]
            })
        });

        const dados = await resposta.json();

        if (resposta.status === 401 || dados.naoLogado) {
            sessionStorage.clear();
            atualizarInterfaceUsuario(null);
            alert('Sua sessão expirou. Entre na sua conta para concluir a compra.');
            window.location.href = '../login/login.html';
            return;
        }

        if (!resposta.ok) {
            alert(dados.mensagem || 'Não foi possível concluir a compra.');
            return;
        }

        alert(dados.mensagem || 'Compra realizada com sucesso!');
        await carregarProdutosMenu();

    } catch (erro) {
        console.error('Erro ao realizar compra:', erro);
        alert('Erro de conexão ao registrar seu pedido. Verifique se o servidor está rodando.');
    }
}

// Verifica se existe um usuário conectado
async function verificarUsuarioLogado() {
    const dadosLocaisTexto = sessionStorage.getItem('usuarioLogado');
    let usuarioLocal = null;

    if (dadosLocaisTexto) {
        try {
            usuarioLocal = JSON.parse(dadosLocaisTexto);
            atualizarInterfaceUsuario(usuarioLocal);
        } catch (e) {
            usuarioLocal = null;
        }
    }

    try {
        const resposta = await fetch(`${API_BASE_URL}/login/sessao`, {
            method: 'GET',
            credentials: 'include',
            headers: obterHeadersAutenticados(),
            cache: 'no-store'
        });

        if (resposta.ok) {
            const dados = await resposta.json();
            if (dados.logado && dados.usuario) {
                sessionStorage.setItem('usuarioLogado', JSON.stringify(dados.usuario));
                atualizarInterfaceUsuario(dados.usuario);
                return;
            }
        }

        if (!usuarioLocal) {
            atualizarInterfaceUsuario(null);
        }
    } catch (erro) {
        console.error('Erro ao verificar sessão:', erro);
        if (!usuarioLocal) {
            atualizarInterfaceUsuario(null);
        }
    }
}

// Encerra a sessão do usuário
async function sairDaConta() {
    const botaoSair = document.getElementById('botao-sair');
    if (botaoSair) botaoSair.disabled = true;

    try {
        await fetch(`${API_BASE_URL}/login/sair`, {
            method: 'POST',
            credentials: 'include',
            headers: obterHeadersAutenticados()
        });
    } catch (erro) {
        console.error('Erro ao sair da conta:', erro);
    } finally {
        sessionStorage.clear();
        atualizarInterfaceUsuario(null);
        window.location.replace('../login/login.html');
    }
}

window.addEventListener('pageshow', () => {
    verificarUsuarioLogado();
});

document.addEventListener('DOMContentLoaded', () => {
    verificarUsuarioLogado();
    carregarProdutosMenu();

    const botaoSair = document.getElementById('botao-sair');
    if (botaoSair) {
        botaoSair.addEventListener('click', sairDaConta);
    }
});