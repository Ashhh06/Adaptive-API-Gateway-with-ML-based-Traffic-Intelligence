const redis = require('../config/redis');

const WINDOW_SIZE = parseInt(process.env.RATE_LIMIT_WINDOW, 10);
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX, 10);
const SUSPICIOUS_MAX = parseInt(
    process.env.RATE_LIMIT_SUSPICIOUS_MAX || '40',
    10
);

module.exports = async (req, res, next) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        if (typeof ip === 'string' && ip.includes(',')) {
            ip = ip.split(',')[0].trim();
        }

        // normalize IPv6 localhost
        if (ip === '::1') ip = '127.0.0.1';

        const maxAllowed =
            req.mlLabel === 'suspicious' ? SUSPICIOUS_MAX : MAX_REQUESTS;


        const key = `rate:${ip}`;

        //get current count
        const current = await redis.get(key);

        if (current && parseInt(current, 10) >= maxAllowed) {
            return res.status(429).json({
                error: 'Too Many Requests'
            });
        }

        //increment count
        await redis.incr(key);

        //set expiry if first request
        if (!current) {
            await redis.expire(key, WINDOW_SIZE);
        }

        next();
    } catch (err) {
        console.error('Ratee limiter error: ', err.message);
        next();
    }
}