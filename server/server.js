const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const { closePool } = require('./src/config/database');

const PORT = config.port;

// 1. Criar o servidor HTTP e integrar com Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Permite conexões do frontend/PWA
    methods: ["GET", "POST"]
  }
});

// 2. Torna o Socket.IO acessível dentro de todas as rotas do Express (req.io)
app.use((req, res, next) => {
    req.io = io;
    next();
});

// 3. Escuta conexões ativas do Socket
io.on('connection', (socket) => {
  logger.info(`Novo cliente conectado via WebSocket: ${socket.id}`);

  socket.on('funcionarios_atualizados', () => {
    io.emit('dados_atualizados', { tipo: 'funcionarios' });
  });

  socket.on('disconnect', () => {
    logger.info(`Cliente desconectado: ${socket.id}`);
  });
});

// 4. Iniciar o servidor
server.listen(PORT, () => {
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