const Log = require('../models/Log');

const WINDOW_SIZE = 60 * 1000; //60 seconds

async function extractFeatures(ip) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_SIZE);
    
    //fetch logs for this IP in last 60s
    const logs = await Log.find({
        ip,
        timestamp: { $gte: windowStart }
    }).sort({ timestamp : 1 });

    if(logs.length === 0) {
        return null;
    }

    //1. requests per minute
    const requests_per_minute = logs.length;

    //2. avg_inter_request_time
    let totalGap = 0;
    for(let i = 1; i < logs.length; ++i) {
        totalGap += (logs[i].timestamp - logs[i - 1].timestamp);
    }
    const avg_inter_request_time = logs.length > 1 ? totalGap / (logs.length - 1) : 0;

    //3. unique_endpoints_hit
    const endpoints = new Set(logs.map(log => log.endpoint));
    const unique_endpoints_hit = endpoints.size;

    //4. error_rate
    const errors = logs.filter(log => log.status >= 400).length;
    const error_rate = errors / logs.length;

    //5. burst_ratio
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