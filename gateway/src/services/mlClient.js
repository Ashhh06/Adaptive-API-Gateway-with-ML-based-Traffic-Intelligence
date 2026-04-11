const axios = require('axios');

async function predict(featuresPayload) {
    const url = process.env.ML_SERVICE_URL;
    if(!url) return null;

    const timeoutMs = parseInt(process.env.ML_TIMEOUT_MS || '500', 10);
    const retries = parseInt(process.env.ML_MAX_RETRIES || '1', 10);

    let lastErr;
    const debug = ['1', 'true', 'yes'].includes(String(process.env.ML_DEBUG || '').trim().toLowerCase());
    const headers = { 'Content-Type': 'application/json' };
    if (debug) headers['X-ML-Debug'] = '1';

    for(let attempt = 0; attempt <= retries; attempt++) {
        try {
            const { data } = await axios.post(url, featuresPayload, {
                timeout: timeoutMs,
                headers,
            });
            if (data && typeof data.label === 'string') {
                return {
                    label: data.label,
                    confidence: typeof data.confidence === 'number' ? data.confidence : null,
                    debug: debug && data.debug && typeof data.debug === 'object' ? data.debug : null,
                };
            }
            return null;
        } catch (err) {
            lastErr = err;
            if (attempt < retries) continue;
        }
    }
    if(lastErr) console.error("ML prediction failed:", lastErr.message);
    return null;
}

module.exports = { predict };