const API_BASE_URL = 'http://localhost:3001';

let listaPedidos = [];

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
        console.warn('Validando sessão local...');
    }

    if (usuarioLocal && usuarioLocal.tipo_usuario === 'administrador') {
        return true;
    }

    sessionStorage.clear();
    window.location.replace('../login/login.html');
    return false;
}

async function carregarPedidos() {
    const tabela = document.getElementById('tabela-pedidos');
    const msg = document.getElementById('mensagem-pedidos');

    try {
        const resposta = await fetch(`${API_BASE_URL}/api/pedidos`, {
            method: 'GET',
            credentials: 'include',
            headers: obterHeadersAutenticados(),
            cache: 'no-store'
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.mensagem || 'Erro ao carregar os pedidos.');
        }

        listaPedidos = Array.isArray(dados) ? dados : [];
        if (msg) msg.textContent = '';
        renderizarPedidos(listaPedidos);

    } catch (erro) {
        console.error('Erro ao carregar pedidos:', erro);
        if (msg) {
            msg.style.color = '#ff8a8a';
            msg.textContent = erro.message || 'Erro ao carregar os pedidos.';
        }
        if (tabela) {
            tabela.innerHTML = `
                <tr>
                    <td colspan="7">${erro.message || 'Não foi possível conectar ao servidor.'}</td>
                </tr>
            `;
        }
    }
}

function renderizarPedidos(pedidos) {
    const tabela = document.getElementById('tabela-pedidos');
    if (!tabela) return;

    tabela.innerHTML = '';

    if (pedidos.length === 0) {
        tabela.innerHTML = `
            <tr>
                <td colspan="7">Nenhum pedido realizado até o momento.</td>
            </tr>
        `;
        return;
    }

    pedidos.forEach(pedido => {
        const itensTexto = Array.isArray(pedido.itens) && pedido.itens.length > 0
            ? pedido.itens
                .map(item => `${item.quantidade}x ${item.nome_produto}`)
                .join('<br>')
            : 'Itens não detalhados';

        const totalFormatado = Number(pedido.valor_total || 0).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        const dataFormatada = pedido.data_pedido
            ? new Date(pedido.data_pedido).toLocaleString('pt-BR')
            : '-';

        const statusAtual = String(pedido.status || 'pendente').toLowerCase();

        tabela.innerHTML += `
            <tr>
                <td>#${pedido.id}</td>
                <td>
                    <strong>${pedido.nome_cliente || 'Cliente'}</strong><br>
                    <small style="color: #c6a7ff;">${pedido.email_cliente || ''}</small>
                </td>
                <td>${itensTexto}</td>
                <td>${pedido.forma_pagamento || 'Não informada'}</td>
                <td><strong>${totalFormatado} Galeões</strong></td>
                <td>${dataFormatada}</td>
                <td>
                    <select
                        onchange="alterarStatusPedido(${pedido.id}, this.value)"
                        style="background: #10091c; color: #ffe7a8; border: 1px solid #e2c078; border-radius: 6px; padding: 6px 8px; font-family: Georgia, serif;">
                        <option value="pendente" ${statusAtual === 'pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="pago" ${statusAtual === 'pago' ? 'selected' : ''}>Pago</option>
                        <option value="enviado" ${statusAtual === 'enviado' ? 'selected' : ''}>Enviado</option>
                        <option value="entregue" ${statusAtual === 'entregue' ? 'selected' : ''}>Entregue</option>
                        <option value="cancelado" ${statusAtual === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                    </select>
                </td>
            </tr>
        `;
    });
}

async function alterarStatusPedido(id, novoStatus) {
    const msg = document.getElementById('mensagem-pedidos');

    try {
        const resposta = await fetch(`${API_BASE_URL}/api/pedidos/${id}/status`, {
            method: 'PUT',
            credentials: 'include',
            headers: obterHeadersAutenticados(true),
            body: JSON.stringify({ status: novoStatus })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.mensagem || 'Erro ao atualizar status do pedido.');
        }

        if (msg) {
            msg.style.color = '#9ef0b8';
            msg.textContent = `Status do pedido #${id} atualizado para "${novoStatus}"!`;
        }
    } catch (erro) {
        console.error('Erro ao atualizar status:', erro);
        alert(erro.message || 'Não foi possível atualizar o status do pedido.');
        await carregarPedidos();
    }
}

function filtrarPedidos() {
    const termo = document.getElementById('buscar-pedido').value.toLowerCase().trim();

    if (!termo) {
        renderizarPedidos(listaPedidos);
        return;
    }

    const filtrados = listaPedidos.filter(p => {
        const idMatch = String(p.id).includes(termo);
        const clienteMatch = String(p.nome_cliente || '').toLowerCase().includes(termo);
        const emailMatch = String(p.email_cliente || '').toLowerCase().includes(termo);
        const itensMatch = Array.isArray(p.itens) && p.itens.some(i =>
            String(i.nome_produto || '').toLowerCase().includes(termo)
        );
        return idMatch || clienteMatch || emailMatch || itensMatch;
    });

    renderizarPedidos(filtrados);
}

window.addEventListener('pageshow', async (evento) => {
    if (evento.persisted) {
        await protegerPaginaAdmin();
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    const autorizado = await protegerPaginaAdmin();
    if (!autorizado) return;

    await carregarPedidos();
});