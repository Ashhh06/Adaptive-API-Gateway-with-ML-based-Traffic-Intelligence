const { createClient } = require('redis');

const client = createClient({
  url: process.env.REDIS_URL
});

client.on('error', (err) => {
  console.error('Redis Error:', err);
});

client.on('connect', () => {
  console.log('Connecting to Redis...');
});

client.on('ready', () => {
  console.log('Redis connected');
});

(async () => {
  try {
    await client.connect();
  } catch (err) {
    console.error('Redis connection failed:', err);
  }
})();

module.exports = client;