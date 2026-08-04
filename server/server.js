const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const { closePool } = require('./src/config/database');

const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(`Servidor Backend central rodando na porta ${PORT}`);
  logger.info(`Ambiente: ${config.nodeEnv}`);
});

// Encerramento gracioso para SIGTERM e SIGINT
async function gracefulShutdown(signal) {
  logger.info(`Sinal ${signal} recebido. Encerrando servidor e conexões com PostgreSQL...`);
  server.close(async () => {
    await closePool();
    logger.info('Servidor e pool de conexões encerrados.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
