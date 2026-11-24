const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

require('dotenv').config({
    path: path.join(__dirname, '.env')
});

const app = express();
const PORT = process.env.PORT || 3001;

const { query } = require('./database');

// Middlewares
app.use(cors({
    origin: function (origin, callback) {
        callback(null, origin || true);
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Impede cache do navegador
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// Configuração das sessões
app.use(session({
    name: 'connect.sid',
    secret: process.env.SESSION_SECRET || 'emporio_magico_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24
    }
}));

// Arquivos de imagens
app.use('/imagem', express.static(path.join(__dirname, 'imagem')));

// Serve os arquivos estáticos do projeto (Frontend)
const pastaRaiz = path.join(__dirname, '..');
const subpastas = fs.readdirSync(pastaRaiz, { withFileTypes: true })
    .filter(item => item.isDirectory() && item.name.toLowerCase() !== 'backend' && item.name !== 'node_modules')
    .map(item => path.join(pastaRaiz, item.name));

subpastas.forEach(pasta => {
    app.use(express.static(pasta));
});
app.use(express.static(pastaRaiz));

// Importação das rotas
const loginRoutes = require('./routes/loginRoutes');
const cadastroRoutes = require('./routes/cadastroRoutes');
const produtoRoutes = require('./routes/produtoRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');

// Registro das rotas
app.use('/login', loginRoutes);
app.use('/cadastro', cadastroRoutes);
app.use('/produto', produtoRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/pedidos', pedidoRoutes);
app.use('/api/usuarios', usuarioRoutes);

// Rota inicial
app.get('/', (req, res) => {
    res.send('Servidor do Empório Mágico do Beco funcionando!');
});

// Inicia o servidor após testar a conexão
async function iniciarServidor() {
    try {
        await query('SELECT NOW()');
        console.log('Conexão com PostgreSQL estabelecida com sucesso!');

        app.listen(PORT, () => {
            console.log(`Servidor rodando em http://localhost:${PORT}`);
        });
    } catch (erro) {
        console.error('Erro ao iniciar o servidor:', erro);
    }
}

iniciarServidor();