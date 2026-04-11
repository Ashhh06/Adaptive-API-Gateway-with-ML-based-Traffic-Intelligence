const Log = require('../models/Log');

const WINDOW_SIZE = 60 * 1000; // rolling 60s window, same shape as ml-service expects

async function extractFeatures(ip) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_SIZE);

    const logs = await Log.find({
        ip,
        timestamp: { $gte: windowStart }
    }).sort({ timestamp : 1 });

    if(logs.length === 0) {
        return null;
    }

    const requests_per_minute = logs.length;

    let totalGap = 0;
    for(let i = 1; i < logs.length; ++i) {
        totalGap += (logs[i].timestamp - logs[i - 1].timestamp);
    }
    const avg_inter_request_time = logs.length > 1 ? totalGap / (logs.length - 1) : 0;

    const endpoints = new Set(logs.map(log => log.endpoint));
    const unique_endpoints_hit = endpoints.size;

    const errors = logs.filter(log => log.status >= 400).length;
    const error_rate = errors / logs.length;

    const perSecondMap = {};

    logs.forEach(log => {
        const second = Math.floor(new Date(log.timestamp).getTime() / 1000);
        perSecondMap[second] = (perSecondMap[second] || 0) + 1;
    });

    const maxBurst = Math.max(...Object.values(perSecondMap));
    const burst_ratio = maxBurst / logs.length;

    return {
        ip,
        requests_per_minute,
        avg_inter_request_time,
        unique_endpoints_hit,
        error_rate,
        burst_ratio
    };
}

module.exports = extractFeatures;
