const crypto = require('crypto');
const kv = require('../lib/kv');

function tokenOk(given) {
  const want = process.env.STATS_TOKEN || '';
  if (!want || typeof given !== 'string') return false;
  const a = Buffer.from(given), b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end(); }
  const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '') || (req.query && req.query.token);
  if (!tokenOk(token)) return res.status(401).json({ error: 'unauthorized' });
  if (!kv.ready()) return kv.notConfigured(res);
  try {
    const [likes, start, finish, fail, share, replay, finishDays, daily, feedback, runs, sqLikes, sqStart, sqFinish, sqShare, sqDaily, sqFeedback, sqRuns] = await kv.pipeline([
      ['GET', 'likes'],
      ['HGETALL', 'ev:start'], ['HGETALL', 'ev:finish'], ['HGETALL', 'ev:fail'], ['HGETALL', 'ev:share'], ['HGETALL', 'ev:replay'],
      ['HGETALL', 'ev:finish_days'], ['HGETALL', 'ev:daily'],
      ['LRANGE', 'feedback', 0, 199],
      ['LRANGE', 'runs', 0, 499],
      // Square Peg
      ['GET', 'likes:square'], ['HGETALL', 'ev:square:start'], ['HGETALL', 'ev:square:finish'], ['HGETALL', 'ev:square:share'], ['HGETALL', 'ev:square:daily'],
      ['LRANGE', 'feedback:square', 0, 199], ['LRANGE', 'runs:square', 0, 199],
    ]);
    const toObj = arr => { const o = {}; for (let i = 0; i < (arr || []).length; i += 2) o[arr[i]] = Number(arr[i + 1]); return o; };
    return res.status(200).json({
      likes: Number(likes) || 0,
      events: { start: toObj(start), finish: toObj(finish), fail: toObj(fail), share: toObj(share), replay: toObj(replay), finish_days: toObj(finishDays), daily: toObj(daily) },
      feedback: (feedback || []).map(s => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean),
      runs: (runs || []).map(s => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean),
      square: {
        likes: Number(sqLikes) || 0,
        events: { start: toObj(sqStart), finish: toObj(sqFinish), share: toObj(sqShare), daily: toObj(sqDaily) },
        feedback: (sqFeedback || []).map(s => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean),
        runs: (sqRuns || []).map(s => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean),
      },
    });
  } catch (e) {
    return res.status(502).json({ error: 'kv' });
  }
};
