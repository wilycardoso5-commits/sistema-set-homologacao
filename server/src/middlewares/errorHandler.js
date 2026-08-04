const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Erro de execução não capturado:', err);

  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Erro interno do servidor';

  res.status(status).json({
    error: true,
    status,
    message: message,
    timestamp: new Date().toISOString()
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: true,
    status: 404,
    message: `Rota '${req.originalUrl}' não encontrada.`,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
