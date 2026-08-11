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
      perfil: usuario.perfil_nome,
      perfilNome: usuario.perfil_nome,
      status: usuario.status,
      trocaSenhaObrigatoria: usuario.troca_senha_obrigatoria,
      permissoes: usuario.permissoes || {},
      dataHoraLogin: new Date().toISOString()
    };

    logger.info('Login bem-sucedido', { login: loginNormalizado });

    // Garantir que a sessão foi persistida no store antes de responder
    req.session.save((saveErr) => {
      if (saveErr) {
        logger.error('Falha ao salvar sessão após login', { error: saveErr.message });
        return res.status(500).json({
          sucesso: false,
          mensagem: 'Erro interno do servidor. Tente novamente.'
        });
      }

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Autenticação realizada com sucesso.',
        trocaSenhaObrigatoria: usuario.troca_senha_obrigatoria,
        redirecionarPara: usuario.troca_senha_obrigatoria ? '/trocar-senha' : '/sistema'
      });
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

/**
 * GET /api/auth/me
 * Retorna o usuário da sessão se autenticado
 */
function me(req, res) {
  try {
    if (req.session && req.session.usuario) {
      return res.status(200).json({ sucesso: true, usuario: req.session.usuario });
    }
    return res.status(401).json({ sucesso: false, mensagem: 'Sessão inválida' });
  } catch (err) {
    logger.error('Erro ao obter sessão do usuário', { error: err.message });
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno' });
  }
}

/**
 * POST /api/auth/change-password
 * Permite ao usuário logado alterar a própria senha.
 */
async function changePassword(req, res) {
  try {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({ sucesso: false, mensagem: 'Sessão inválida ou não autenticada.' });
    }

    const { senhaAtual, novaSenha } = req.body;
    
    if (!senhaAtual || !novaSenha || typeof senhaAtual !== 'string' || typeof novaSenha !== 'string') {
      return res.status(400).json({ sucesso: false, mensagem: 'Senha atual e nova senha são obrigatórias.' });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({ sucesso: false, mensagem: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }

    const usuarioId = req.session.usuario.id;

    const resultado = await db.query(
      `SELECT senha_hash FROM usuarios WHERE id = $1 LIMIT 1`,
      [usuarioId]
    );

    const usuario = resultado.rows[0];
    if (!usuario) {
      return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado no banco de dados.' });
    }

    const hashArmazenado = usuario.senha_hash;
    let senhaCorreta = false;
    
    if (typeof hashArmazenado === 'string' && hashArmazenado.startsWith('$2')) {
      senhaCorreta = await bcrypt.compare(senhaAtual, hashArmazenado);
    }

    if (!senhaCorreta) {
      return res.status(401).json({ sucesso: false, mensagem: 'A senha atual está incorreta.' });
    }

    const saltRounds = 10;
    const novoHash = await bcrypt.hash(novaSenha, saltRounds);

    await db.query(
      `UPDATE usuarios SET senha_hash = $1, troca_senha_obrigatoria = false WHERE id = $2`,
      [novoHash, usuarioId]
    );

    req.session.usuario.trocaSenhaObrigatoria = false;
    req.session.save((err) => {
        if(err) logger.error('Erro ao salvar sessão após troca de senha', {error: err.message});
    });

    logger.info('Senha alterada com sucesso', { usuarioId });
    return res.status(200).json({ sucesso: true, mensagem: 'Senha alterada com sucesso.' });
  } catch (err) {
    logger.error('Erro ao alterar senha', { error: err.message });
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao alterar a senha.' });
  }
}
async function resetDatabase(req, res) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ success: false, mensagem: 'Não autorizado.' });
  }

  const { senha } = req.body;
  if (!senha) {
    return res.status(400).json({ success: false, mensagem: 'A senha é obrigatória.' });
  }

  try {
    const userQuery = await db.query('SELECT senha_hash FROM usuarios WHERE id = $1', [req.session.usuario.id]);
    if (userQuery.rows.length === 0) {
       return res.status(401).json({ success: false, mensagem: 'Usuário não encontrado.' });
    }

    const { senha_hash } = userQuery.rows[0];
    const isValid = await bcrypt.compare(senha, senha_hash);
    
    if (!isValid) {
      return res.status(401).json({ success: false, mensagem: 'Senha incorreta.' });
    }

    const chavesParaDeletar = [
      'set_cartoes_vt', 'set_solicitacoes_vt', 'set_historico_vt',
      'set_empresas_db', 'set_funcionarios', 'set_atendimentos_db',
      'set_gratuidade_db_v1', 'set_atendimentos_gratuidade_v1',
      'set_vt_lotes', 'set_lote_arquivos', 'set_estoque',
      'set_saldo_disponivel_manual', 'set_total_ribbons'
    ];

    await db.query('DELETE FROM sync_store WHERE key = ANY($1)', [chavesParaDeletar]);
    return res.status(200).json({ success: true, mensagem: 'Dados de teste removidos com sucesso!' });

  } catch (error) {
    console.error('Erro no resetDatabase:', error);
    return res.status(500).json({ success: false, mensagem: 'Erro interno no servidor.' });
  }
}

module.exports = { login, logout, me, changePassword, resetDatabase };
