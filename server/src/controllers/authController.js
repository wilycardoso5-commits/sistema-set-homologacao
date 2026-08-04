const bcrypt = require('bcrypt');
const db = require('../config/database');
const logger = require('../utils/logger');

const MAX_TENTATIVAS = 5;

/**
 * POST /api/auth/login
 * Valida login e senha contra o PostgreSQL usando bcrypt.
 * Em caso de sucesso, cria sessão segura e retorna JSON.
 */
async function login(req, res) {
  const { login, senha } = req.body;

  // Validação básica de entrada
  if (!login || !senha || typeof login !== 'string' || typeof senha !== 'string') {
    return res.status(400).json({
      sucesso: false,
      mensagem: 'Login e senha são obrigatórios.'
    });
  }

  const loginNormalizado = login.trim().toLowerCase();

  // Limite de tamanho para prevenir ataques de payload
  if (loginNormalizado.length > 100 || senha.length > 128) {
    return res.status(400).json({
      sucesso: false,
      mensagem: 'Dados de entrada inválidos.'
    });
  }

  try {
    // Busca o usuário pelo login (ou email)
    const resultado = await db.query(
      `SELECT u.id, u.nome_completo, u.login, u.email, u.senha_hash,
              u.status, u.tentativas_login, u.bloqueado_ate,
              u.troca_senha_obrigatoria, u.perfil_id,
              p.nome AS perfil_nome
       FROM usuarios u
       LEFT JOIN perfis p ON p.id = u.perfil_id
       WHERE LOWER(u.login) = $1 OR LOWER(u.email) = $1
       LIMIT 1`,
      [loginNormalizado]
    );

    const usuario = resultado.rows[0];

    // Usuário não encontrado — mensagem genérica para não revelar existência
    if (!usuario) {
      logger.warn('Tentativa de login para credencial inexistente', { login: loginNormalizado });
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Usuário ou senha incorretos.'
      });
    }

    // Conta inativa
    if (usuario.status === 'Inativo') {
      logger.warn('Login negado: conta inativa', { login: loginNormalizado });
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Acesso negado: conta inativa. Entre em contato com o administrador.'
      });
    }

    // Conta bloqueada
    if (usuario.status === 'Bloqueado') {
      logger.warn('Login negado: conta bloqueada', { login: loginNormalizado });
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Acesso negado: conta bloqueada por excesso de tentativas. Entre em contato com o administrador.'
      });
    }

    // Verificação da senha com bcrypt (resistente a timing attacks)
    const hashArmazenado = usuario.senha_hash;
    const hashTipo = typeof hashArmazenado === 'string' ? 'string' : 'nao-string';
    const hashTamanho = typeof hashArmazenado === 'string' ? hashArmazenado.length : 0;
    const hashInicio = typeof hashArmazenado === 'string' ? hashArmazenado.slice(0, 7) : null;
    const hashFim = typeof hashArmazenado === 'string' ? hashArmazenado.slice(-4) : null;

    let senhaCorreta = false;

    if (typeof hashArmazenado === 'string' && hashArmazenado.startsWith('$2')) {
      senhaCorreta = await bcrypt.compare(senha, hashArmazenado);
    }

    logger.info('Debug login autenticacao', {
      loginRecebido: loginNormalizado,
      usuarioEncontrado: true,
      hashTipo,
      hashTamanho,
      hashInicio,
      hashFim,
      hashBrutoJson: JSON.stringify(hashArmazenado),
      hashUltimoCharCode: typeof hashArmazenado === 'string' && hashArmazenado.length > 0 ? hashArmazenado.charCodeAt(hashArmazenado.length - 1) : null,
      resultadoBcrypt: senhaCorreta
    });

    if (!senhaCorreta) {
      // Incrementa contador de tentativas falhas
      const novasTentativas = (usuario.tentativas_login || 0) + 1;

      if (novasTentativas >= MAX_TENTATIVAS) {
        // Bloqueia a conta após atingir o limite
        await db.query(
          `UPDATE usuarios
           SET status = 'Bloqueado', tentativas_login = $1, bloqueado_ate = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [novasTentativas, usuario.id]
        );
        logger.warn('Conta bloqueada após excesso de tentativas', { login: loginNormalizado, tentativas: novasTentativas });
        return res.status(403).json({
          sucesso: false,
          mensagem: 'Conta bloqueada após 5 tentativas incorretas. Entre em contato com o administrador.'
        });
      } else {
        await db.query(
          `UPDATE usuarios SET tentativas_login = $1 WHERE id = $2`,
          [novasTentativas, usuario.id]
        );
        logger.warn('Senha incorreta', { login: loginNormalizado, tentativa: novasTentativas });
        return res.status(401).json({
          sucesso: false,
          mensagem: `Usuário ou senha incorretos. (Tentativa ${novasTentativas} de ${MAX_TENTATIVAS})`
        });
      }
    }

    // Autenticação bem-sucedida — zera tentativas e registra último login
    await db.query(
      `UPDATE usuarios
       SET tentativas_login = 0, ultimo_login = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [usuario.id]
    );

    // Cria sessão segura no servidor (nunca expor senha_hash)
    req.session.usuario = {
      id: usuario.id,
      nomeCompleto: usuario.nome_completo,
      login: usuario.login,
      email: usuario.email,
      perfilId: usuario.perfil_id,
      perfilNome: usuario.perfil_nome,
      status: usuario.status,
      trocaSenhaObrigatoria: usuario.troca_senha_obrigatoria,
      dataHoraLogin: new Date().toISOString()
    };

    logger.info('Login bem-sucedido', { login: loginNormalizado });

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Autenticação realizada com sucesso.',
      trocaSenhaObrigatoria: usuario.troca_senha_obrigatoria,
      redirecionarPara: usuario.troca_senha_obrigatoria ? '/trocar-senha' : '/index.html'
    });

  } catch (err) {
    logger.error('Erro interno no processo de login', { errorType: err.name, code: err.code });
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno do servidor. Tente novamente em instantes.'
    });
  }
}

/**
 * POST /api/auth/logout
 * Destrói a sessão do servidor e limpa o cookie.
 */
function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Erro ao encerrar sessão', { errorType: err.name });
      return res.status(500).json({ sucesso: false, mensagem: 'Erro ao encerrar sessão.' });
    }
    res.clearCookie('set.sid');
    return res.status(200).json({ sucesso: true, mensagem: 'Sessão encerrada com sucesso.' });
  });
}

module.exports = { login, logout };
