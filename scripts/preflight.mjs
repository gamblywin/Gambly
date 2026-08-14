import fs from 'node:fs';

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const checks=[
  ['Next.js',!!pkg.dependencies?.next],
  ['React',!!pkg.dependencies?.react],
  ['TypeScript',!!pkg.devDependencies?.typescript],
  ['Supabase JS',!!pkg.dependencies?.['@supabase/supabase-js']],
  ['API isolada',fs.existsSync('api/server.js')],
  ['App Router',fs.existsSync('app/page.tsx')],
  ['Supabase browser client',fs.existsSync('lib/supabase-browser.ts')],
  ['Realtime hook',fs.existsSync('hooks/useGamblyRealtime.ts')],
  ['Motor de liquidação',fs.existsSync('lib/settlement.js')],
  ['Migração Sprint 28',fs.existsSync('supabase-sprint28-settlement.sql')],
  ['Migração Sprint 29',fs.existsSync('supabase-sprint29.sql')],
  ['Bet Slip Engine',fs.existsSync('lib/bet-slip-engine.js')],
  ['Sports Provider',fs.existsSync('api/sports-provider.js')],
];
for(const [name,ok] of checks) console.log(`${ok?'✓':'✗'} ${name}`);
let failed=checks.some(([,ok])=>!ok);

if(process.env.NODE_ENV==='production'){
  const envChecks=[
    ['SUPABASE_URL',!!process.env.SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY',!!process.env.SUPABASE_SERVICE_ROLE_KEY],
    ['APP_URL',!!process.env.APP_URL],
    ['GAMBLY_ADMIN_TOKEN',!!process.env.GAMBLY_ADMIN_TOKEN],
    ['API_ORIGIN',!!process.env.API_ORIGIN],
  ];
  for(const [name,ok] of envChecks) console.log(`${ok?'✓':'✗'} Produção: ${name}`);
  failed ||= envChecks.some(([,ok])=>!ok);
}
if(failed) process.exit(1);
