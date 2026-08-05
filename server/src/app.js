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

// Proteções de Cabeçalhos HTTP (Helmet)
// Content-Security-Policy permite scripts externos e bloqueia inline
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
}));

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
    sameSite: 'strict',                                  // Previne CSRF
    maxAge: 8 * 60 * 60 * 1000                          // 8 horas de sessão
  }
}));

// Rota protegida para o sistema principal
app.get('/sistema', (req, res) => {
  if (!req.session || !req.session.usuario) {
    return res.redirect('/');
  }

  const telaPath = path.join(__dirname, '../../telausuarios.html');
  let html = fs.readFileSync(telaPath, 'utf8');

  if (!html.includes('<base href="/"')) {
    html = html.replace(/<head([^>]*)>/i, '<head$1><base href="/" />');
  }

  return res.send(html);
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

// Rotas da API
app.use('/api', routes);

// Tratamento de Rota Não Encontrada (404)
app.use(notFoundHandler);

// Manipulador Centralizado de Erros (500)
app.use(errorHandler);

module.exports = app;

