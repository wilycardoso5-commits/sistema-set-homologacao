-- =============================================================================
-- Migration: 001_create_auth_tables.sql
-- Descrição: Criação das tabelas de Autenticação, Usuários e Permissões
-- Banco de Dados: PostgreSQL (Neon)
-- Data: 2026-08-04
-- =============================================================================

-- Habilita extensão para geração nativa de UUIDs v4 (se necessário)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. TABELA: perfis (Perfis de Acesso do Sistema, ex: Master, Admin, Operador)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS perfis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 2. TABELA: permissoes (Catálogo de Permissões Granulares por Módulo)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(100) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    modulo VARCHAR(50) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 3. TABELA: perfil_permissoes (Relacionamento N:N entre Perfis e Permissões)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS perfil_permissoes (
    perfil_id UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
    permissao_id UUID NOT NULL REFERENCES permissoes(id) ON DELETE CASCADE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (perfil_id, permissao_id)
);

-- -----------------------------------------------------------------------------
-- 4. TABELA: usuarios (Cadastro Geral de Usuários e Credenciais de Acesso)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo VARCHAR(150) NOT NULL,
    matricula VARCHAR(50),
    cpf VARCHAR(14),
    cargo VARCHAR(100),
    setor VARCHAR(100),
    empresa VARCHAR(150),
    email VARCHAR(150) UNIQUE,
    telefone VARCHAR(20),
    login VARCHAR(50) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo', 'Bloqueado')),
    foto_url TEXT,
    perfil_id UUID REFERENCES perfis(id) ON DELETE SET NULL,
    troca_senha_obrigatoria BOOLEAN NOT NULL DEFAULT false,
    tentativas_login INTEGER NOT NULL DEFAULT 0,
    bloqueado_ate TIMESTAMPTZ,
    ultimo_login TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 5. ÍNDICES DE DESEMPENHO E CONSULTA
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_usuarios_login ON usuarios(login);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil_id ON usuarios(perfil_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_status ON usuarios(status);

CREATE INDEX IF NOT EXISTS idx_permissoes_codigo ON permissoes(codigo);
CREATE INDEX IF NOT EXISTS idx_permissoes_modulo ON permissoes(modulo);

CREATE INDEX IF NOT EXISTS idx_perfil_permissoes_permissao_id ON perfil_permissoes(permissao_id);

-- -----------------------------------------------------------------------------
-- 6. TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE 'atualizado_em'
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_atualizado_em_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.atualizado_em = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_perfis_atualizado_em ON perfis;
CREATE TRIGGER set_perfis_atualizado_em
BEFORE UPDATE ON perfis
FOR EACH ROW EXECUTE FUNCTION update_atualizado_em_column();

DROP TRIGGER IF EXISTS set_usuarios_atualizado_em ON usuarios;
CREATE TRIGGER set_usuarios_atualizado_em
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION update_atualizado_em_column();
