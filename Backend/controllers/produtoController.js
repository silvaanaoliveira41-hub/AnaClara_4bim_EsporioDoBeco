const { query } = require('../database');
const fs = require('fs');
const { obterUsuarioPorToken } = require('./loginController');

function obterAdminAutenticado(req) {
    if (req.session && req.session.usuario && req.session.usuario.tipo_usuario === 'administrador') {
        return req.session.usuario;
    }

    const tokenHeader = req.headers['x-auth-token'];
    const usuarioToken = obterUsuarioPorToken(tokenHeader);
    if (usuarioToken && usuarioToken.tipo_usuario === 'administrador') {
        return usuarioToken;
    }

    return null;
}

function verificarAdministrador(req, res) {
    const admin = obterAdminAutenticado(req);
    if (!admin) {
        res.status(403).json({
            mensagem: 'Acesso permitido somente para administradores. Faça login novamente.'
        });
        return null;
    }
    return admin;
}

function validarId(id) {
    return /^[1-9]\d*$/.test(String(id));
}

async function listarProdutos(req, res) {
    try {
        const resultado = await query(
            `SELECT *
             FROM produtos_magicos
             ORDER BY id`
        );
        return res.status(200).json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao listar produtos:', erro);
        return res.status(500).json({
            mensagem: 'Erro ao listar produtos.'
        });
    }
}

async function buscarProdutoPorId(req, res) {
    try {
        const { id } = req.params;

        if (!validarId(id)) {
            return res.status(400).json({
                mensagem: 'ID do produto inválido.'
            });
        }

        const resultado = await query(
            `SELECT *
             FROM produtos_magicos
             WHERE id = $1`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Produto não encontrado.'
            });
        }

        return res.status(200).json(resultado.rows[0]);
    } catch (erro) {
        console.error('Erro ao buscar produto:', erro);
        return res.status(500).json({
            mensagem: 'Erro ao buscar produto.'
        });
    }
}

async function cadastrarProduto(req, res) {
    const admin = verificarAdministrador(req, res);
    if (!admin) return;

    try {
        const {
            nome,
            categoria,
            descricao,
            preco_galeoes,
            estoque
        } = req.body;

        if (
            !nome ||
            !categoria ||
            preco_galeoes === undefined ||
            estoque === undefined
        ) {
            return res.status(400).json({
                mensagem: 'Preencha o nome, a categoria, o preço e o estoque.'
            });
        }

        if (
            !Number.isFinite(Number(preco_galeoes)) ||
            Number(preco_galeoes) < 0 ||
            !Number.isInteger(Number(estoque)) ||
            Number(estoque) < 0
        ) {
            return res.status(400).json({
                mensagem: 'Preço ou estoque inválido.'
            });
        }

        const resultado = await query(
            `INSERT INTO produtos_magicos
            (nome, categoria, descricao, preco_galeoes,
             estoque, imagem_url, cadastrado_por_admin_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                nome.trim(),
                categoria,
                descricao || null,
                Number(preco_galeoes),
                Number(estoque),
                null,
                admin.id
            ]
        );

        return res.status(201).json({
            mensagem: 'Produto cadastrado com sucesso!',
            produto: resultado.rows[0]
        });

    } catch (erro) {
        console.error('Erro detalhado ao cadastrar produto:', erro);
        return res.status(500).json({
            mensagem: `Erro ao cadastrar produto: ${erro.message}`
        });
    }
}

async function atualizarProduto(req, res) {
    const admin = verificarAdministrador(req, res);
    if (!admin) return;

    try {
        const { id } = req.params;
        const {
            nome,
            categoria,
            descricao,
            preco_galeoes,
            estoque
        } = req.body;

        if (!validarId(id)) {
            return res.status(400).json({
                mensagem: 'ID do produto inválido.'
            });
        }

        if (
            !nome ||
            !categoria ||
            preco_galeoes === undefined ||
            estoque === undefined
        ) {
            return res.status(400).json({
                mensagem: 'Preencha os campos obrigatórios.'
            });
        }

        if (
            !Number.isFinite(Number(preco_galeoes)) ||
            Number(preco_galeoes) < 0 ||
            !Number.isInteger(Number(estoque)) ||
            Number(estoque) < 0
        ) {
            return res.status(400).json({
                mensagem: 'Preço ou estoque inválido.'
            });
        }

        const resultado = await query(
            `UPDATE produtos_magicos
             SET nome = $1,
                 categoria = $2,
                 descricao = $3,
                 preco_galeoes = $4,
                 estoque = $5
             WHERE id = $6
             RETURNING *`,
            [
                nome.trim(),
                categoria,
                descricao || null,
                Number(preco_galeoes),
                Number(estoque),
                id
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Produto não encontrado.'
            });
        }

        return res.status(200).json({
            mensagem: 'Produto atualizado com sucesso!',
            produto: resultado.rows[0]
        });

    } catch (erro) {
        console.error('Erro ao atualizar produto:', erro);
        return res.status(500).json({
            mensagem: `Erro ao atualizar produto: ${erro.message}`
        });
    }
}

async function uploadImagem(req, res) {
    const admin = verificarAdministrador(req, res);
    if (!admin) return;

    let caminhoImagem;

    try {
        const { id } = req.params;

        if (!validarId(id)) {
            return res.status(400).json({
                mensagem: 'ID do produto inválido.'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                mensagem: 'Selecione uma imagem para enviar.'
            });
        }

        caminhoImagem = req.file.path;
        const imagemUrl = `imagem/${req.file.filename}`;

        const resultado = await query(
            `UPDATE produtos_magicos
             SET imagem_url = $1
             WHERE id = $2
             RETURNING *`,
            [imagemUrl, id]
        );

        if (resultado.rows.length === 0) {
            await fs.promises.unlink(caminhoImagem);
            return res.status(404).json({
                mensagem: 'Produto não encontrado.'
            });
        }

        return res.status(200).json({
            mensagem: 'Imagem enviada com sucesso!',
            produto: resultado.rows[0]
        });

    } catch (erro) {
        console.error('Erro ao enviar imagem:', erro);

        if (caminhoImagem) {
            try {
                await fs.promises.unlink(caminhoImagem);
            } catch (erroArquivo) {
                console.error('Erro ao remover arquivo:', erroArquivo);
            }
        }

        return res.status(500).json({
            mensagem: 'Erro ao salvar a imagem do produto.'
        });
    }
}

async function excluirProduto(req, res) {
    const admin = verificarAdministrador(req, res);
    if (!admin) return;

    try {
        const { id } = req.params;

        if (!validarId(id)) {
            return res.status(400).json({
                mensagem: 'ID do produto inválido.'
            });
        }

        const resultado = await query(
            `DELETE FROM produtos_magicos
             WHERE id = $1
             RETURNING id`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Produto não encontrado.'
            });
        }

        return res.status(200).json({
            mensagem: 'Produto excluído com sucesso!'
        });

    } catch (erro) {
        console.error('Erro ao excluir produto:', erro);

        if (erro.code === '23503') {
            return res.status(409).json({
                mensagem: 'Este produto está relacionado a pedidos e não pode ser excluído.'
            });
        }

        return res.status(500).json({
            mensagem: 'Erro ao excluir produto.'
        });
    }
}

module.exports = {
    listarProdutos,
    buscarProdutoPorId,
    cadastrarProduto,
    atualizarProduto,
    uploadImagem,
    excluirProduto
};