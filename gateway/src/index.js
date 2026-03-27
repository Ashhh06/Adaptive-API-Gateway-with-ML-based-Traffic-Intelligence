require('dotenv').config();

const express = require('express');
const connectDB = require('./config/db');

const proxy = require('./routes/proxy');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const healthRoute = require('./routes/health');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();

async function startServer() {
  try {
    console.log("Starting server...");

    //wait for DB
    await connectDB();

    // built-in middleware
    app.use(express.json());

    // logging
    app.use(logger);

    // rate limiter BEFORE routes
    console.log("Rate Limiter hit")
    app.use(rateLimiter);

    // routes
    app.use('/api', (req, res, next) => {
      console.log("/api route HIT");
      next();
    });

    app.use('/api', proxy);
    app.use('/health', healthRoute);

    // test route
    app.get('/', (req, res) => {
      res.json({ message: 'API Gateway running!' });
    });

    // error handler
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