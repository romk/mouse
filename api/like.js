const kv = require('../lib/kv');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!kv.ready()) return kv.notConfigured(res);
  const sfx = kv.suffix(kv.game(req, kv.body(req)));
  try {
    if (req.method === 'GET') {
      const count = Number(await kv.cmd('GET', 'likes' + sfx)) || 0;
      return res.status(200).json({ count });
    }
    if (req.method === 'POST') {
      const key = 'like' + sfx + ':' + kv.who(req);
      const fresh = await kv.cmd('SET', key, '1', 'EX', 86400, 'NX');
      const count = fresh ? Number(await kv.cmd('INCR', 'likes' + sfx)) : Number(await kv.cmd('GET', 'likes' + sfx)) || 0;
      return res.status(200).json({ count, liked: true });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end();
  } catch (e) {
    return res.status(502).json({ error: 'kv' });
  }
};
