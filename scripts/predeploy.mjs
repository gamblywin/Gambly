import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const checks=[
 ['.env.example',fs.existsSync('.env.example')],
 ['next.config.ts',fs.existsSync('next.config.ts')],
 ['api/server.js',fs.existsSync('api/server.js')],
 ['api/sports-provider.js',fs.existsSync('api/sports-provider.js')],
 ['lib/settlement.js',fs.existsSync('lib/settlement.js')],
 ['supabase-sprint30-player-markets.sql',fs.existsSync('supabase-sprint30-player-markets.sql')],
 ['render.yaml',fs.existsSync('render.yaml')]
];
let fail=false; for(const [n,ok] of checks){console.log(`${ok?'✓':'✗'} ${n}`);if(!ok)fail=true;}
if(fail)process.exit(1);
try{execFileSync(process.execPath,['--test','lib/player-settlement.test.mjs'],{stdio:'inherit'});}catch{process.exit(1)}
console.log('✓ Predeploy GAMBLY: estrutura e liquidação validadas.');
