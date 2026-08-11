require('dotenv').config({ path: '../.env' }); // Carrega variáveis de ambiente, se houver
const { pool } = require('../src/config/database');

async function limparBanco() {
  const chavesParaDeletar = [
    'set_cartoes_vt',
    'set_solicitacoes_vt',
    'set_historico_vt',
    'set_empresas_db',
    'set_funcionarios',
    'set_atendimentos_db',
    'set_gratuidade_db_v1',
    'set_atendimentos_gratuidade_v1',
    'set_vt_lotes',
    'set_lote_arquivos',
    // Zerando contadores/estoque
    'set_estoque',
    'set_saldo_disponivel_manual',
    'set_total_ribbons'
  ];

  try {
    console.log('Iniciando limpeza do banco de dados (sync_store)...');
    
    // Deleta do banco
    const res = await pool.query(
      'DELETE FROM sync_store WHERE key = ANY($1)',
      [chavesParaDeletar]
    );

    console.log(`Sucesso: ${res.rowCount} registros deletados da tabela sync_store.`);
    console.log('Chaves apagadas:');
    chavesParaDeletar.forEach(key => console.log(`- ${key}`));

    console.log('A tabela usuarios e chaves essenciais não foram tocadas.');
    console.log('Limpeza finalizada com segurança!');
  } catch (error) {
    console.error('Erro ao limpar banco de dados:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

limparBanco();
