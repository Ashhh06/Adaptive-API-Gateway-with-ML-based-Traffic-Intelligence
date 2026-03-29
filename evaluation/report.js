// Env: ML_URL, GATEWAY_URL, LATENCY_SAMPLES, THROUGHPUT_REQUESTS

const { execSync } = require('child_process');

const REDIS_URL_EVAL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const EVAL_IP = process.env.EVAL_CLIENT_IP || '127.0.0.1';

function delRateKeyForIp(ip) {
  try {
    execSync(`redis-cli -u "${REDIS_URL_EVAL}" DEL "rate:${ip}"`, { stdio: 'ignore' });
  } catch (_) {
    /* ignore if redis-cli missing */
  }
}

function evalHeaders() {
  return { 'X-Forwarded-For': EVAL_IP };
}

const ML_URL = process.env.ML_URL || 'http://127.0.0.1:8000/predict';
const GATEWAY_URL = (process.env.GATEWAY_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const LATENCY_SAMPLES = parseInt(process.env.LATENCY_SAMPLES || '50', 10);
const THROUGHPUT_REQUESTS = parseInt(process.env.THROUGHPUT_REQUESTS || '150', 10);

const LABELED_CASES = [
    { features: [1, 0, 1, 0, 1.0], expected: 'normal', note: 'single log burst=1' },
    { features: [2, 5000, 1, 0, 0.5], expected: 'normal', note: 'very slow pair' },
    { features: [35, 800, 3, 0.02, 0.15], expected: 'normal', note: 'steady user' },
    { features: [48, 200, 4, 0.12, 0.4], expected: 'normal', note: 'upper normal band' },
    { features: [60, 150, 4, 0.2, 0.45], expected: 'suspicious', note: 'borderline medium' },
    { features: [90, 100, 5, 0.15, 0.5], expected: 'suspicious', note: 'suspicious mid' },
    { features: [95, 80, 6, 0.25, 0.52], expected: 'malicious', note: 'rpm+burst malicious' },
    { features: [100, 50, 7, 0.3, 0.6], expected: 'malicious', note: 'high rpm burst' },
    { features: [120, 30, 10, 0.35, 0.7], expected: 'malicious', note: 'scan-like' },
    { features: [200, 10, 5, 0.1, 0.3], expected: 'malicious', note: 'extreme rpm' },
    { features: [300, 0, 1, 0, 1.0], expected: 'malicious', note: 'max rpm' },
    { features: [45, 100, 12, 0.1, 0.4], expected: 'malicious', note: 'many endpoints + rpm' },
    { features: [50, 200, 1, 0.5, 0.2], expected: 'malicious', note: 'high error rate' },
    { features: [30, 300, 2, 0.45, 0.2], expected: 'malicious', note: 'error_rate threshold' },
    { features: [39, 50, 2, 0.1, 0.9], expected: 'malicious', note: 'tight burst + rpm' },
    { features: [5, 100, 2, 0, 0.95], expected: 'suspicious', note: 'spiky low rpm' },
];

function bodyFromFeatures(f) {
    const [requests_per_minute, avg_inter_request_time, unique_endpoints_hit, error_rate, burst_ratio] = f;
    return JSON.stringify({
        requests_per_minute,
        avg_inter_request_time,
        unique_endpoints_hit,
        error_rate,
        burst_ratio,
    });
}

async function postPredict(features) {
    const res = await fetch(ML_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyFromFeatures(features),
    });
    if (!res.ok) throw new Error(`ML HTTP ${res.status}`);
    return res.json();
}

function isAnomalyLabel(label) {
    return label === 'suspicious' || label === 'malicious';
}

async function runMlMetrics() {
    const details = [];
    let correct = 0;
    let fpNormal = 0;
    const normalCases = LABELED_CASES.filter((c) => c.expected === 'normal').length;
    const anomalyExpected = LABELED_CASES.filter((c) => c.expected !== 'normal');
    let tpAnomaly = 0;

    for (const c of LABELED_CASES) {
        let predicted;
        try {
            const data = await postPredict(c.features);
            predicted = data.label;
        } catch (e) {
            predicted = `ERROR: ${e.message}`;
        }
        const match = predicted === c.expected;
        if (match) correct += 1;
        if (c.expected === 'normal') {
            if (predicted !== 'normal' && !String(predicted).startsWith('ERROR')) fpNormal += 1;
        } else if (isAnomalyLabel(predicted)) {
            tpAnomaly += 1;
        }
        details.push({ note: c.note, expected: c.expected, predicted, ok: match });
    }

    const accuracy = correct / LABELED_CASES.length;
    const falsePositiveRate = normalCases ? fpNormal / normalCases : 0;
    const anomalyDetectionRate = anomalyExpected.length ? tpAnomaly / anomalyExpected.length : 0;

    return {
        accuracy,
        falsePositiveRate,
        falsePositivesOnNormal: fpNormal,
        normalCases,
        anomalyDetectionRate,
        tpAnomaly,
        anomalyCasesTotal: anomalyExpected.length,
        details,
    };
}

