// Minimal Upstash-REST-compatible in-memory Redis for local testing (POST /pipeline only).
const http = require('http');
const db = new Map(), exp = new Map();
const alive = k => { const e = exp.get(k); if (e && e < Date.now()) { db.delete(k); exp.delete(k); } return db.has(k); };
function run([c, ...a]) {
  c = c.toUpperCase();
  switch (c) {
    case 'GET': return alive(a[0]) ? db.get(a[0]) : null;
    case 'SET': { const nx = a.includes('NX'); if (nx && alive(a[0])) return null; db.set(a[0], String(a[1])); const i = a.indexOf('EX'); if (i > 0) exp.set(a[0], Date.now() + a[i + 1] * 1000); return 'OK'; }
    case 'INCR': { const v = (alive(a[0]) ? Number(db.get(a[0])) : 0) + 1; db.set(a[0], String(v)); return v; }
    case 'EXPIRE': exp.set(a[0], Date.now() + a[1] * 1000); return 1;
    case 'HINCRBY': { const h = alive(a[0]) ? db.get(a[0]) : {}; h[a[1]] = (h[a[1]] || 0) + Number(a[2]); db.set(a[0], h); return h[a[1]]; }
    case 'HGETALL': { const h = alive(a[0]) ? db.get(a[0]) : {}; return Object.entries(h).flatMap(([k, v]) => [k, String(v)]); }
    case 'LPUSH': { const l = alive(a[0]) ? db.get(a[0]) : []; l.unshift(...a.slice(1)); db.set(a[0], l); return l.length; }
    case 'LTRIM': { const l = alive(a[0]) ? db.get(a[0]) : []; db.set(a[0], l.slice(a[1], a[2] + 1)); return 'OK'; }
    case 'LRANGE': { const l = alive(a[0]) ? db.get(a[0]) : []; return l.slice(a[1], a[2] + 1); }
    default: throw new Error('unknown ' + c);
  }
}
http.createServer((req, res) => {
  let b = ''; req.on('data', d => b += d); req.on('end', () => {
    try {
      const cmds = JSON.parse(b || '[]'); const out = (req.url === '/pipeline' ? cmds : [cmds]).map(c => { try { return { result: run(c) }; } catch (e) { return { error: e.message }; } });
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(req.url === '/pipeline' ? out : out[0]));
    } catch (e) { res.writeHead(400); res.end('{"error":"bad"}'); }
  });
}).listen(8799, '127.0.0.1', () => console.log('fakekv on 8799'));
