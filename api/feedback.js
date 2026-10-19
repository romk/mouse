const kv = require('../lib/kv');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }
  if (!kv.ready()) return kv.notConfigured(res);
  const b = kv.body(req);
  const text = typeof b.text === 'string' ? b.text.trim().slice(0, 1000) : '';
  if (!text) return res.status(400).json({ error: 'empty' });
  const level = typeof b.level === 'string' ? b.level.slice(0, 8) : null;
  try {
    const key = 'fb:' + kv.who(req);
    const [n] = await kv.pipeline([['INCR', key], ['EXPIRE', key, 86400]]);
    if (Number(n) > 5) return res.status(429).json({ error: 'rate' });
    const entry = JSON.stringify({ t: Date.now(), text, level });
    await kv.pipeline([['LPUSH', 'feedback', entry], ['LTRIM', 'feedback', 0, 999]]);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ error: 'kv' });
  }
};
