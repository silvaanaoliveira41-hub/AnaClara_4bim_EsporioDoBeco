
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const produtoController = require('../controllers/produtoController');

// Pasta onde as imagens serão armazenadas
const pastaImagens = path.join(__dirname, '..', 'imagem');

if (!fs.existsSync(pastaImagens)) {
    fs.mkdirSync(pastaImagens, { recursive: true });
}

// Configuração do armazenamento das imagens
const armazenamento = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, pastaImagens);
    },

    filename: (req, file, callback) => {
        const extensao = path.extname(file.originalname).toLowerCase();
        const nomeArquivo = `produto-${req.params.id}-${Date.now()}${extensao}`;

        callback(null, nomeArquivo);
    }
});

// Aceita somente formatos de imagem
function verificarArquivo(req, file, callback) {
    const formatosPermitidos = [
        'image/jpeg',
        'image/png',
        'image/webp'
    ];

    if (formatosPermitidos.includes(file.mimetype)) {
        callback(null, true);
    } else {
        callback(new Error('Formato inválido. Envie JPG, PNG ou WEBP.'));
    }
}

const upload = multer({
    storage: armazenamento,
    fileFilter: verificarArquivo,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

// Trata erros do envio de imagens
function tratarErroUpload(erro, req, res, next) {
    if (erro instanceof multer.MulterError) {
        return res.status(400).json({
            mensagem: 'Erro no envio da imagem. O tamanho máximo é 5 MB.'
        });
    }

    if (erro) {
        return res.status(400).json({
            mensagem: erro.message
        });
    }

    next();
}

// Listar produtos
router.get('/', produtoController.listarProdutos);

// Buscar produto por ID
router.get('/:id', produtoController.buscarProdutoPorId);

// Enviar imagem do produto
router.post(
    '/upload/:id',
    upload.single('imagem'),
    tratarErroUpload,
    produtoController.uploadImagem
);

// Cadastrar produto
router.post('/', produtoController.cadastrarProduto);

// Alterar produto
router.put('/:id', produtoController.atualizarProduto);

// Excluir produto
router.delete('/:id', produtoController.excluirProduto);

module.exports = router;
