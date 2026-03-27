const { createProxyMiddleware } = require('http-proxy-middleware');

const proxy = createProxyMiddleware({
  target: process.env.BACKEND_URL,
  changeOrigin: true,
  logLevel: 'debug',
});

module.exports = proxy;