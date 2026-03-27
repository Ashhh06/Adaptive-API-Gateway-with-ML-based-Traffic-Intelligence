const redis = require('../config/redis');

const WINDOW_SIZE = parseInt(process.env.RATE_LIMIT_WINDOW);
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX);

module.exports = async (req, res, next) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        const key = `rate:${ip}`;

        //get current count
        const current = await redis.get(key);

        if(current && parseInt(current) >= MAX_REQUESTS) {
            return res.status(429).json({
                error: 'Too Many Requests'
            });
        }
        
        //increment count
        await redis.incr(key);

        //set expiry if first request
        if(!current) {
            await redis.expire(key, WINDOW_SIZE);
        }

        next();
    } catch (err) {
        console.error('Ratee limiter error: ', err.message);
        next();
    }
}