async function measureLatencies(path, samples) {
  const times = [];
  const url = `${GATEWAY_URL}${path}`;
  const headers = evalHeaders();

  for (let i = 0; i < samples; i++) {
    const t0 = performance.now();
    const res = await fetch(url, { headers });
    await res.arrayBuffer();
    const ms = performance.now() - t0;
    if (res.ok) times.push(ms);
  }

  if (times.length === 0) {
    return { mean: 0, p95: 0, min: 0, max: 0, samples: 0 };
  }

  times.sort((a, b) => a - b);
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const p95Index = Math.ceil(0.95 * times.length) - 1;
  const p95 = times[Math.max(0, Math.min(p95Index, times.length - 1))];

  return {
    mean,
    p95,
    min: times[0],
    max: times[times.length - 1],
    samples: times.length,
  };
}

async function measureThroughput() {
  const url = `${GATEWAY_URL}/api/users`;
  const headers = evalHeaders();
  const t0 = performance.now();
  let ok = 0;
  let fail = 0;
  let firstFailInfo = null;

  for (let i = 0; i < THROUGHPUT_REQUESTS; i++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) {
        ok += 1;
      } else {
        fail += 1;
        if (!firstFailInfo) firstFailInfo = `HTTP ${res.status}`;
      }
    } catch (e) {
      fail += 1;
      if (!firstFailInfo) firstFailInfo = `network: ${e.message}`;
    }
  }

  const elapsedSec = (performance.now() - t0) / 1000;
  const rps = THROUGHPUT_REQUESTS / elapsedSec;

  return {
    requests: THROUGHPUT_REQUESTS,
    elapsedSec,
    rps,
    ok,
    fail,
    firstFailInfo,
  };
}


function printTable(ml, health, api, throughput) {
    const overheadMean = api.mean - health.mean;
    const overheadP95 = api.p95 - health.p95;

    console.log('\n--- Evaluation summary ---\n');
    console.log('1) ML classification (labeled suite)');
    console.log(`   Accuracy:                ${(ml.accuracy * 100).toFixed(2)}%`);
    console.log(`   Anomaly detection rate:   ${(ml.anomalyDetectionRate * 100).toFixed(2)}%`);
    console.log(`   False positive rate:      ${(ml.falsePositiveRate * 100).toFixed(2)}%`);
    console.log(`   FP count:                 ${ml.falsePositivesOnNormal} / ${ml.normalCases} normal cases`);
    console.log('\n2) Gateway latency');
    console.log(`   GET /health     mean=${health.mean.toFixed(2)} ms  p95=${health.p95.toFixed(2)} ms`);
    console.log(`   GET /api/users  mean=${api.mean.toFixed(2)} ms  p95=${api.p95.toFixed(2)} ms`);
    console.log(`   Overhead (API − health)   mean=+${overheadMean.toFixed(2)} ms  p95=+${overheadP95.toFixed(2)} ms`);
    console.log('\n3) Throughput (sequential /api/users)');
    console.log(
        `   ${throughput.requests} req in ${throughput.elapsedSec.toFixed(2)} s → ${throughput.rps.toFixed(1)} req/s (ok=${throughput.ok} fail=${throughput.fail})` +
        (throughput.firstFailInfo ? `  [first fail: ${throughput.firstFailInfo}]` : '')
    );
    console.log('\n4) Plan: Static RL vs Adaptive RL');
    console.log('   Static:  low anomaly detection, latency low (re-run with ML_SERVICE_URL unset)');
    console.log('   Adaptive: higher detection (see above), latency slightly higher (API vs /health)');
    console.log('\n--- Per-case predictions ---');
    for (const d of ml.details) {
        console.log(`   [${d.ok ? 'OK' : 'XX'}] ${d.note}: expected=${d.expected} predicted=${d.predicted}`);
    }
    console.log('');
}

async function main() {
  console.log(`ML_URL=${ML_URL}`);
  console.log(`GATEWAY_URL=${GATEWAY_URL}`);

  const ml = await runMlMetrics();

  console.log('\nMeasuring gateway latency...');
  delRateKeyForIp(EVAL_IP);
  const health = await measureLatencies('/health', LATENCY_SAMPLES);

  delRateKeyForIp(EVAL_IP);
  const api = await measureLatencies('/api/users', LATENCY_SAMPLES);

  console.log('Measuring throughput...');
  delRateKeyForIp(EVAL_IP);
  const throughput = await measureThroughput();

  printTable(ml, health, api, throughput);
}


main().catch((e) => {
    console.error(e);
    process.exit(1);
});