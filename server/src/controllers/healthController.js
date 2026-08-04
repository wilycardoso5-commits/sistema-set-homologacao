const db = require('../config/database');

async function getHealthStatus(req, res) {
  try {
    const isConnected = await db.checkConnection();

    return res.status(200).json({
      status: isConnected ? "ok" : "degradado",
      environment: "homologacao",
      database: isConnected ? "conectado" : "desconectado",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(200).json({
      status: "degradado",
      environment: "homologacao",
      database: "desconectado",
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = {
  getHealthStatus
};
