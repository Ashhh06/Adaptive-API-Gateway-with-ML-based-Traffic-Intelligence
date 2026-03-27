const Log = require('../models/Log');

module.exports = (req, res, next) => {
  const start = Date.now();

  res.on('finish', async () => {
    try {
      const latency = Date.now() - start;

      const logData = {
        ip: req.ip,
        endpoint: req.originalUrl,
        status: res.statusCode,
        latency: latency,
        decision: res.statusCode === 429 ? 'blocked' : 'allowed'
      };

      //save to db
      await Log.create(logData);

      // Console log (keep it)
      console.log(JSON.stringify(logData));

    } catch (err) {
      console.error('Logging error:', err);
    }
  });

  next();
};