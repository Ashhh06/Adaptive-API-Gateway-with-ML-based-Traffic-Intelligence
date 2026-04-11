const redis = require('../config/redis');
const extractFeatures = require('../services/featureExtractor');
const { predict: mlPredict } = require('../services/mlClient');
const { applyPolicyFromLabel } = require('../services/dynamicLimit');

function getClientIp(req) {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (typeof ip === 'string' && ip.includes(',')) {
        ip = ip.split(',')[0].trim();
    }
    if (ip === '::1') ip = '127.0.0.1';
    return ip;
}

async function readCache(ip) {
    const key = `ml:pred:${ip}`;
    try {
        const raw = await redis.get(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.label === 'string') return parsed;
    } catch (e) {
        console.error('ML cache read:', e.message);
    }
    return null;
}

async function writeCache(ip, payload) {
    const ttl = parseInt(process.env.ML_CACHE_TTL || '20', 10);
    try {
        await redis.setEx(`ml:pred:${ip}`, ttl, JSON.stringify(payload));
    } catch (e) {
        console.error('ML cache write:', e.message);
    }
}

module.exports = async function mlIntelligence(req, res, next) {
    const ip = getClientIp(req);

    if (!process.env.ML_SERVICE_URL) {
        req.mlLabel = 'normal';
        await applyPolicyFromLabel(ip, req.mlLabel);
        return next();
    }

    const mlDebug = ['1', 'true', 'yes'].includes(String(process.env.ML_DEBUG || '').trim().toLowerCase());

    try {
        const cached = await readCache(ip);
        if (cached) {
            req.mlLabel = cached.label;
            req.mlConfidence = cached.confidence;
            req.mlFromCache = true;
            await applyPolicyFromLabel(ip, req.mlLabel);
            if (mlDebug) {
                console.log('[ML_DEBUG]', JSON.stringify({
                    ip,
                    path: req.originalUrl,
                    fromCache: true,
                    label: cached.label,
                    confidence: cached.confidence,
                }));
            }
            return next();
        }
    } catch (e) {
        console.error('ML intelligence (cache):', e.message);
    }

    let features = null;
    try {
        features = await extractFeatures(ip);
    } catch (e) {
        console.error('ML features:', e.message);
    }

    if (!features) {
        req.mlLabel = 'normal';
        await applyPolicyFromLabel(ip, req.mlLabel);
        if (mlDebug) {
            console.log('[ML_DEBUG]', JSON.stringify({
                ip,
                path: req.originalUrl,
                fromCache: false,
                reason: 'no_features_window',
                label: 'normal',
            }));
        }
        return next();
    }

    const payload = {
        requests_per_minute: features.requests_per_minute,
        avg_inter_request_time: features.avg_inter_request_time,
        unique_endpoints_hit: features.unique_endpoints_hit,
        error_rate: features.error_rate,
        burst_ratio: features.burst_ratio,
    };

    const result = await mlPredict(payload);
    let label = 'normal';
    let confidence = null;
    if (result && result.label) {
        label = result.label;
        confidence = result.confidence;
    }

    req.mlLabel = label;
    req.mlConfidence = confidence;
    req.mlFromCache = false;

    if (mlDebug) {
        const line = {
            ip,
            path: req.originalUrl,
            fromCache: false,
            payload,
            label,
            confidence,
        };
        if (result && result.debug) line.mlService = result.debug;
        console.log('[ML_DEBUG]', JSON.stringify(line));
    }

    await writeCache(ip, { label, confidence });
    await applyPolicyFromLabel(ip, req.mlLabel);

    next();
};