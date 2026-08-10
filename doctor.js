const fs=require('fs');
const path=require('path');
const cp=require('child_process');

const root=__dirname;
const required=['package.json','server.js','index.html','app.js','db.js','db.json','supabase-schema.sql','.npmrc','.env.example'];
let ok=true;

console.log('BetSocial Doctor\n');

try{
  const v=cp.execFileSync(process.execPath,['--version'],{encoding:'utf8'}).trim();
  console.log('Node:',v);
  const major=Number(v.replace(/^v/,'').split('.')[0]);
  if(major<18){console.error('ERRO: Node 18+ é necessário.');ok=false;}
}catch(e){console.error('ERRO: Node.js não encontrado.');ok=false;}

for(const f of required){
  const exists=fs.existsSync(path.join(root,f));
  console.log(`${exists?'OK ':'ERRO'} ${f}`);
  if(!exists)ok=false;
}

try{
  const p=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  if(p.scripts?.start!=='node server.js'){
    console.error('ERRO: script "start" deve executar node server.js.');
    ok=false;
  }
  console.log('OK execução: npm install + npm start (banco JSON local, sem dependências externas).');
}catch(e){console.error('ERRO: package.json inválido:',e.message);ok=false;}

console.log('\nResultado:',ok?'OK — estrutura pronta para npm install.':'FALHA — corrija os itens acima.');
process.exit(ok?0:1);
