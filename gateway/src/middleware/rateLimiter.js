const redis = require('../config/redis');
const { getEffectiveMax } = require('../services/dynamicLimit');

const WINDOW_SIZE = parseInt(process.env.RATE_LIMIT_WINDOW, 10);

module.exports = async (req, res, next) => {
    try {
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (typeof ip === 'string' && ip.includes(',')) {
            ip = ip.split(',')[0].trim();
        }
        if (ip === '::1') ip = '127.0.0.1';

        const maxAllowed = await getEffectiveMax(ip, req.mlLabel);

        if (maxAllowed <= 0) {
            return res.status(429).json({
                error: 'Too Many Requests',
                reason: 'traffic_blocked',
            });
        }

        const key = `rate:${ip}`;
        const current = await redis.get(key);

        if (current && parseInt(current, 10) >= maxAllowed) {
            return res.status(429).json({ error: 'Too Many Requests' });
        }

        await redis.incr(key);
        if (!current) {
            await redis.expire(key, WINDOW_SIZE);
        }

        next();
    } catch (err) {
        console.error('Rate limiter error: ', err.message);
        next();
    }
};