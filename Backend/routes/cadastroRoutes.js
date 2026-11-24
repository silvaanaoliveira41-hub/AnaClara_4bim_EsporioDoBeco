// Importa o Express para criar as rotas.
const express = require('express');

// Cria um roteador para organizar as rotas de cadastro.
const router = express.Router();

// Importa o controller responsável pelo cadastro.
const cadastroController = require('../controllers/cadastroController');

// Rota para cadastrar uma nova conta.
// Recebe nome, telefone, e-mail e senha enviados pelo cadastro.js.
router.post('/', cadastroController.cadastrarCliente);

// Exporta as rotas para serem utilizadas pelo servidor.
module.exports = router;
