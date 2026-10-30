const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');
const { protect } = require('../middleware/auth');

// The 16 feature names expected by ml/ml_api.py
const REQUIRED_FEATURES = [
  'revenue_change_pct',
  'profit_change_pct',
  'expense_change_pct',
  'debt_ratio',
  'customer_demand_change_pct',
  'customer_churn_pct',
  'sales_change_pct',
  'downtime_hours',
  'operational_incidents',
  'delivery_delay_pct',
  'failed_login_attempts',
  'security_incidents',
  'vulnerability_count',
  'negative_feedback_pct',
  'average_rating',
  'sentiment_score',
];

const ML_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

// ── Generic FastAPI forwarder ─────────────────────────────────────────────────
function callFastAPI(path, body, method = 'POST') {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const url = new URL(path, ML_URL);
    const lib = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(new Error('ETIMEDOUT')); });
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Shared error handler ──────────────────────────────────────────────────────
function handleMLError(err, res) {
  if (err.code === 'ECONNREFUSED' || err.message === 'ETIMEDOUT' || err.code === 'ETIMEDOUT') {
    return res.status(503).json({ message: 'ML service is unavailable. Ensure the Python API is running.' });
  }
  console.error('[ml route]', err);
  return res.status(500).json({ message: 'Internal server error' });
}

// ── Validate the 16 features present in req.body ─────────────────────────────
function extractFeatures(body) {
  const missing = REQUIRED_FEATURES.filter((f) => !(f in body));
  if (missing.length) return { error: `Missing required fields: ${missing.join(', ')}`, missing };

  const invalid = REQUIRED_FEATURES.filter((f) => {
    const v = body[f];
    return typeof v !== 'number' || !isFinite(v);
  });
  if (invalid.length) return { error: `Fields must be finite numbers: ${invalid.join(', ')}`, invalid };

  const payload = {};
  for (const f of REQUIRED_FEATURES) payload[f] = body[f];
  return { payload };
}

// ── POST /api/ml/predict ──────────────────────────────────────────────────────
router.post('/predict', protect, async (req, res) => {
  try {
    const { payload, error, missing, invalid } = extractFeatures(req.body);
    if (error) return res.status(422).json({ message: error, missing, invalid });

    const mlRes = await callFastAPI('/predict', payload);
    return res.status(mlRes.status).json(mlRes.body);
  } catch (err) {
    return handleMLError(err, res);
  }
});

// ── POST /api/ml/explain ──────────────────────────────────────────────────────
// Returns prediction + SHAP feature contributions (why this risk level?)
router.post('/explain', protect, async (req, res) => {
  try {
    const { payload, error, missing, invalid } = extractFeatures(req.body);
    if (error) return res.status(422).json({ message: error, missing, invalid });

    const mlRes = await callFastAPI('/explain', payload);
    return res.status(mlRes.status).json(mlRes.body);
  } catch (err) {
    return handleMLError(err, res);
  }
});

// ── POST /api/ml/simulate ─────────────────────────────────────────────────────
// What-if simulation: { base: <16 features>, overrides: { field: newValue, … } }
router.post('/simulate', protect, async (req, res) => {
  try {
    const { base, overrides } = req.body;

    if (!base || typeof base !== 'object') {
      return res.status(422).json({ message: 'Request body must contain a "base" object with the 16 features.' });
    }
    if (!overrides || typeof overrides !== 'object' || Object.keys(overrides).length === 0) {
      return res.status(422).json({ message: 'Request body must contain an "overrides" object with at least one field.' });
    }

    const { payload: basePayload, error, missing, invalid } = extractFeatures(base);
    if (error) return res.status(422).json({ message: `In "base": ${error}`, missing, invalid });

    // Validate overrides are numeric
    const invalidOverrides = Object.entries(overrides).filter(([, v]) => typeof v !== 'number' || !isFinite(v));
    if (invalidOverrides.length) {
      return res.status(422).json({ message: `Override values must be finite numbers: ${invalidOverrides.map(([k]) => k).join(', ')}` });
    }

    const mlRes = await callFastAPI('/simulate', { base: basePayload, overrides });
    return res.status(mlRes.status).json(mlRes.body);
  } catch (err) {
    return handleMLError(err, res);
  }
});

// ── GET /api/ml/auto-assess ───────────────────────────────────────────────────
// Returns the latest scheduled automated assessment result
router.get('/auto-assess', protect, async (req, res) => {
  try {
    const mlRes = await callFastAPI('/auto-assess', null, 'GET');
    return res.status(mlRes.status).json(mlRes.body);
  } catch (err) {
    return handleMLError(err, res);
  }
});

// ── POST /api/ml/auto-assess/run ─────────────────────────────────────────────
// Manually trigger an immediate automated assessment
router.post('/auto-assess/run', protect, async (req, res) => {
  try {
    const mlRes = await callFastAPI('/auto-assess/run', {});
    return res.status(mlRes.status).json(mlRes.body);
  } catch (err) {
    return handleMLError(err, res);
  }
});

module.exports = router;
