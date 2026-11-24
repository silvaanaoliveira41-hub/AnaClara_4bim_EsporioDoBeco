
const express = require('express');

const router = express.Router();

// Importa o controller de usuários
const usuarioController = require('../controllers/usuarioController');

// Lista todos os usuários
router.get('/', usuarioController.listarUsuarios);

// Busca um usuário pelo ID
router.get('/:id', usuarioController.buscarUsuarioPorId);

// Atualiza os dados de um usuário
router.put('/:id', usuarioController.atualizarUsuario);

// Exporta as rotas
module.exports = router;
