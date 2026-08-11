const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');
require('dotenv').config();

let dbPath = path.resolve(__dirname, '../../database.sqlite');
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('sqlite://')) {
    const rawPath = process.env.DATABASE_URL.replace('sqlite://', '');
    dbPath = path.resolve(__dirname, '../../', rawPath);
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        logger.error('Erro ao conectar com SQLite:', { error: err.message });
    } else {
        logger.info('Conectado ao banco de dados SQLite.');
        initializeDB();
    }
});

function initializeDB() {
    db.run(`
        CREATE TABLE IF NOT EXISTS sync_store (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `, (err) => {
        if (err) {
            logger.error('Erro ao criar tabela sync_store', { error: err.message });
        } else {
            logger.info('Tabela sync_store garantida.');
        }
    });
}

// Wrapper para Promessas para facilitar uso
const dbAsync = {
    get: (key) => {
        return new Promise((resolve, reject) => {
            db.get(`SELECT value FROM sync_store WHERE key = ?`, [key], (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.value : null);
            });
        });
    },
    set: (key, value) => {
        return new Promise((resolve, reject) => {
            db.run(`INSERT INTO sync_store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [key, value], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }
};

module.exports = { db, dbAsync };
