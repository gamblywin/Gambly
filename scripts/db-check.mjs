const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url || !key){
  console.log('Banco não configurado: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(process.env.NODE_ENV === 'production' ? 1 : 0);
}
const r=await fetch(`${url.replace(/\/$/,'')}/rest/v1/users?select=id&limit=1`,{
  headers:{apikey:key,Authorization:`Bearer ${key}`}
});
console.log(`Supabase: HTTP ${r.status} — ${r.ok?'OK':'ERRO'}`);
if(!r.ok) console.log(await r.text());
process.exit(r.ok?0:1);
