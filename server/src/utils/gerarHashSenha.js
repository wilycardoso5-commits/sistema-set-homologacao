/**
 * gerarHashSenha.js
 * Utilitário de desenvolvimento para gerar bcrypt hash de uma senha.
 * USO: node server/src/utils/gerarHashSenha.js <senha>
 * IMPORTANTE: Não commitar este script com senhas reais.
 */
const bcrypt = require('bcrypt');

const senha = process.argv[2];

if (!senha) {
  console.error('Uso: node server/src/utils/gerarHashSenha.js <senha>');
  process.exit(1);
}

const SALT_ROUNDS = 12;

bcrypt.hash(senha, SALT_ROUNDS).then((hash) => {
  console.log('\n--- HASH GERADO (bcrypt, cost 12) ---');
  console.log(hash);
  console.log('\n--- SQL de inserção do usuário de teste ---');
  console.log(`
-- 1. Criar perfil Master (se não existir)
INSERT INTO perfis (nome, descricao, ativo)
VALUES ('Master', 'Perfil com acesso total ao sistema', true)
ON CONFLICT (nome) DO NOTHING;

-- 2. Inserir usuário de teste
INSERT INTO usuarios (nome_completo, login, senha_hash, email, status, perfil_id, troca_senha_obrigatoria)
VALUES (
  'Administrador de Teste',
  'admin',
  '${hash}',
  'admin@sistemaset.com.br',
  'Ativo',
  (SELECT id FROM perfis WHERE nome = 'Master'),
  false
);
`);
}).catch((err) => {
  console.error('Erro ao gerar hash:', err.message);
  process.exit(1);
});
