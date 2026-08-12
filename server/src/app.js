const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const config = require('./config');
const routes = require('./routes');
const { pool } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();
app.set('trust proxy', 1);

// Timestamp global para versionamento e auto-update no frontend
const APP_BUILD_VERSION = Date.now().toString();
const SEM_VER = require('../../package.json').version || "1.0.0";

app.get('/api/version', (req, res) => {
  return res.json({ version: APP_BUILD_VERSION, semVer: SEM_VER });
});

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Sessão Segura com armazenamento no PostgreSQL
app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'chave_secreta_sistema_set_2026',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

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

app.get('/manifest.json', (req, res) => {
  return res.sendFile(path.resolve(__dirname, '../../frontend', 'manifest.json'));
});

app.get(['/service-worker.js', '/sw.js'], (req, res) => {
  return res.sendFile(path.resolve(__dirname, '../../frontend', 'service-worker.js'));
});

app.get('/icon-192.png', (req, res) => {
  return res.sendFile(path.resolve(__dirname, '../../frontend', 'icon-192.png'));
});

app.get('/icon-512.png', (req, res) => {
  return res.sendFile(path.resolve(__dirname, '../../frontend', 'icon-512.png'));
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

