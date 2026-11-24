
const { query } = require('../database');

// Verifica se existe um usuário autenticado
function verificarLogin(req, res) {
    if (!req.session || !req.session.usuario) {
        res.status(401).json({
            mensagem: 'Você precisa realizar o login.'
        });

        return false;
    }

    return true;
}

// Verifica se o usuário é administrador
function verificarAdministrador(req, res) {
    if (!verificarLogin(req, res)) return false;

    if (req.session.usuario.tipo_usuario !== 'administrador') {
        res.status(403).json({
            mensagem: 'Acesso permitido somente para administradores.'
        });

        return false;
    }

    return true;
}

// Verifica se o ID é válido
function validarId(id) {
    return /^[1-9]\d*$/.test(String(id));
}

// Lista todos os usuários
async function listarUsuarios(req, res) {
    if (!verificarAdministrador(req, res)) return;

    try {
        const resultado = await query(
            `SELECT
                id,
                nome,
                email,
                tipo_usuario,
                casa,
                data_cadastro
             FROM usuarios
             ORDER BY id`
        );

        return res.status(200).json(resultado.rows);

    } catch (erro) {
        console.error('Erro ao listar usuários:', erro);

        return res.status(500).json({
            mensagem: 'Erro ao listar usuários.'
        });
    }
}

// Busca um usuário pelo ID
async function buscarUsuarioPorId(req, res) {
    if (!verificarLogin(req, res)) return;

    try {
        const { id } = req.params;
        const usuarioLogado = req.session.usuario;

        if (!validarId(id)) {
            return res.status(400).json({
                mensagem: 'ID do usuário inválido.'
            });
        }

        // Cliente só pode consultar a própria conta
        if (
            usuarioLogado.tipo_usuario !== 'administrador' &&
            String(usuarioLogado.id) !== String(id)
        ) {
            return res.status(403).json({
                mensagem: 'Você não pode consultar os dados de outro usuário.'
            });
        }

        const resultado = await query(
            `SELECT
                id,
                nome,
                email,
                tipo_usuario,
                casa,
                data_cadastro
             FROM usuarios
             WHERE id = $1`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Usuário não encontrado.'
            });
        }

        return res.status(200).json(resultado.rows[0]);

    } catch (erro) {
        console.error('Erro ao buscar usuário:', erro);

        return res.status(500).json({
            mensagem: 'Erro ao buscar usuário.'
        });
    }
}

// Atualiza os dados de um usuário
async function atualizarUsuario(req, res) {
    if (!verificarLogin(req, res)) return;

    try {
        const { id } = req.params;
        const usuarioLogado = req.session.usuario;

        const { nome, email, casa } = req.body;

        if (!validarId(id)) {
            return res.status(400).json({
                mensagem: 'ID do usuário inválido.'
            });
        }

        // Cliente só pode atualizar a própria conta
        if (
            usuarioLogado.tipo_usuario !== 'administrador' &&
            String(usuarioLogado.id) !== String(id)
        ) {
            return res.status(403).json({
                mensagem: 'Você não pode alterar os dados de outro usuário.'
            });
        }

        // Verifica se pelo menos um campo foi enviado
        if (
            nome === undefined &&
            email === undefined &&
            casa === undefined
        ) {
            return res.status(400).json({
                mensagem: 'Informe pelo menos um dado para atualizar.'
            });
        }

        // Valida o nome
        if (nome !== undefined && (!nome.trim())) {
            return res.status(400).json({
                mensagem: 'O nome não pode ficar vazio.'
            });
        }

        // Valida o email
        if (email !== undefined && (!email.trim())) {
            return res.status(400).json({
                mensagem: 'O e-mail não pode ficar vazio.'
            });
        }

        // Valida a casa escolhida
        const casasPermitidas = [
            'Grifinoria',
            'Sonserina',
            'Corvinal',
            'Lufa-Lufa',
            'Nenhuma'
        ];

        if (casa !== undefined && !casasPermitidas.includes(casa)) {
            return res.status(400).json({
                mensagem: 'Casa inválida.'
            });
        }

        const nomeLimpo = nome === undefined ? null : nome.trim();
        const emailLimpo = email === undefined
            ? null
            : email.trim().toLowerCase();

        const resultado = await query(
            `UPDATE usuarios
             SET nome = COALESCE($1, nome),
                 email = COALESCE($2, email),
                 casa = COALESCE($3, casa)
             WHERE id = $4
             RETURNING
                id,
                nome,
                email,
                tipo_usuario,
                casa,
                data_cadastro`,
            [nomeLimpo, emailLimpo, casa ?? null, id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Usuário não encontrado.'
            });
        }

        // Atualiza os dados básicos na sessão se for a própria conta
        if (String(usuarioLogado.id) === String(id)) {
            req.session.usuario.nome = resultado.rows[0].nome;
            req.session.usuario.email = resultado.rows[0].email;
        }

        return res.status(200).json({
            mensagem: 'Dados atualizados com sucesso!',
            usuario: resultado.rows[0]
        });

    } catch (erro) {
        console.error('Erro ao atualizar usuário:', erro);

        if (erro.code === '23505') {
            return res.status(409).json({
                mensagem: 'Este e-mail já está cadastrado.'
            });
        }

        return res.status(500).json({
            mensagem: 'Erro ao atualizar os dados do usuário.'
        });
    }
}

// Exporta as funções
module.exports = {
    listarUsuarios,
    buscarUsuarioPorId,
    atualizarUsuario
};
