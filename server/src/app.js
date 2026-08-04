const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

// Proteções de Cabeçalhos HTTP (Helmet)
app.use(helmet());

// Configuração do CORS (Restrito em produção)
const corsOptions = {
  origin: config.nodeEnv === 'production' ? config.frontendOrigin : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Limite de tamanho de JSON no body (Segurança)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Servir arquivos estáticos do Frontend (Caminho Absoluto)
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// Rotas da API
app.use('/api', routes);

// Tratamento de Rota Não Encontrada (404)
app.use(notFoundHandler);

// Manipulador Centralizado de Erros (500)
app.use(errorHandler);

module.exports = app;
