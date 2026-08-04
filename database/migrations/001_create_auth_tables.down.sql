-- =============================================================================
-- Rollback Migration: 001_create_auth_tables.down.sql
-- Descrição: Remoção segura das tabelas de Autenticação, Usuários e Permissões
-- =============================================================================

DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS perfil_permissoes CASCADE;
DROP TABLE IF EXISTS permissoes CASCADE;
DROP TABLE IF EXISTS perfis CASCADE;
DROP FUNCTION IF EXISTS update_atualizado_em_column() CASCADE;
