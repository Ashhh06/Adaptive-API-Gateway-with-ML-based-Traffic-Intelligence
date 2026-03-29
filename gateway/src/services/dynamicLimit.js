const redis = require('../config/redis');

const LIMITS = {
    normal: parseInt(process.env.RLIMIT_NORMAL || '100', 10),
    suspicious: parseInt(process.env.RLIMIT_SUSPICIOUS || '40', 10),
    malicious: parseInt(process.env.RLIMIT_MALICIOUS || '0', 10),
};

const POLICY_TTL = parseInt(process.env.RL_POLICY_TTL || '120', 10);

function maxForLabel(label) {
    const key = typeof label === 'string' ? label.toLowerCase() : 'normal';
    if (key === 'suspicious') return LIMITS.suspicious;
    if (key === 'malicious') return LIMITS.malicious;
    return LIMITS.normal;
}

const REDIS_PREFIX = 'rl:max:';

async function applyPolicyFromLabel(ip, label) {
    const max = maxForLabel(label);
    const redisKey = `${REDIS_PREFIX}${ip}`;
    try {
        await redis.setEx(redisKey, POLICY_TTL, String(max));
    } catch (e) {
        console.error('dynamicLimit applyPolicy:', e.message);
    }
    return max;
}

async function getEffectiveMax(ip, mlLabel) {
    const redisKey = `${REDIS_PREFIX}${ip}`;
    try {
        const stored = await redis.get(redisKey);
        if (stored !== null && stored !== undefined) {
            return parseInt(stored, 10);
        }
    } catch (e) {
        console.error('dynamicLimit getEffectiveMax:', e.message);
    }
    return maxForLabel(mlLabel || 'normal');
}


module.exports = {
    LIMITS,
    POLICY_TTL,
    maxForLabel,
    applyPolicyFromLabel,
    getEffectiveMax,
};
