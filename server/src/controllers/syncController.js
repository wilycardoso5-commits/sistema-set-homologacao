const { dbAsync } = require('../config/sqlite');

async function getSyncData(req, res) {
    try {
        const keysToSync = [
            'set_cartoes_vt',
            'set_solicitacoes_vt',
            'set_historico_vt'
        ];

        const data = {};
        for (const key of keysToSync) {
            const value = await dbAsync.get(key);
            if (value) {
                data[key] = JSON.parse(value);
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
                await dbAsync.set(key, valueString);
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
