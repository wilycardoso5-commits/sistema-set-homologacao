const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const config = require('./config');
const routes = require('./routes');
const { pool } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

// Se o app roda atrás de proxy (Render, Heroku, etc.), habilitar trust proxy em produção
if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// Proteções de Cabeçalhos HTTP (Helmet)
// CSP desativado temporariamente para permitir conexões externas e CDN.
app.use(helmet({
  contentSecurityPolicy: false
}));

// Configuração do CORS (quando for cross-origin precisamos permitir credenciais)
const corsOptions = {
  origin: config.nodeEnv === 'production' ? config.frontendOrigin : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// Limite de tamanho de JSON no body (Segurança)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Sessão Segura com armazenamento no PostgreSQL
app.use(session({
  store: new pgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true  // Cria a tabela 'session' no Neon automaticamente se não existir
  }),
  name: 'set.sid',
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,                                      // Inacessível via JavaScript no browser
    secure: config.nodeEnv === 'production',             // HTTPS obrigatório em produção
    sameSite: 'lax',                                     // Lax para permitir navegação pós-login na mesma origem
    path: '/',
    maxAge: 8 * 60 * 60 * 1000                          // 8 horas de sessão
  }
}));

// Rota protegida para o sistema principal
app.get('/sistema', (req, res) => {
  if (!req.session || !req.session.usuario) {
    return res.redirect('/');
  }

  // Serve o arquivo HTML exatamente como está no repositório
  return res.sendFile(path.join(__dirname, '../../telausuarios.html'));
});

app.get('/logo-set.png', (req, res) => {
  return res.sendFile(path.join(__dirname, '../../logo-set.png'));
});

app.get('/icone.ico', (req, res) => {
  return res.sendFile(path.join(__dirname, '../../icone.ico'));
});

// Servir arquivos estáticos do Frontend (Caminho Absoluto)
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// Servir ativos estáticos que estejam no diretório root do projeto (imagens, fontes, css, js)
// Restrito por extensão para evitar expor código servidor.
app.use((req, res, next) => {
  const allowedExt = ['.png', '.jpg', '.jpeg', '.svg', '.ico', '.css', '.js', '.woff', '.woff2', '.ttf', '.eot', '.map'];
  const ext = path.extname(req.path).toLowerCase();
  if (allowedExt.includes(ext)) {
    const filePath = path.join(__dirname, '../../', req.path.replace(/^[\\/]+/, ''));
    return res.sendFile(filePath, (err) => {
      if (err) return next();
    });
  }
  return next();
});

// Rotas da API
app.use('/api', routes);

// Tratamento de Rota Não Encontrada (404)
app.use(notFoundHandler);

// Manipulador Centralizado de Erros (500)
app.use(errorHandler);

module.exports = app;

