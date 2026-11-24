const { pool, query } = require('../database');
const { obterUsuarioPorToken } = require('./loginController');

// Garante que as colunas necessárias existam na tabela pedidos e itens_pedido
async function garantirTabelasPedidos(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS pedidos (
            id SERIAL PRIMARY KEY,
            cliente_id INTEGER,
            usuario_id INTEGER,
            nome_cliente VARCHAR(150),
            email_cliente VARCHAR(150),
            forma_pagamento VARCHAR(80),
            valor_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
            status VARCHAR(50) NOT NULL DEFAULT 'pendente',
            data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await client.query(`
        ALTER TABLE pedidos
        ADD COLUMN IF NOT EXISTS cliente_id INTEGER,
        ADD COLUMN IF NOT EXISTS usuario_id INTEGER,
        ADD COLUMN IF NOT EXISTS nome_cliente VARCHAR(150),
        ADD COLUMN IF NOT EXISTS email_cliente VARCHAR(150),
        ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(80),
        ADD COLUMN IF NOT EXISTS valor_total NUMERIC(10, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pendente',
        ADD COLUMN IF NOT EXISTS data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    await client.query(`
        ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_status_check;
    `);

    await client.query(`
        CREATE TABLE IF NOT EXISTS itens_pedido (
            id SERIAL PRIMARY KEY,
            pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
            produto_id INTEGER,
            nome_produto VARCHAR(150),
            quantidade INTEGER NOT NULL,
            preco_unitario NUMERIC(10, 2) NOT NULL
        );
    `);
}

// Criar um novo pedido, descontar estoque e registrar forma de pagamento no banco
async function criarPedido(req, res) {
    const tokenHeader = req.headers['x-auth-token'];
    const usuarioToken = obterUsuarioPorToken(tokenHeader);
    let usuario = (req.session && req.session.usuario) || usuarioToken;

    const { itens, usuario_id, forma_pagamento } = req.body;

    if (!usuario && usuario_id) {
        try {
            const resUsuario = await query(
                'SELECT id, nome, email, tipo_usuario FROM usuarios WHERE id = $1',
                [Number(usuario_id)]
            );
            if (resUsuario.rows.length > 0) {
                usuario = resUsuario.rows[0];
            }
        } catch (e) {
            console.error('Erro ao buscar usuário para pedido:', e);
        }
    }

    if (!usuario) {
        return res.status(401).json({
            naoLogado: true,
            mensagem: 'Você precisa entrar na sua conta para comprar.'
        });
    }

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({
            mensagem: 'Informe os produtos e quantidades do pedido.'
        });
    }

    const formasPermitidas = [
        'Galeões de Ouro (Cofre Gringotes)',
        'PIX Mágico (Instantâneo)',
        'Cartão de Crédito Encantado',
        'Coruja na Entrega'
    ];

    const pagamentoEscolhido = forma_pagamento && formasPermitidas.includes(forma_pagamento)
        ? forma_pagamento
        : 'Galeões de Ouro (Cofre Gringotes)';

    const client = await pool.connect();

    try {
        await garantirTabelasPedidos(client);
        await client.query('BEGIN');

        let valorTotal = 0;
        const itensValidados = [];

        for (const item of itens) {
            const produtoId = Number(item.produto_id || item.id);
            const quantidade = Number(item.quantidade || 1);

            if (!Number.isInteger(produtoId) || !Number.isInteger(quantidade) || quantidade <= 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    mensagem: 'Quantidade ou produto inválido.'
                });
            }

            const resProduto = await client.query(
                `SELECT id, nome, preco_galeoes, estoque
                 FROM produtos_magicos
                 WHERE id = $1
                 FOR UPDATE`,
                [produtoId]
            );

            if (resProduto.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    mensagem: 'Produto não encontrado no catálogo.'
                });
            }

            const produtoBanco = resProduto.rows[0];

            if (Number(produtoBanco.estoque) < quantidade) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    mensagem: `Estoque insuficiente para "${produtoBanco.nome}". Disponível: ${produtoBanco.estoque} unidade(s).`
                });
            }

            const precoUnitario = Number(produtoBanco.preco_galeoes);
            valorTotal += precoUnitario * quantidade;

            itensValidados.push({
                produto_id: produtoBanco.id,
                nome_produto: produtoBanco.nome,
                quantidade,
                preco_unitario: precoUnitario
            });

            await client.query(
                `UPDATE produtos_magicos
                 SET estoque = estoque - $1
                 WHERE id = $2`,
                [quantidade, produtoBanco.id]
            );
        }

        const resPedido = await client.query(
            `INSERT INTO pedidos (cliente_id, usuario_id, nome_cliente, email_cliente, forma_pagamento, valor_total, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [usuario.id, usuario.id, usuario.nome, usuario.email, pagamentoEscolhido, valorTotal, 'pendente']
        );

        const pedidoCriado = resPedido.rows[0];

        for (const item of itensValidados) {
            await client.query(
                `INSERT INTO itens_pedido (pedido_id, produto_id, nome_produto, quantidade, preco_unitario)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    pedidoCriado.id,
                    item.produto_id,
                    item.nome_produto,
                    item.quantidade,
                    item.preco_unitario
                ]
            );
        }

        await client.query('COMMIT');

        return res.status(201).json({
            sucesso: true,
            mensagem: `Pedido #${pedidoCriado.id} confirmado via ${pagamentoEscolhido}!`,
            pedido: pedidoCriado
        });

    } catch (erro) {
        await client.query('ROLLBACK');
        console.error('Erro ao criar pedido:', erro);

        return res.status(500).json({
            mensagem: `Erro ao processar sua compra: ${erro.message}`
        });
    } finally {
        client.release();
    }
}

// Listar pedidos (seguro contra colunas antigas e trazendo itens e dados do cliente)
async function listarPedidos(req, res) {
    try {
        const resultado = await query(
            `SELECT p.*,
                    COALESCE(u.nome, p.nome_cliente, 'Cliente') AS cliente_nome_final,
                    COALESCE(u.email, p.email_cliente, '') AS cliente_email_final,
                    COALESCE(
                        (
                            SELECT json_agg(
                                json_build_object(
                                    'produto_id', ip.produto_id,
                                    'nome_produto', ip.nome_produto,
                                    'quantidade', ip.quantidade,
                                    'preco_unitario', ip.preco_unitario
                                )
                            )
                            FROM itens_pedido ip
                            WHERE ip.pedido_id = p.id
                        ),
                        '[]'::json
                    ) AS itens
             FROM pedidos p
             LEFT JOIN usuarios u ON u.id = COALESCE(p.cliente_id, p.usuario_id)
             ORDER BY p.id DESC`
        );

        const pedidosFormatados = resultado.rows.map(row => ({
            ...row,
            nome_cliente: row.cliente_nome_final,
            email_cliente: row.cliente_email_final,
            valor_total: Number(row.valor_total ?? row.total ?? row.total_galeoes ?? 0),
            data_pedido: row.data_pedido || row.criado_em || row.created_at || null
        }));

        return res.status(200).json(pedidosFormatados);

    } catch (erro) {
        console.error('Erro ao listar pedidos:', erro);

        return res.status(500).json({
            mensagem: `Erro ao listar pedidos: ${erro.message}`
        });
    }
}

// Buscar pedido pelo ID
async function buscarPedidoPorId(req, res) {
    try {
        const { id } = req.params;

        const resultado = await query(
            'SELECT * FROM pedidos WHERE id = $1',
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Pedido não encontrado.'
            });
        }

        return res.status(200).json(resultado.rows[0]);

    } catch (erro) {
        console.error('Erro ao buscar pedido:', erro);

        return res.status(500).json({
            mensagem: 'Erro ao buscar pedido.'
        });
    }
}

// Atualizar status do pedido
async function atualizarStatusPedido(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                mensagem: 'Informe o status do pedido.'
            });
        }

        const resultado = await query(
            `UPDATE pedidos
             SET status = $1
             WHERE id = $2
             RETURNING *`,
            [status, id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Pedido não encontrado.'
            });
        }

        return res.status(200).json({
            mensagem: 'Status atualizado com sucesso!',
            pedido: resultado.rows[0]
        });

    } catch (erro) {
        console.error('Erro ao atualizar pedido:', erro);

        return res.status(500).json({
            mensagem: 'Erro ao atualizar pedido.'
        });
    }
}

module.exports = {
    criarPedido,
    listarPedidos,
    buscarPedidoPorId,
    atualizarStatusPedido
};