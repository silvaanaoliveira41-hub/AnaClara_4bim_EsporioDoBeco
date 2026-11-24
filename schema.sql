
-- BANCO DE DADOS: EMPÓRIO MÁGICO DO BECO
-- Arquivo: 01_banco_emporio.sql

BEGIN;

-- 1. USUÁRIOS

CREATE TABLE IF NOT EXISTS public.usuarios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    tipo_usuario VARCHAR(20) NOT NULL DEFAULT 'cliente',
    casa VARCHAR(20) NOT NULL DEFAULT 'Nenhuma'
        CHECK (casa IN (
            'Grifinoria',
            'Sonserina',
            'Corvinal',
            'Lufa-Lufa',
            'Nenhuma'
        )),
    data_cadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_email_vazio
        CHECK (TRIM(email) <> ''),

    CONSTRAINT chk_nome_vazio
        CHECK (TRIM(nome) <> '')
);

-- Corrige a restrição de tipo de usuário,
-- inclusive em tabelas que já existiam.

ALTER TABLE public.usuarios
DROP CONSTRAINT IF EXISTS usuarios_tipo_usuario_check;

ALTER TABLE public.usuarios
DROP CONSTRAINT IF EXISTS ck_usuarios_tipo_usuario;

ALTER TABLE public.usuarios
ADD CONSTRAINT ck_usuarios_tipo_usuario
CHECK (tipo_usuario IN ('cliente', 'administrador'));


-- 2. PRODUTOS MÁGICOS

CREATE TABLE IF NOT EXISTS public.produtos_magicos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,

    categoria VARCHAR(50) NOT NULL
        CHECK (categoria IN (
            'Varinhas',
            'Caldeirões',
            'Vassouras',
            'Poções & Ingredientes',
            'Livros & Pergaminhos',
            'Artefatos das Trevas',
            'Objetos Diversos'
        )),

    descricao TEXT,

    preco_galeoes NUMERIC(8,2) NOT NULL
        CHECK (preco_galeoes >= 0),

    estoque INTEGER NOT NULL DEFAULT 0
        CHECK (estoque >= 0),

    imagem_url VARCHAR(255),

    cadastrado_por_admin_id BIGINT
        REFERENCES public.usuarios(id) ON DELETE SET NULL,

    data_cadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_nome_produto
        CHECK (TRIM(nome) <> '')
);


-- 3. PEDIDOS

CREATE TABLE IF NOT EXISTS public.pedidos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    cliente_id BIGINT NOT NULL
        REFERENCES public.usuarios(id) ON DELETE RESTRICT,

    atendido_por_admin_id BIGINT
        REFERENCES public.usuarios(id) ON DELETE SET NULL,

    valor_total NUMERIC(10,2) NOT NULL
        CHECK (valor_total >= 0),

    status VARCHAR(30) NOT NULL DEFAULT 'Pendente'
        CHECK (status IN (
            'Pendente',
            'Enviado por Coruja',
            'Entregue',
            'Cancelado'
        )),

    data_pedido TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- 4. ITENS DO PEDIDO

CREATE TABLE IF NOT EXISTS public.itens_do_pedido (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    pedido_id BIGINT NOT NULL
        REFERENCES public.pedidos(id) ON DELETE CASCADE,

    produto_id BIGINT NOT NULL
        REFERENCES public.produtos_magicos(id) ON DELETE RESTRICT,

    quantidade INTEGER NOT NULL
        CHECK (quantidade > 0),

    preco_unitario NUMERIC(8,2) NOT NULL
        CHECK (preco_unitario >= 0),

    CONSTRAINT uq_produto_pedido
        UNIQUE (pedido_id, produto_id)
);


-- 5. ÍNDICES

-- O email já possui índice automático por ser UNIQUE.

CREATE INDEX IF NOT EXISTS idx_produtos_categoria
ON public.produtos_magicos(categoria);

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente
ON public.pedidos(cliente_id);

CREATE INDEX IF NOT EXISTS idx_pedidos_status
ON public.pedidos(status);

-- A restrição UNIQUE de itens já cria índice
-- que começa por pedido_id.

CREATE INDEX IF NOT EXISTS idx_itens_produto
ON public.itens_do_pedido(produto_id);

COMMIT;


-- 6. CONFERÊNCIA DAS TABELAS

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;


-- DEFINIR ADMINISTRADOR
-- Substitua pelo email da conta desejada.

UPDATE public.usuarios
SET tipo_usuario = 'administrador'
WHERE LOWER(email) = LOWER('anaoliveira.2025@alunos.utfpr.edu.br')
RETURNING id, nome, email, tipo_usuario;
