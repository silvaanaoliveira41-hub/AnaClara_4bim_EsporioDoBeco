
const { Pool } = require('pg');

// Configuração da conexão com PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Verifica erros inesperados na conexão
pool.on('error', (erro) => {
    console.error('Erro inesperado no PostgreSQL:', erro.message);
});

// Função para executar comandos SQL
const query = (text, params) => {
    return pool.query(text, params);
};

// Exporta a conexão e a função
module.exports = {
    pool,
    query
};
