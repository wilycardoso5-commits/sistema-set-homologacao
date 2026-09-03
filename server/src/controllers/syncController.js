const db = require('../config/database');

async function getSyncData(req, res) {
    try {
        const keysToSync = [
            'set_cartoes_vt',
            'set_solicitacoes_vt',
            'set_historico_vt',
            'set_empresas_db',
            'set_funcionarios',
            'set_users_db_v4',
            'set_atendimentos_db',
            'set_gratuidade_db_v1',
            'set_atendimentos_gratuidade_v1',
            'set_estoque',
            'set_saldo_disponivel_manual',
            'set_vt_lotes',
            'set_lote_arquivos',
            'set_total_ribbons',
            'set_banco_pdf_v1',
            'set_historico_pedidos',
            'set_total_entradas'
        ];

        const data = {};
        for (const key of keysToSync) {
            const result = await db.query('SELECT value FROM sync_store WHERE key = $1', [key]);
            if (result && result.rows && result.rows.length > 0) {
                data[key] = JSON.parse(result.rows[0].value);
            }
        }

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Erro ao buscar dados de sincronização:', error);
        res.status(500).json({ success: false, error: 'Erro interno no servidor' });
    }
}

async function postSyncData(req, res) {
    try {
        const syncData = req.body;
        if (!syncData || typeof syncData !== 'object') {
            return res.status(400).json({ success: false, error: 'Dados inválidos' });
        }

        const keysToSync = [
            'set_cartoes_vt',
            'set_solicitacoes_vt',
            'set_historico_vt',
            'set_empresas_db',
            'set_funcionarios',
            'set_users_db_v4',
            'set_atendimentos_db',
            'set_gratuidade_db_v1',
            'set_atendimentos_gratuidade_v1',
            'set_estoque',
            'set_saldo_disponivel_manual',
            'set_vt_lotes',
            'set_lote_arquivos',
            'set_total_ribbons',
            'set_banco_pdf_v1',
            'set_historico_pedidos',
            'set_total_entradas'
        ];

        const keysRecebidas = Object.keys(syncData).filter(k => keysToSync.includes(k) && syncData[k] !== undefined);
        console.log(`[SYNC] Iniciando sincronização. Chaves recebidas para atualizar: ${keysRecebidas.length}`);

        let chavesGravadas = 0;
        for (const key of keysToSync) {
            if (syncData[key] !== undefined) {
                try {
                    const valueString = JSON.stringify(syncData[key]);
                    await db.query(`
                        INSERT INTO sync_store (key, value) 
                        VALUES ($1, $2) 
                        ON CONFLICT(key) 
                        DO UPDATE SET value = EXCLUDED.value, atualizado_em = CURRENT_TIMESTAMP
                    `, [key, valueString]);
                    
                    chavesGravadas++;
                    console.log(`[SYNC] Chave gravada com sucesso no PostgreSQL: ${key} (Tamanho: ${valueString.length} bytes)`);
                } catch (dbErr) {
                    console.error(`[SYNC - ERRO CRÍTICO] Falha ao gravar a chave '${key}' no PostgreSQL:`, dbErr.message);
                    console.error(dbErr);
                    throw dbErr; // Repassa para o catch principal
                }
            }
        }

        console.log(`[SYNC] Resumo: ${chavesGravadas} chaves gravadas com sucesso no banco.`);

        // =========================================================
        // 👉 AQUI ENTRA O SOCKET.IO PARA DISPARAR EM TEMPO REAL 👈
        // =========================================================
        if (req.io) {
            req.io.emit('dados_atualizados', { mensagem: 'Dados sincronizados' });
        }
        // =========================================================

        res.status(200).json({ success: true, message: 'Dados sincronizados com sucesso' });
    } catch (error) {
        console.error('Erro ao salvar dados de sincronização (Catch Principal):', error);
        res.status(500).json({ success: false, error: 'Erro interno no servidor: ' + error.message });
    }
}

async function getProviderById(req, res) {
    try {
        const providerId = String(req.params.id || '').split(':')[0].trim();
        const providerNorm = providerId.replace(/^0+/, '') || providerId;

        if (!providerId) {
            return res.status(400).json({ success: false, error: 'Provider ID não fornecido' });
        }

        // Busca em set_empresas_db
        let result = await db.query('SELECT value FROM sync_store WHERE key = $1', ['set_empresas_db']);
        if (result && result.rows && result.rows.length > 0) {
            const empresas = JSON.parse(result.rows[0].value);
            if (Array.isArray(empresas)) {
                const emp = empresas.find(e => {
                    if (!e) return false;
                    const id = String(e.providerId ?? e.provider ?? e.id ?? e.ticketeira ?? '').trim();
                    return id === providerId || id.replace(/^0+/, '') === providerNorm;
                });
                if (emp) {
                    return res.status(200).json({ success: true, empresa: emp, funcionarios: [] });
                }
            }
        }

        // Busca em set_banco_pdf_v1 (bancoPDF)
        result = await db.query('SELECT value FROM sync_store WHERE key = $1', ['set_banco_pdf_v1']);
        if (result && result.rows && result.rows.length > 0) {
            const bancoPDF = JSON.parse(result.rows[0].value);
            for (const [k, val] of Object.entries(bancoPDF)) {
                if (k === providerId || k.replace(/^0+/, '') === providerNorm) {
                    return res.status(200).json({
                        success: true,
                        empresa: { razaoSocial: val.empresa, cnpj: val.cnpj || '' },
                        funcionarios: val.funcionarios || []
                    });
                }
            }
        }

        // Busca em set_base_providers
        result = await db.query('SELECT value FROM sync_store WHERE key = $1', ['set_base_providers']);
        if (result && result.rows && result.rows.length > 0) {
            const baseProv = JSON.parse(result.rows[0].value);
            if (Array.isArray(baseProv)) {
                const p = baseProv.find(e => String(e.id).trim() === providerId || String(e.id).trim().replace(/^0+/, '') === providerNorm);
                if (p) {
                    return res.status(200).json({
                        success: true,
                        empresa: { razaoSocial: p.empresa, cnpj: p.cnpj || '' },
                        funcionarios: p.funcionarios || []
                    });
                }
            }
        }

        res.status(200).json({ success: false, empresa: null, funcionarios: [], error: 'Provider não localizado no banco.' });
    } catch (error) {
        console.error('Erro ao buscar provider por ID:', error);
        res.status(500).json({ success: false, error: 'Erro interno no servidor' });
    }
}

async function checkUpdate(req, res) {
    try {
        const result = await db.query('SELECT MAX(atualizado_em) as last_update FROM sync_store');
        const lastUpdate = result.rows[0].last_update;
        res.status(200).json({ success: true, lastUpdate: lastUpdate });
    } catch (error) {
        console.error('Erro ao verificar atualizações:', error);
        res.status(500).json({ success: false, error: 'Erro interno no servidor' });
    }
}

module.exports = { getSyncData, postSyncData, getProviderById, checkUpdate };