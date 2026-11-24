
const bcrypt = require('bcryptjs');
const { query } = require('../database');

// Cadastrar uma nova conta
async function cadastrarCliente(req, res) {
    try {
        const { nome, email, senha } = req.body;

        // Verifica os campos obrigatórios
        if (!nome || !email || !senha) {
            return res.status(400).json({
                mensagem: 'Preencha todos os campos.'
            });
        }

        // Padroniza os dados
        const nomeLimpo = nome.trim();
        const emailLimpo = email.trim().toLowerCase();

        // Verifica se o nome não está vazio
        if (!nomeLimpo) {
            return res.status(400).json({
                mensagem: 'Digite seu nome.'
            });
        }

        // Verifica o formato do email
        const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!formatoEmail.test(emailLimpo)) {
            return res.status(400).json({
                mensagem: 'Digite um email válido.'
            });
        }

        // Verifica o tamanho da senha
        if (senha.length < 8) {
            return res.status(400).json({
                mensagem: 'A senha deve ter pelo menos 8 caracteres.'
            });
        }

        // Verifica se o email já existe
        const resultado = await query(
            `SELECT id
             FROM usuarios
             WHERE LOWER(email) = $1`,
            [emailLimpo]
        );

        if (resultado.rows.length > 0) {
            return res.status(409).json({
                mensagem: 'Este email já está cadastrado.'
            });
        }

        // Criptografa a senha
        const senhaHash = await bcrypt.hash(senha, 12);

        // Cadastra o usuário como cliente e retorna seus dados
        const novoUsuario = await query(
            `INSERT INTO usuarios
                (nome, email, senha_hash, tipo_usuario)
             VALUES ($1, $2, $3, $4)
             RETURNING id, nome, email, tipo_usuario`,
            [nomeLimpo, emailLimpo, senhaHash, 'cliente']
        );

        const usuario = novoUsuario.rows[0];

        // Cria a sessão automaticamente após o cadastro
        req.session.usuario = {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            tipo_usuario: usuario.tipo_usuario
        };

        // Aguarda a sessão ser salva antes de responder
        req.session.save((erro) => {
            if (erro) {
                console.error('Erro ao salvar sessão:', erro);

                return res.status(500).json({
                    mensagem: 'Conta criada, mas não foi possível iniciar sua sessão. Faça login.'
                });
            }

            return res.status(201).json({
                mensagem: 'Conta criada com sucesso!',
                sucesso: true,
                logado: true,
                usuario: req.session.usuario
            });
        });

    } catch (erro) {
        console.error('Erro ao cadastrar cliente:', erro);

        if (erro.code === '23505') {
            return res.status(409).json({
                mensagem: 'Este email já está cadastrado.'
            });
        }

        return res.status(500).json({
            mensagem: 'Não foi possível criar sua conta.'
        });
    }
}

// Exporta a função
module.exports = {
    cadastrarCliente
};
