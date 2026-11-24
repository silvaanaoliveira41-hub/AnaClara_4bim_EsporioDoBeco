const API_BASE_URL = 'http://localhost:3001';

let produtos = [];

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
            headers: obterHeadersAutenticados(),
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
        console.warn('Verificando sessão local...');
    }

    if (usuarioLocal && usuarioLocal.tipo_usuario === 'administrador') {
        return true;
    }

    sessionStorage.clear();
    window.location.replace('../login/login.html');
    return false;
}

const formulario = document.getElementById('produtoForm');

if (formulario) {
    formulario.addEventListener('submit', salvarProduto);
}

async function listar() {
    const tabela = document.getElementById('tabela-produtos');

    try {
        const resposta = await fetch(`${API_BASE_URL}/produto`, {
            credentials: 'include',
            headers: obterHeadersAutenticados()
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.mensagem || 'Erro ao buscar produtos.');
        }

        produtos = resultado;
        mostrarProdutos(produtos);

    } catch (erro) {
        if (tabela) {
            tabela.innerHTML = `
                <tr>
                    <td colspan="6">${erro.message}</td>
                </tr>
            `;
        }
        console.error('Erro ao listar produtos:', erro);
    }
}

function mostrarProdutos(lista) {
    const tabela = document.getElementById('tabela-produtos');
    if (!tabela) return;

    tabela.innerHTML = '';

    if (lista.length === 0) {
        tabela.innerHTML = `
            <tr>
                <td colspan="6">Nenhum produto cadastrado.</td>
            </tr>
        `;
        return;
    }

    lista.forEach(produto => {
        const imagem = produto.imagem_url
            ? (produto.imagem_url.startsWith('http')
                ? produto.imagem_url
                : `${API_BASE_URL}/${produto.imagem_url.replace(/^\/+/, '')}`)
            : '';

        tabela.innerHTML += `
            <tr>
                <td>${produto.id}</td>
                <td>
                    ${imagem
                        ? `<img src="${imagem}" alt="${produto.nome}" class="imagem-produto">`
                        : 'Sem imagem'}
                </td>
                <td>${produto.nome}</td>
                <td>
                    ${Number(produto.preco_galeoes).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })} Galeões
                </td>
                <td>${produto.estoque}</td>
                <td class="acoes">
                    <button class="editar" onclick="editarProduto(${produto.id})">
                        Alterar
                    </button>
                    <button class="excluir" onclick="excluirProduto(${produto.id})">
                        Excluir
                    </button>
                </td>
            </tr>
        `;
    });
}

async function salvarProduto(event) {
    event.preventDefault();

    const id = document.getElementById('id_produto').value;

    const produto = {
        nome: document.getElementById('nome_produto').value.trim(),
        categoria: document.getElementById('categoria').value,
        descricao: document.getElementById('descricao').value.trim(),
        preco_galeoes: Number(document.getElementById('preco_unitario_produto').value),
        estoque: Number(document.getElementById('quantidade_estoque_produto').value)
    };

    const arquivoImagem = document.getElementById('imagem').files[0];

    try {
        const resposta = await fetch(
            id ? `${API_BASE_URL}/produto/${id}` : `${API_BASE_URL}/produto`,
            {
                method: id ? 'PUT' : 'POST',
                credentials: 'include',
                headers: obterHeadersAutenticados(true),
                body: JSON.stringify(produto)
            }
        );

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.mensagem || 'Não foi possível salvar o produto.');
        }

        const idProduto = id || resultado.produto?.id;

        if (arquivoImagem) {
            if (!idProduto) {
                throw new Error('Não foi possível identificar o produto para enviar a imagem.');
            }

            const dadosImagem = new FormData();
            dadosImagem.append('imagem', arquivoImagem);

            const respostaImagem = await fetch(
                `${API_BASE_URL}/produto/upload/${idProduto}`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: obterHeadersAutenticados(false),
                    body: dadosImagem
                }
            );

            const resultadoImagem = await respostaImagem.json();

            if (!respostaImagem.ok) {
                throw new Error(
                    resultadoImagem.mensagem ||
                    'Produto salvo, mas houve um erro ao enviar a imagem.'
                );
            }
        }

        mostrarMensagem(
            id ? 'Produto alterado com sucesso!' : 'Produto cadastrado com sucesso!',
            'sucesso'
        );

        limparFormulario();
        await listar();

    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
        console.error('Erro ao salvar produto:', erro);
    }
}

function editarProduto(id) {
    const produto = produtos.find(item => Number(item.id) === Number(id));
    if (!produto) return;

    document.getElementById('id_produto').value = produto.id;
    document.getElementById('nome_produto').value = produto.nome;
    document.getElementById('categoria').value = produto.categoria;
    document.getElementById('descricao').value = produto.descricao || '';
    document.getElementById('preco_unitario_produto').value = produto.preco_galeoes;
    document.getElementById('quantidade_estoque_produto').value = produto.estoque;

    document.getElementById('titulo-formulario').textContent = 'Alterar Produto';
    document.getElementById('botao-salvar').textContent = 'Salvar Alterações';
    document.getElementById('imagem').value = '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function excluirProduto(id) {
    const confirmar = confirm('Tem certeza que deseja excluir este produto?');
    if (!confirmar) return;

    try {
        const resposta = await fetch(`${API_BASE_URL}/produto/${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: obterHeadersAutenticados()
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.mensagem || 'Não foi possível excluir o produto.');
        }

        mostrarMensagem(resultado.mensagem || 'Produto excluído com sucesso!', 'sucesso');
        await listar();

    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
        console.error('Erro ao excluir produto:', erro);
    }
}

function filtrarProdutos() {
    const pesquisa = document.getElementById('buscar').value.toLowerCase();
    const resultado = produtos.filter(produto =>
        produto.nome.toLowerCase().includes(pesquisa)
    );
    mostrarProdutos(resultado);
}

function limparFormulario() {
    if (!formulario) return;

    formulario.reset();
    document.getElementById('id_produto').value = '';
    document.getElementById('titulo-formulario').textContent = 'Cadastrar Produto';
    document.getElementById('botao-salvar').textContent = 'Cadastrar Produto';
}

function mostrarMensagem(texto, tipo) {
    const mensagem = document.getElementById('mensagem');
    if (!mensagem) return;

    mensagem.textContent = texto;
    mensagem.className = tipo;
}

window.addEventListener('pageshow', async (evento) => {
    if (evento.persisted) {
        await protegerPaginaAdmin();
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    const autorizado = await protegerPaginaAdmin();
    if (!autorizado) return;

    listar();
});