// Gameplay counters. Only whitelisted event names and small enum-like fields; nothing per user.
const kv = require('../lib/kv');
const NAMES = new Set(['start', 'finish', 'fail', 'share', 'replay']);
const LEVEL = /^[a-z]\d{1,2}[a-z]?$/;
const MODE = new Set(['ghost', 'count', 'blind']);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }
  if (!kv.ready()) return res.status(204).end();   // silently drop when there is no store
  const b = kv.body(req);
  const n = b.n;
  if (!NAMES.has(n)) return res.status(400).end();
  const level = LEVEL.test(b.level || '') ? b.level : 'x';
  const mode = MODE.has(b.mode) ? b.mode : '-';
  const days = Number.isInteger(b.days) && b.days > 0 && b.days < 100 ? b.days : null;
  const today = new Date().toISOString().slice(0, 10);
  const cmds = [['HINCRBY', 'ev:' + n, level + ':' + mode, 1], ['HINCRBY', 'ev:daily', today + ':' + n, 1]];
  if (n === 'finish' && days) cmds.push(['HINCRBY', 'ev:finish_days', level + ':' + mode + ':' + days, 1]);
  if (n === 'finish' || n === 'fail') {
    // One record per completed run. Location is the coarse geo that Vercel attaches to the request; no IP is kept.
    const h = k => { const v = req.headers[k]; return v ? decodeURIComponent(String(v)).slice(0, 40) : ''; };
    const run = { t: Date.now(), n, level, mode, days: n === 'finish' ? days : null, country: h('x-vercel-ip-country'), region: h('x-vercel-ip-country-region'), city: h('x-vercel-ip-city') };
    cmds.push(['LPUSH', 'runs', JSON.stringify(run)], ['LTRIM', 'runs', 0, 1999]);
  }
  try { await kv.pipeline(cmds); } catch (e) { /* counters are best effort */ }
  return res.status(204).end();
};
