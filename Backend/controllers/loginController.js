const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../database');

const tokensAtivos = new Map();

function obterUsuarioPorToken(token) {
    if (!token) return null;
    const registro = tokensAtivos.get(token);
    if (!registro) return null;
    if (Date.now() > registro.expiraEm) {
        tokensAtivos.delete(token);
        return null;
    }
    return registro.usuario;
}

async function fazerLogin(req, res) {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                mensagem: 'Preencha o email e a senha.'
            });
        }

        const emailLimpo = email.trim().toLowerCase();

        const resultado = await query(
            `SELECT id, nome, email, senha_hash, tipo_usuario
             FROM usuarios
             WHERE LOWER(email) = $1`,
            [emailLimpo]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                mensagem: 'Email ou senha incorretos.'
            });
        }

        const usuario = resultado.rows[0];
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);

        if (!senhaCorreta) {
            return res.status(401).json({
                mensagem: 'Email ou senha incorretos.'
            });
        }

        if (
            usuario.tipo_usuario !== 'cliente' &&
            usuario.tipo_usuario !== 'administrador'
        ) {
            return res.status(403).json({
                mensagem: 'Tipo de usuário inválido.'
            });
        }

        const dadosUsuario = {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            tipo_usuario: usuario.tipo_usuario
        };

        req.session.usuario = dadosUsuario;

        const authToken = crypto.randomBytes(32).toString('hex');
        tokensAtivos.set(authToken, {
            usuario: dadosUsuario,
            expiraEm: Date.now() + 1000 * 60 * 60 * 24
        });

        req.session.save((erro) => {
            if (erro) {
                console.error('Erro ao salvar sessão:', erro);
                return res.status(500).json({
                    mensagem: 'Erro ao iniciar a sessão.'
                });
            }

            return res.status(200).json({
                mensagem: 'Login realizado com sucesso!',
                logado: true,
                token: authToken,
                usuario: dadosUsuario
            });
        });

    } catch (erro) {
        console.error('Erro ao realizar login:', erro);
        return res.status(500).json({
            mensagem: 'Erro interno ao realizar login.'
        });
    }
}

function verificarSessao(req, res) {
    const tokenHeader = req.headers['x-auth-token'];
    const usuarioToken = obterUsuarioPorToken(tokenHeader);
    const usuarioSessao = (req.session && req.session.usuario) || usuarioToken;

    if (!usuarioSessao) {
        return res.status(401).json({
            logado: false,
            mensagem: 'Nenhum usuário conectado.'
        });
    }

    return res.status(200).json({
        logado: true,
        usuario: usuarioSessao
    });
}

function sair(req, res) {
    const tokenHeader = req.headers['x-auth-token'];
    if (tokenHeader) {
        tokensAtivos.delete(tokenHeader);
    }

    const limparCookieEFinalizar = () => {
        res.clearCookie('connect.sid', {
            path: '/',
            httpOnly: true,
            secure: false,
            sameSite: 'lax'
        });

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Você saiu da sua conta com segurança!'
        });
    };

    if (!req.session) {
        return limparCookieEFinalizar();
    }

    req.session.destroy((erro) => {
        if (erro) {
            console.error('Erro ao encerrar sessão:', erro);
            return res.status(500).json({
                mensagem: 'Erro ao encerrar a sessão.'
            });
        }

        return limparCookieEFinalizar();
    });
}

module.exports = {
    fazerLogin,
    verificarSessao,
    sair,
    obterUsuarioPorToken
};