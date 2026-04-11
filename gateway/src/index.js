require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const connectDB = require('./config/db');

const dashboardApi = require('./routes/dashboardApi');
const proxy = require('./routes/proxy');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const healthRoute = require('./routes/health');
const rateLimiter = require('./middleware/rateLimiter');
const mlIntelligence = require('./middleware/mlIntelligence');
const extractFeatures = require('./services/featureExtractor')

const app = express();

async function startServer() {
  try {
    console.log("Starting server...");

    await connectDB();

    app.use(express.json());

    app.use('/api/dashboard', dashboardApi);
    app.use(logger);
    app.use('/api', mlIntelligence);
    app.use(rateLimiter);

    app.use('/api', proxy);
    app.use('/health', healthRoute);

    app.get('/', (req, res) => {
      res.json({ message: 'API Gateway running!' });
    });

    app.get('/features/:ip', async (req, res) => {
      try {
        const features = await extractFeatures(req.params.ip);
        if (!features) {
          return res.status(404).json({
            error: 'No traffic logs for this IP in the current window (60s). Hit /api first, then retry.',
          });
        }
        res.json(features);
      } catch (err) {
        console.error("FEATURE ERROR:", err);
        res.status(500).json({ error: err.message });
      }
    });

    app.get('/my-ip', (req, res) => {
      res.json({
        ip: req.ip,
        raw: req.socket.remoteAddress
      });
    });

    const dashboardDist = path.join(__dirname, '..', 'public', 'dashboard');
    if (fs.existsSync(path.join(dashboardDist, 'index.html'))) {
      app.use('/dashboard', express.static(dashboardDist));
      app.use('/dashboard', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const parts = req.path.split('/').filter(Boolean);
        const last = parts[parts.length - 1] || '';
        if (last.includes('.') && /\.[a-zA-Z0-9]+$/.test(last)) return next();
        res.sendFile(path.join(dashboardDist, 'index.html'), (err) => next(err));
      });
    }

    app.use(errorHandler);

    const PORT = process.env.PORT || 3000;

    console.log("About to start server...");

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("Failed to start server:", err);
  }
}

startServer();
