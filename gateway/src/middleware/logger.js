const Log = require('../models/Log');

module.exports = (req, res, next) => {
  const url = req.originalUrl || req.url || '';
  if (url.startsWith('/api/dashboard')) {
    return next();
  }

  const start = Date.now();

  res.on('finish', async () => {
    try {
      const latency = Date.now() - start;

      const blocked = res.statusCode === 403 || res.statusCode === 429;

      const logData = {
        ip: req.ip,
        endpoint: req.originalUrl,
        status: res.statusCode,
        latency: latency,
        decision: blocked ? 'blocked' : 'allowed'
      };

      if (req.mlLabel) {
        logData.mlLabel = req.mlLabel;
      }
      if (req.mlConfidence != null && typeof req.mlConfidence === 'number') {
        logData.mlConfidence = req.mlConfidence;
      }

      await Log.create(logData);
      console.log(JSON.stringify(logData));

    } catch (err) {
      console.error('Logging error:', err);
    }
  });

  next();
};