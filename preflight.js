const required = ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','APP_URL'];
const optional = ['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REDIRECT_URI','RESEND_API_KEY','EMAIL_FROM','SPORTMONKS_API_TOKEN'];
const production = process.env.NODE_ENV === 'production';
const missing = production ? required.filter(k => !process.env[k]) : [];
console.log(`GAMBLY preflight — NODE_ENV=${process.env.NODE_ENV || 'development'}`);
if (missing.length) {
  console.error('Variáveis obrigatórias ausentes:', missing.join(', '));
  process.exit(1);
}
for (const k of optional) console.log(`${k}: ${process.env[k] ? 'configurada' : 'não configurada'}`);
console.log('Preflight OK.');
