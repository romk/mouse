const crypto = require('crypto');
const kv = require('../lib/kv');

function tokenOk(given) {
  const want = process.env.STATS_TOKEN || '';
  if (!want || typeof given !== 'string') return false;
  const a = Buffer.from(given), b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// One block per game: likes, event counters (per level/mode, per day), feedback and completed runs.
const EVENTS = ['start', 'finish', 'fail', 'share', 'replay', 'finish_days', 'daily'];
const toObj = arr => { const o = {}; for (let i = 0; i < (arr || []).length; i += 2) o[arr[i]] = Number(arr[i + 1]); return o; };
const toList = arr => (arr || []).map(s => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end(); }
  const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '') || (req.query && req.query.token);
  if (!tokenOk(token)) return res.status(401).json({ error: 'unauthorized' });
  if (!kv.ready()) return kv.notConfigured(res);
  const games = [...kv.GAMES];
  const cmds = [];
  for (const g of games) { const s = kv.suffix(g);
    cmds.push(['GET', 'likes' + s]);
    for (const e of EVENTS) cmds.push(['HGETALL', 'ev' + s + ':' + e]);
    cmds.push(['LRANGE', 'feedback' + s, 0, 199], ['LRANGE', 'runs' + s, 0, 499]);
  }
  try {
    const out = await kv.pipeline(cmds), per = cmds.length / games.length, result = {};
    games.forEach((g, i) => { const r = out.slice(i * per, (i + 1) * per), events = {};
      EVENTS.forEach((e, k) => { events[e] = toObj(r[1 + k]); });
      result[g] = { likes: Number(r[0]) || 0, events, feedback: toList(r[1 + EVENTS.length]), runs: toList(r[2 + EVENTS.length]) }; });
    return res.status(200).json({ games: result });
  } catch (e) {
    return res.status(502).json({ error: 'kv' });
  }
};
