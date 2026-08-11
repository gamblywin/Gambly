const base = process.env.SMOKE_URL || 'http://localhost:4000';
const r = await fetch(`${base}/api/health`);
const body = await r.json();
console.log(JSON.stringify({ status: r.status, ok: body.ok, version: body.version }, null, 2));
if (!r.ok || !body.ok) process.exit(1);
