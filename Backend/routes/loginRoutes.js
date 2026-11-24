const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');

router.post('/', loginController.fazerLogin);
router.get('/sessao', loginController.verificarSessao);
router.post('/sair', loginController.sair);

module.exports = router;