-- =============================================================================
-- Migration: 002_create_sync_store.sql
-- Descrição: Criação da tabela genérica de sincronização chave-valor
-- Banco de Dados: PostgreSQL (Neon)
-- Data: 2026-08-11
-- =============================================================================

CREATE TABLE IF NOT EXISTS sync_store (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para manter o atualizado_em em sincronia (usando a function existente do 001)
DROP TRIGGER IF EXISTS set_sync_store_atualizado_em ON sync_store;
CREATE TRIGGER set_sync_store_atualizado_em
BEFORE UPDATE ON sync_store
FOR EACH ROW EXECUTE FUNCTION update_atualizado_em_column();
