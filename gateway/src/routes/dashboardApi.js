const express = require('express');
const axios = require('axios');
const Log = require('../models/Log');

const router = express.Router();

const RANGE_MS = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

function parseRange(q) {
  const r = (q && String(q)) || '24h';
  return RANGE_MS[r] ? r : '24h';
}

function rangeStart(rangeKey) {
  return new Date(Date.now() - RANGE_MS[rangeKey]);
}

function bucketMsForRange(rangeKey) {
  if (rangeKey === '1h') return 60 * 1000;
  if (rangeKey === '24h') return 5 * 60 * 1000;
  return 60 * 60 * 1000;
}

function dominantLabel(labels) {
  const counts = {};
  for (const l of labels) {
    const k = l == null || l === '' ? 'unknown' : String(l);
    counts[k] = (counts[k] || 0) + 1;
  }
  let best = 'unknown';
  let n = 0;
  for (const [k, v] of Object.entries(counts)) {
    if (v > n) {
      n = v;
      best = k;
    }
  }
  return best;
}

router.get('/summary', async (req, res) => {
  try {
    const rangeKey = parseRange(req.query.range);
    const from = rangeStart(rangeKey);

    const [agg] = await Log.aggregate([
      { $match: { timestamp: { $gte: from } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          allowed: { $sum: { $cond: [{ $eq: ['$decision', 'allowed'] }, 1, 0] } },
          blocked: { $sum: { $cond: [{ $eq: ['$decision', 'blocked'] }, 1, 0] } },
          errors: { $sum: { $cond: [{ $gte: ['$status', 400] }, 1, 0] } },
          avgLatency: { $avg: '$latency' },
          uniqueIps: { $addToSet: '$ip' },
        },
      },
    ]);

    const row = agg || {
      total: 0,
      allowed: 0,
      blocked: 0,
      errors: 0,
      avgLatency: 0,
      uniqueIps: [],
    };

    res.json({
      range: rangeKey,
      from: from.toISOString(),
      to: new Date().toISOString(),
      totalRequests: row.total,
      allowed: row.allowed,
      blocked: row.blocked,
      errorCount: row.errors,
      errorRate: row.total ? row.errors / row.total : 0,
      blockedRate: row.total ? row.blocked / row.total : 0,
      avgLatencyMs: row.avgLatency != null ? Math.round(row.avgLatency * 100) / 100 : 0,
      uniqueIps: Array.isArray(row.uniqueIps) ? row.uniqueIps.length : 0,
    });
  } catch (e) {
    console.error('dashboard summary:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/timeseries', async (req, res) => {
  try {
    const rangeKey = parseRange(req.query.range);
    const from = rangeStart(rangeKey);
    const bucketMs = bucketMsForRange(rangeKey);

    const rows = await Log.aggregate([
      { $match: { timestamp: { $gte: from } } },
      {
        $addFields: {
          bucket: {
            $toDate: {
              $subtract: [
                { $toLong: '$timestamp' },
                { $mod: [{ $toLong: '$timestamp' }, bucketMs] },
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: '$bucket',
          count: { $sum: 1 },
          blocked: { $sum: { $cond: [{ $eq: ['$decision', 'blocked'] }, 1, 0] } },
          allowed: { $sum: { $cond: [{ $eq: ['$decision', 'allowed'] }, 1, 0] } },
          avgLatency: { $avg: '$latency' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      range: rangeKey,
      bucketMs,
      points: rows.map((r) => ({
        t: r._id,
        count: r.count,
        blocked: r.blocked,
        allowed: r.allowed,
        avgLatencyMs: r.avgLatency != null ? Math.round(r.avgLatency * 100) / 100 : 0,
      })),
    });
  } catch (e) {
    console.error('dashboard timeseries:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/labels', async (req, res) => {
  try {
    const rangeKey = parseRange(req.query.range);
    const from = rangeStart(rangeKey);

    const rows = await Log.aggregate([
      { $match: { timestamp: { $gte: from } } },
      {
        $group: {
          _id: {
            $ifNull: ['$mlLabel', 'unknown'],
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      range: rangeKey,
      labels: rows.map((r) => ({ label: r._id, count: r.count })),
    });
  } catch (e) {
    console.error('dashboard labels:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/top-ips', async (req, res) => {
  try {
    const rangeKey = parseRange(req.query.range);
    const from = rangeStart(rangeKey);
    const limit = Math.min(parseInt(req.query.limit, 10) || 15, 50);

    const rows = await Log.aggregate([
      { $match: { timestamp: { $gte: from } } },
      {
        $group: {
          _id: '$ip',
          total: { $sum: 1 },
          allowed: { $sum: { $cond: [{ $eq: ['$decision', 'allowed'] }, 1, 0] } },
          blocked: { $sum: { $cond: [{ $eq: ['$decision', 'blocked'] }, 1, 0] } },
          labelList: { $push: '$mlLabel' },
        },
      },
      { $sort: { total: -1 } },
      { $limit: limit },
    ]);

    res.json({
      range: rangeKey,
      ips: rows.map((r) => ({
        ip: r._id,
        total: r.total,
        allowed: r.allowed,
        blocked: r.blocked,
        dominantLabel: dominantLabel(r.labelList || []),
      })),
    });
  } catch (e) {
    console.error('dashboard top-ips:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/recent', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 80, 200);
    const docs = await Log.find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('ip endpoint timestamp status latency decision mlLabel mlConfidence')
      .lean();

    res.json({
      logs: docs.map((d) => ({
        id: String(d._id),
        ip: d.ip,
        endpoint: d.endpoint,
        timestamp: d.timestamp,
        status: d.status,
        latency: d.latency,
        decision: d.decision,
        mlLabel: d.mlLabel ?? null,
        mlConfidence: d.mlConfidence != null ? d.mlConfidence : null,
      })),
    });
  } catch (e) {
    console.error('dashboard recent:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/health', async (req, res) => {
  const out = { gateway: 'ok', ml: 'unknown' };
  const mlUrl = process.env.ML_SERVICE_URL;
  if (!mlUrl) {
    out.ml = 'disabled';
    return res.json(out);
  }
  const base = mlUrl.replace(/\/predict\/?$/i, '').replace(/\/$/, '') || mlUrl;
  const healthUrl = `${base}/health`;
  try {
    const r = await axios.get(healthUrl, { timeout: 2000 });
    out.ml = r.status === 200 && r.data && r.data.status === 'ok' ? 'ok' : 'degraded';
  } catch (_) {
    out.ml = 'down';
  }
  res.json(out);
});

module.exports = router;
