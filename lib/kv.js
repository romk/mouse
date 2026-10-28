// Tiny client for an Upstash-compatible Redis REST endpoint. No dependencies.
// Env vars come from the Vercel Upstash integration (KV_*) or from Upstash directly (UPSTASH_*).
const crypto = require('crypto');
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const ready = () => !!(URL_ && TOKEN);

async function pipeline(cmds) {
  const r = await fetch(URL_ + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error('kv http ' + r.status);
  const out = await r.json();
  return out.map(x => { if (x.error) throw new Error(x.error); return x.result; });
}
const cmd = async (...args) => (await pipeline([args]))[0];

// Anonymised client id: a short hash of the IP, only used for rate limits, expires within a day.
function who(req) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || '?';
  return crypto.createHash('sha256').update(ip + (process.env.STATS_TOKEN || '')).digest('hex').slice(0, 16);
}

function body(req) {
  if (req.body == null) return {};
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  if (Buffer.isBuffer(req.body)) { try { return JSON.parse(req.body.toString('utf8')); } catch (e) { return {}; } }
  return req.body;
}

// Which game a request is about. The mouse keeps the original, unsuffixed keys.
const GAMES = new Set(['mouse', 'square', 'pi', 'e']);
function game(req, b) {
  const g = (b && b.game) || (req.query && req.query.game) || 'mouse';
  return GAMES.has(g) ? g : 'mouse';
}
const suffix = g => g === 'mouse' ? '' : ':' + g;

function notConfigured(res) {
  res.status(503).json({ error: 'not configured' });
}

module.exports = { ready, cmd, pipeline, who, body, notConfigured, game, suffix, GAMES };
