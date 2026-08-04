const logger = {
  info: (msg, data = {}) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${msg}`, Object.keys(data).length ? data : '');
  },
  warn: (msg, data = {}) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${msg}`, Object.keys(data).length ? data : '');
  },
  error: (msg, err = {}) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${msg}`, err.message || err);
  }
};

module.exports = logger;
