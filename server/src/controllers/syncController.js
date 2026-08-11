const db = require('../config/database');

async function getSyncData(req, res) {
    try {
        const keysToSync = [
            'set_cartoes_vt',
            'set_solicitacoes_vt',
            'set_historico_vt'
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
            'set_historico_vt'
        ];

        for (const key of keysToSync) {
            if (syncData[key] !== undefined) {
                const valueString = JSON.stringify(syncData[key]);
                await db.query(`
                    INSERT INTO sync_store (key, value) 
                    VALUES ($1, $2) 
                    ON CONFLICT(key) 
                    DO UPDATE SET value = EXCLUDED.value, atualizado_em = CURRENT_TIMESTAMP
                `, [key, valueString]);
            }
        }

        res.status(200).json({ success: true, message: 'Dados sincronizados com sucesso' });
    } catch (error) {
        console.error('Erro ao salvar dados de sincronização:', error);
        res.status(500).json({ success: false, error: 'Erro interno no servidor' });
    }
}

module.exports = {
    getSyncData,
    postSyncData
};
