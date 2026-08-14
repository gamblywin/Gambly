import fs from 'node:fs';
import path from 'node:path';

const required = [
  'package.json','next.config.ts','app/layout.tsx','app/page.tsx',
  'components/AppShell.tsx','components/FeaturePage.tsx','lib/api.ts','api/server.js'
];
const missing = required.filter(f => !fs.existsSync(path.join(process.cwd(), f)));
console.log(missing.length ? `ERRO — faltando: ${missing.join(', ')}` : 'OK — arquitetura GAMBLY Sprint 29 encontrada.');
process.exitCode = missing.length ? 1 : 0;
