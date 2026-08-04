const { Pool } = require('pg');
const logger = require('../utils/logger');

const connectionString = process.env.DATABASE_URL ? process.env.DATABASE_URL.trim() : '';

const poolConfig = {
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10
};

if (connectionString) {
  poolConfig.connectionString = connectionString;
}

const pool = new Pool(poolConfig);

// Trata erros assíncronos no pool para evitar crash do processo
pool.on('error', (err) => {
  logger.error('Erro inesperado em cliente ocioso do pool PostgreSQL', { error: err.message });
});

/**
 * Executa uma consulta SQL no pool de conexões
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Testa a conexão com o PostgreSQL executando SELECT 1
 * Retorna true se conectado e false se desconectado ou não configurado
 */
async function checkConnection() {
  if (!connectionString) {
    return false;
  }

  try {
    const res = await pool.query('SELECT 1 AS alive');
    return Boolean(res && res.rows && res.rows.length > 0 && res.rows[0].alive === 1);
  } catch (err) {
    // Sanitização rigorosa: loga apenas o tipo do erro sem expor senhas/tokens da URL
    logger.warn('Falha ao verificar conexão com PostgreSQL', {
      errorType: err.name || 'DatabaseError',
      code: err.code || 'UNKNOWN'
    });
    return false;
  }
}

/**
 * Encerra o pool de conexões graciosamente
 */
async function closePool() {
  try {
    await pool.end();
    logger.info('Pool de conexões PostgreSQL encerrado com sucesso.');
  } catch (err) {
    logger.error('Erro ao encerrar o pool PostgreSQL', { error: err.message });
  }
}

module.exports = {
  pool,
  query,
  checkConnection,
  closePool
};
