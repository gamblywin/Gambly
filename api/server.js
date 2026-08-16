const http=require('http');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {settlePrediction}=require('../lib/settlement');
const {parseBetSlipText}=require('../lib/bet-slip-engine');
const {fetchProviderFixtures,fetchApiFootballFixturePlayers}=require('./sports-provider');
// .env opcional, sem obrigar o usuário a instalar dependências.
try { require('dotenv').config(); } catch (_) {
  try {
    const raw=fs.readFileSync(path.join(__dirname,'.env'),'utf8');
    for(const line of raw.split(/\r?\n/)){
      const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if(!m || m[1] in process.env) continue;
      let v=m[2].trim();
      if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1);
      process.env[m[1]]=v;
    }
  } catch (_) {}
}
const dbStore=require('./db');
const ROOT=__dirname;
const PORT=Number(process.env.API_PORT||process.env.PORT||4000);
const HOST=process.env.HOST||'0.0.0.0';
const LOCAL_HOST=process.env.LOCAL_HOST||'localhost';
const APP_ORIGIN=(process.env.APP_URL||'').replace(/\/$/,'');
const IS_PROD=process.env.NODE_ENV==='production';
const COOKIE_SECURE=IS_PROD || APP_ORIGIN.startsWith('https://');
const PUBLIC_ORIGIN=APP_ORIGIN || (process.env.RENDER_EXTERNAL_URL||'').replace(/\/$/,'');
const sessions=new Map(), streamTokens=new Map(), sseClients=new Set(), rateBuckets=new Map(), oauthStates=new Map();
const sportsLogoCache=new Map();
let sportsSyncAt=0, sportsSyncPromise=null;
const SESSION_TTL=1000*60*60*24*7, RESET_TTL=1000*60*30, PBKDF2_ITERATIONS=120000;
const uid=p=>p+crypto.randomBytes(7).toString('hex');
function hashPassword(password){const salt=crypto.randomBytes(16).toString('hex');const hash=crypto.pbkdf2Sync(String(password),salt,PBKDF2_ITERATIONS,32,'sha256').toString('hex');return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hash}`}
function verifyPassword(password,stored){if(!String(stored).startsWith('pbkdf2$'))return String(stored)===String(password);const [,it,salt,hash]=stored.split('$');const c=crypto.pbkdf2Sync(String(password),salt,Number(it),32,'sha256');return crypto.timingSafeEqual(c,Buffer.from(hash,'hex'))}
function makeSession(userId){const t=crypto.randomBytes(32).toString('hex');sessions.set(t,{userId,expiresAt:Date.now()+SESSION_TTL});return t}
function cookieSession(t){return `gambly_session=${t}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL/1000}${COOKIE_SECURE?'; Secure':''}`}
function clearCookie(){return `gambly_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${COOKIE_SECURE?'; Secure':''}`}
function cookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(x=>x.trim().split('=')) .filter(x=>x[0]))}
async function authUser(req){const h=req.headers.authorization||'';let t=h.startsWith('Bearer ')?h.slice(7):cookies(req).gambly_session||cookies(req).betsocial_session||'';const s=sessions.get(t);if(!s)return null;if(s.expiresAt<Date.now()){sessions.delete(t);return null}s.expiresAt=Date.now()+SESSION_TTL;const db=await dbStore.read();return db.users.find(u=>u.id===s.userId)||null}
function safeUser(u){const {password,...x}=u;return x}
function rateLimit(req,key,limit,windowMs){const ip=req.socket.remoteAddress||'local',k=ip+':'+key,now=Date.now(),a=(rateBuckets.get(k)||[]).filter(t=>now-t<windowMs);a.push(now);rateBuckets.set(k,a);return a.length<=limit}
function send(res,status,data,headers={}){const body=typeof data==='string'?data:JSON.stringify(data);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',...headers});res.end(body)}
function body(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',c=>{raw+=c;if(raw.length>4e6)req.destroy()});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{})}catch(e){reject(e)}});req.on('error',reject)})}
function emit(userId,event,data){const payload=`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;for(const c of sseClients){if(c.userId===userId)try{c.res.write(payload)}catch{ sseClients.delete(c)}}}
function eventSummary(db,event){
  if(!event)return null;
  const home=(db.teams||[]).find(t=>t.id===event.homeTeamId), away=(db.teams||[]).find(t=>t.id===event.awayTeamId), league=(db.leagues||[]).find(l=>l.id===event.leagueId);
  const last=Array.isArray(event.providerEvents)?event.providerEvents[event.providerEvents.length-1]:null;
  return {id:event.id,homeTeam:home?.name||'Casa',awayTeam:away?.name||'Fora',homeLogo:home?.logoUrl||'',awayLogo:away?.logoUrl||'',homeTeamId:home?.providerTeamId??home?.id??'',awayTeamId:away?.providerTeamId??away?.id??'',league:league?.name||'Futebol',country:league?.country||'',startTime:event.startTime,status:event.status,homeScore:event.homeScore??null,awayScore:event.awayScore??null,minute:event.minute??last?.minute??null};
}
function publicPost(p,db,viewerId=''){const u=db.users.find(x=>x.id===p.authorId);const event=p.eventId?eventSummary(db,db.events?.find(e=>e.id===p.eventId)):null;return {...p,author:u?.name||p.author,handle:u?.handle||p.handle,authorAvatar:u?.avatar||'',liked:Boolean(viewerId&&Array.isArray(p.likedBy)&&p.likedBy.includes(viewerId)),event}}
function passwordStrength(p){let n=0;if(p.length>=8)n++;if(/[A-Z]/.test(p))n++;if(/[a-z]/.test(p))n++;if(/\d/.test(p))n++;if(/[^A-Za-z0-9]/.test(p))n++;return n}
function refreshPredictionSlip(slip,predictions){
  const legs=(slip.predictionIds||[]).map(id=>predictions.find(p=>p.id===id)).filter(Boolean);
  if(!legs.length){slip.result='pending';slip.settledAt=null;return slip;}
  if(legs.some(p=>p.result==='lost')) slip.result='lost';
  else if(legs.some(p=>p.result==='pending')) slip.result='pending';
  else if(legs.every(p=>p.result==='void')) slip.result='void';
  else slip.result='won';
  slip.settledAt=slip.result==='pending'?null:(slip.settledAt||new Date().toISOString());
  return slip;
}

async function sendResetEmail(email,url){if(!process.env.RESEND_API_KEY)return false;const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.EMAIL_FROM||'GAMBLY <onboarding@resend.dev>',to:[email],subject:'Redefina sua senha do GAMBLY',html:`<p>Recebemos um pedido para redefinir sua senha.</p><p><a href="${url}">Criar nova senha</a></p><p>O link expira em 30 minutos.</p>`})});return r.ok}

function normalizeTeamName(v){
  return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}
function findOrCreateTeam(db,name,logoUrl='',shortName='',providerTeamId=null){
  const key=normalizeTeamName(name);
  const pid=providerTeamId!=null?Number(providerTeamId):null;

  let team=(db.teams||[]).find(t=>{
    if(pid!=null && t.providerTeamId!=null && Number(t.providerTeamId)===pid)return true;
    return normalizeTeamName(t.name)===key;
  });

  if(!team){
    team={
      id:uid('tm_'),
      name,
      shortName:shortName||name.slice(0,30),
      logoUrl:logoUrl||'',
      providerTeamId:pid,
      logoSource:logoUrl?'provider':''
    };
    db.teams.push(team);
  }else{
    if(name) team.name=name;
    if(shortName) team.shortName=shortName;
    if(pid!=null) team.providerTeamId=pid;
    if(logoUrl && !team.logoUrl){
      team.logoUrl=logoUrl;
      team.logoSource='provider';
    }
  }

  return team;
}
function findOrCreateSport(db,name){
  let x=(db.sports||[]).find(s=>normalizeTeamName(s.name)===normalizeTeamName(name));
  if(!x){x={id:uid('sp_'),name};db.sports.push(x)}
  return x;
}
function findOrCreateLeague(db,name,country,sportId){
  let x=(db.leagues||[]).find(l=>l.sportId===sportId&&normalizeTeamName(l.name)===normalizeTeamName(name));
  if(!x){x={id:uid('lg_'),sportId,name,country:country||''};db.leagues.push(x)}
  return x;
}
function matchLocalEvent(db,fixture){
  const providerId=String(fixture.providerEventId||'');
  if(providerId){
    const exact=(db.events||[]).find(e=>String(e.providerEventId||'')===providerId);
    if(exact)return exact;
  }
  const hn=normalizeTeamName(fixture.homeName), an=normalizeTeamName(fixture.awayName);
  const target=Date.parse(fixture.startTime||'');
  return (db.events||[]).find(e=>{
    const h=db.teams.find(t=>t.id===e.homeTeamId), a=db.teams.find(t=>t.id===e.awayTeamId);
    if(normalizeTeamName(h?.name)!==hn || normalizeTeamName(a?.name)!==an)return false;
    const dt=Math.abs((Date.parse(e.startTime)-target)/60000);
    return Number.isFinite(dt) && dt<=180;
  })||null;
}
async function resolveSecondaryTeamLogo(team){
  if(!team || team.logoUrl) return team?.logoUrl||'';
  const key=normalizeTeamName(team.name);
  if(!key) return '';
  const cached=sportsLogoCache.get(key);
  if(cached && cached.expiresAt>Date.now()) return cached.logo;
  try{
    const url=`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(team.name)}`;
    const r=await timeoutFetch(url,{headers:{Accept:'application/json'}},6000);
    const p=await r.json().catch(()=>({}));
    const candidates=Array.isArray(p?.teams)?p.teams:[];
    const exact=candidates.find(x=>normalizeTeamName(x?.strTeam)===key) || candidates.find(x=>normalizeTeamName(x?.strTeam||'').includes(key)||key.includes(normalizeTeamName(x?.strTeam||'')));
    const logo=String(exact?.strBadge||exact?.strLogo||'').trim();
    sportsLogoCache.set(key,{logo,expiresAt:Date.now()+7*86400000});
    if(logo){team.logoUrl=logo;team.logoSource='thesportsdb';return logo;}
  }catch{}
  sportsLogoCache.set(key,{logo:'',expiresAt:Date.now()+6*3600000});
  return '';
}

async function ensureSportsSync({force=false}={}){
  const now=Date.now();
  if(!force && now-sportsSyncAt<30000) return {synced:false};
  if(sportsSyncPromise) return sportsSyncPromise;
  if(!process.env.API_FOOTBALL_KEY && !process.env.SPORTS_SYNC_URL) return {synced:false,reason:'provider-not-configured'};
  sportsSyncPromise=syncSportsAndSettle().then(result=>{sportsSyncAt=Date.now();return {synced:true,...result}}).catch(err=>({synced:false,error:String(err?.message||err)})).finally(()=>{sportsSyncPromise=null});
  return sportsSyncPromise;
}

async function hydrateMissingLogosForVisibleEvents(db, limit=16){
  db.teams=db.teams||[];
  const ids=new Set();
  const events=(db.events||[]).slice().sort((a,b)=>sportsPriority(sportsEventView(db,b))-sportsPriority(sportsEventView(db,a))).slice(0,Math.max(1,Math.ceil(limit/2)));
  events.forEach(e=>{ids.add(e.homeTeamId);ids.add(e.awayTeamId)});
  const missing=[...ids].map(id=>db.teams.find(t=>t.id===id)).filter(Boolean).filter(t=>!t.logoUrl).slice(0,limit);
  if(!missing.length) return false;
  let changed=false;
  for(let i=0;i<missing.length;i+=4){
    const batch=missing.slice(i,i+4);
    const results=await Promise.all(batch.map(resolveSecondaryTeamLogo));
    if(results.some(Boolean)) changed=true;
  }
  if(changed) await dbStore.write(db);
  return changed;
}

function sportsEventView(db,e){
  const home=(db.teams||[]).find(t=>t.id===e.homeTeamId)||{}, away=(db.teams||[]).find(t=>t.id===e.awayTeamId)||{}, league=(db.leagues||[]).find(l=>l.id===e.leagueId)||{};
  const last=Array.isArray(e.providerEvents)?e.providerEvents[e.providerEvents.length-1]:null;
  return {id:e.id,sport:e.sportId?(db.sports||[]).find(s=>s.id===e.sportId)?.name||'Futebol':'Futebol',league:league.name||'Futebol',country:league.country||'Internacional',home:home.name||'Casa',away:away.name||'Fora',homeShortName:home.shortName||home.name||'Casa',awayShortName:away.shortName||away.name||'Fora',homeLogo:home.logoUrl||'',awayLogo:away.logoUrl||'',homeTeamId:home.providerTeamId||home.id,awayTeamId:away.providerTeamId||away.id,homeScore:e.homeScore??null,awayScore:e.awayScore??null,minute:last?.minute??null,startTime:e.startTime,status:e.status,rawState:e.rawState||'',providerEventId:e.providerEventId||''};
}

function sportsPriority(g){
  const league=normalizeTeamName(g.league||'');
  const weights=[['champions league',1000],['brasileirao',950],['premier league',900],['la liga',850],['serie a',800],['bundesliga',750],['nba',700],['grand slam',650],['wimbledon',640],['us open',630],['roland garros',620],['australian open',610]];
  const match=weights.find(([k])=>league.includes(normalizeTeamName(k)));
  const leagueScore=match?match[1]:300;
  const statusScore=g.status==='live'?5000:g.status==='scheduled'?1000:g.status==='finished'?100:0;
  const start=Date.parse(g.startTime||'');
  const proximity=Number.isFinite(start)?Math.max(0,100-Math.min(100,Math.abs(start-Date.now())/3600000*20)):0;
  return statusScore+leagueScore+proximity;
}

function sortFeedGames(games){return games.slice().sort((a,b)=>sportsPriority(b)-sportsPriority(a));}

async function syncSportsAndSettle(){
  const db=await dbStore.read(); db.sports=db.sports||[]; db.leagues=db.leagues||[]; db.teams=db.teams||[]; db.events=db.events||[]; db.predictions=db.predictions||[]; db.predictionSlips=db.predictionSlips||[]; db.notifications=db.notifications||[];
  const days=Math.max(1,Math.min(7,Number(process.env.SPORTS_SYNC_DAYS||2)));
  const start=new Date(); start.setHours(0,0,0,0); const end=new Date(Date.now()+days*86400000);
  const {provider,fixtures}=await fetchProviderFixtures({token:process.env.API_FOOTBALL_KEY,startDate:start,endDate:end,timeoutMs:Number(process.env.SPORTS_SYNC_TIMEOUT_MS||10000)});
  let created=0,updated=0,settled=0,unresolved=0;
  for(const f of fixtures){
    const sport=findOrCreateSport(db,f.sportName||'Futebol');
    const league=findOrCreateLeague(db,f.leagueName||'Sem competição',f.leagueCountry||'',sport.id);
    const home=findOrCreateTeam(db,f.homeName,f.homeLogo||'',f.homeShortName||'',f.homeTeamId||null), away=findOrCreateTeam(db,f.awayName,f.awayLogo||'',f.awayShortName||'',f.awayTeamId||null);
    let e=matchLocalEvent(db,f);
    if(!e){e={id:uid('ev_'),sportId:sport.id,leagueId:league.id,homeTeamId:home.id,awayTeamId:away.id,startTime:f.startTime,status:f.status,homeScore:f.homeScore,awayScore:f.awayScore,minute:f.minute??null,providerEventId:f.providerEventId,resultSource:provider,resultSourceVersion:f.providerVersion||'v3',resultReceivedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),stats:f.stats||{},halfTimeHomeScore:f.halfTimeHomeScore??null,halfTimeAwayScore:f.halfTimeAwayScore??null,providerName:provider,providerEvents:f.events||[]};db.events.push(e);created++}
    else {
     e.homeTeamId=home.id;
     e.awayTeamId=away.id;
     home.providerTeamId=f.homeTeamId??home.providerTeamId??null;
     away.providerTeamId=f.awayTeamId??away.providerTeamId??null;
     e.minute=f.minute??null;
     e.providerEventId=f.providerEventId||e.providerEventId; e.startTime=f.startTime||e.startTime; e.status=f.status; e.homeScore=f.homeScore; e.awayScore=f.awayScore; e.resultSource=provider; e.resultSourceVersion=f.providerVersion||'v3'; e.stats=f.stats||e.stats||{}; e.halfTimeHomeScore=f.halfTimeHomeScore??e.halfTimeHomeScore??null; e.halfTimeAwayScore=f.halfTimeAwayScore??e.halfTimeAwayScore??null; e.providerEvents=f.events||e.providerEvents||[]; e.providerName=provider; e.resultReceivedAt=new Date().toISOString(); e.updatedAt=e.resultReceivedAt; updated++;
    }
    if(e.status==='finished'||e.status==='cancelled'){
      const pendingForEvent=db.predictions.filter(p=>p.eventId===e.id&&p.result==='pending');
      const needsPlayers=pendingForEvent.some(p=>String(p.type||'').startsWith('player_'));
      if(needsPlayers && e.status==='finished' && e.providerEventId && provider==='api-football' && !Array.isArray(e.playerStats)){
        try{e.playerStats=await fetchApiFootballFixturePlayers({token:process.env.API_FOOTBALL_KEY,fixtureId:e.providerEventId,timeoutMs:Number(process.env.SPORTS_SYNC_TIMEOUT_MS||10000)});e.playerStatsReceivedAt=new Date().toISOString();e.playerStatsSource='api-football';}
        catch(err){e.playerStatsError=String(err.message||err).slice(0,240);}
      }
      for(const p of pendingForEvent){
        const outcome=settlePrediction(p,e,{homeName:home.name,awayName:away.name});
        if(outcome.result==='pending'){unresolved++;continue}
        p.result=outcome.result;p.settledAt=new Date().toISOString();p.settlementReason=outcome.reason;settled++;
        const n={id:uid('n_'),userId:p.userId,text:`${outcome.result==='won'?'🟢 Bateu':'🔴 Não bateu'}: ${p.selection} — ${home.name} x ${away.name} (${e.homeScore} x ${e.awayScore}).`,kind:'prediction_result',predictionId:p.id,read:false,createdAt:new Date().toISOString(),details:{eventId:e.id,selection:p.selection,result:p.result,reason:p.settlementReason,homeScore:e.homeScore,awayScore:e.awayScore}};
        db.notifications.unshift(n);emit(p.userId,'notification',n);
      }
      for(const slip of db.predictionSlips){if(slip.predictionIds?.length){refreshPredictionSlip(slip,db.predictions)}}
    }
  }
  await dbStore.write(db);
  return {provider,fixtures:fixtures.length,created,updated,settled,unresolved,updatedAt:new Date().toISOString()};
}

async function api(req,res,url){
  if(req.method==='OPTIONS')return send(res,204,'',{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS'});
  const user=await authUser(req);
  if(url.pathname==='/api/health'&&req.method==='GET')return send(res,200,{ok:true,version:'0.31.0',realtime:true,database:dbStore.getMode(),oauth:Boolean(process.env.GOOGLE_CLIENT_ID),time:new Date().toISOString()});
  if(url.pathname==='/api/ready'&&req.method==='GET'){try{const check=await dbStore.check();return send(res,check.ok?200:503,{ok:check.ok,version:'0.31.0',database:check.mode,...check})}catch(e){return send(res,503,{ok:false,error:'Banco indisponível'})}}
  if(url.pathname==='/api/auth/password-strength'&&req.method==='POST'){const b=await body(req);return send(res,200,{score:passwordStrength(String(b.password||'')),max:5})}
  if(url.pathname==='/api/auth/google'&&req.method==='GET'){
    if(!process.env.GOOGLE_CLIENT_ID||!process.env.GOOGLE_CLIENT_SECRET)return send(res,503,{error:'OAuth Google ainda não foi configurado no .env.'});
    const state=crypto.randomBytes(24).toString('hex');oauthStates.set(state,{expiresAt:Date.now()+300000});const redirect=process.env.GOOGLE_REDIRECT_URI||`${PUBLIC_ORIGIN||`http://localhost:${PORT}`}/api/auth/google/callback`;const q=new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,redirect_uri:redirect,response_type:'code',scope:'openid email profile',state,prompt:'select_account'});res.writeHead(302,{Location:'https://accounts.google.com/o/oauth2/v2/auth?'+q});return res.end();
  }
  if(url.pathname==='/api/auth/google/callback'&&req.method==='GET'){
    const st=oauthStates.get(url.searchParams.get('state'));if(!st||st.expiresAt<Date.now())return send(res,400,{error:'Estado OAuth inválido ou expirado.'});oauthStates.delete(url.searchParams.get('state'));
    const code=url.searchParams.get('code');if(!code)return send(res,400,{error:'Autorização Google cancelada.'});
    try{const redirect=process.env.GOOGLE_REDIRECT_URI||`${PUBLIC_ORIGIN||`http://localhost:${PORT}`}/api/auth/google/callback`;const tr=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,redirect_uri:redirect,grant_type:'authorization_code'})});const td=await tr.json();if(!tr.ok)throw new Error('Falha no token Google');const ur=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${td.access_token}`}});const g=await ur.json();if(!g.email)throw new Error('Google não retornou e-mail');const db=await dbStore.read();let u=db.users.find(x=>x.email.toLowerCase()===g.email.toLowerCase());if(!u){let h=(g.email.split('@')[0].replace(/[^a-z0-9._-]/gi,'').slice(0,20)||'googleuser').toLowerCase();while(db.users.some(x=>x.handle==='@'+h))h=h.slice(0,18)+Math.floor(Math.random()*99);u={id:uid('u_'),name:g.name||h,handle:'@'+h,email:g.email,password:hashPassword(crypto.randomBytes(24).toString('hex')),bio:'Membro da comunidade GAMBLY.',followers:0,following:0,posts:0,winRate:0,premium:false,avatar:g.picture||''};db.users.push(u);await dbStore.write(db)}const t=makeSession(u.id);res.writeHead(302,{Location:'/?oauth=success', 'Set-Cookie':cookieSession(t)});return res.end()}catch(e){console.error(e);return send(res,502,{error:'Não foi possível concluir o login com Google.'})}
  }
  if(url.pathname==='/api/auth/login'&&req.method==='POST'){
    if(!rateLimit(req,'login',10,60000))return send(res,429,{error:'Muitas tentativas. Aguarde um minuto.'});const b=await body(req),db=await dbStore.read(),identity=String(b.identity||b.email||'').trim().toLowerCase();const u=db.users.find(x=>x.email.toLowerCase()===identity||String(x.handle||'').replace(/^@/,'').toLowerCase()===identity.replace(/^@/,''));if(!u||!verifyPassword(b.password,u.password))return send(res,401,{error:'E-mail/usuário ou senha inválidos.'});if(!String(u.password).startsWith('pbkdf2$')){u.password=hashPassword(b.password);await dbStore.write(db)}const t=makeSession(u.id);return send(res,200,{token:t,user:safeUser(u)},{'Set-Cookie':cookieSession(t)});
  }
  if(url.pathname==='/api/auth/register'&&req.method==='POST'){
    if(!rateLimit(req,'register',5,60000))return send(res,429,{error:'Muitas tentativas de cadastro. Aguarde um minuto.'});const b=await body(req),db=await dbStore.read();const name=String(b.name||'').trim(),email=String(b.email||'').trim().toLowerCase(),handle=String(b.handle||'').trim().replace(/^@/,'').toLowerCase(),password=String(b.password||'');if(name.length<2)return send(res,400,{error:'Informe seu nome completo.'});if(!/^[a-z0-9._-]{3,24}$/i.test(handle))return send(res,400,{error:'Usuário deve ter 3–24 caracteres.'});if(!/^\S+@\S+\.\S+$/.test(email))return send(res,400,{error:'E-mail inválido.'});if(password.length<8||passwordStrength(password)<3)return send(res,400,{error:'Use uma senha de pelo menos 8 caracteres com letras e números.'});if(db.users.some(u=>u.email.toLowerCase()===email))return send(res,409,{error:'Este e-mail já está cadastrado.'});if(db.users.some(u=>String(u.handle).replace(/^@/,'').toLowerCase()===handle))return send(res,409,{error:'Este usuário já está em uso.'});const u={id:uid('u_'),name,handle:'@'+handle,email,password:hashPassword(password),bio:'Novo membro da comunidade GAMBLY.',followers:0,following:0,posts:0,winRate:0,premium:false};db.users.push(u);await dbStore.write(db);const t=makeSession(u.id);return send(res,201,{token:t,user:safeUser(u)},{'Set-Cookie':cookieSession(t)});
  }
  if(url.pathname==='/api/auth/forgot-password'&&req.method==='POST'){
    if(!rateLimit(req,'forgot',5,60000))return send(res,429,{error:'Aguarde antes de solicitar novamente.'});const b=await body(req),email=String(b.email||'').trim().toLowerCase(),db=await dbStore.read(),u=db.users.find(x=>x.email.toLowerCase()===email);if(!u)return send(res,200,{ok:true,message:'Se o e-mail existir, enviaremos as instruções.'});const raw=crypto.randomBytes(32).toString('hex'),hash=crypto.createHash('sha256').update(raw).digest('hex');db.resetTokens=db.resetTokens.filter(x=>x.expiresAt>Date.now());db.resetTokens.push({id:uid('rt_'),userId:u.id,hash,expiresAt:Date.now()+RESET_TTL,used:false});await dbStore.write(db);const resetUrl=`${PUBLIC_ORIGIN||`http://localhost:${PORT}`}/?reset=${raw}`;const sent=await sendResetEmail(email,resetUrl).catch(()=>false);return send(res,200,{ok:true,message:'Se o e-mail existir, enviaremos as instruções.',...(process.env.NODE_ENV!=='production'&&!sent?{devResetUrl:resetUrl}:{} )});
  }
  if(url.pathname==='/api/auth/reset-password'&&req.method==='POST'){
    const b=await body(req),raw=String(b.token||''),password=String(b.password||''),db=await dbStore.read(),h=crypto.createHash('sha256').update(raw).digest('hex'),rt=db.resetTokens.find(x=>x.hash===h&&!x.used&&x.expiresAt>Date.now());if(!rt)return send(res,400,{error:'Link inválido ou expirado.'});if(password.length<8||passwordStrength(password)<3)return send(res,400,{error:'Senha fraca. Use pelo menos 8 caracteres com letras e números.'});const u=db.users.find(x=>x.id===rt.userId);if(!u)return send(res,400,{error:'Usuário não encontrado.'});u.password=hashPassword(password);rt.used=true;await dbStore.write(db);for(const [k,s] of sessions)if(s.userId===u.id)sessions.delete(k);return send(res,200,{ok:true});
  }
  if(url.pathname==='/api/auth/me'&&req.method==='GET'){if(!user)return send(res,401,{error:'Não autenticado'});return send(res,200,{user:safeUser(user)});}
  if(url.pathname==='/api/auth/logout'&&req.method==='POST'){const h=req.headers.authorization||'';if(h.startsWith('Bearer '))sessions.delete(h.slice(7));const cs=cookies(req);const c=cs.gambly_session||cs.betsocial_session;if(c)sessions.delete(c);return send(res,200,{ok:true},{'Set-Cookie':clearCookie()});}
  if(url.pathname==='/api/realtime/token'&&req.method==='POST'){if(!user)return send(res,401,{error:'Não autenticado'});const t=crypto.randomBytes(24).toString('hex');streamTokens.set(t,{userId:user.id,expiresAt:Date.now()+60000});return send(res,200,{token:t,expiresIn:60});}
  if(url.pathname==='/api/realtime'&&req.method==='GET'){const x=streamTokens.get(url.searchParams.get('token'));if(!x||x.expiresAt<Date.now())return send(res,401,'Unauthorized',{'Content-Type':'text/plain'});streamTokens.delete(url.searchParams.get('token'));res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive'});res.write(`event: connected\ndata: ${JSON.stringify({ok:true})}\n\n`);const c={userId:x.userId,res};sseClients.add(c);const timer=setInterval(()=>{try{res.write(`event: ping\ndata: ${JSON.stringify({time:Date.now()})}\n\n`)}catch{clearInterval(timer);sseClients.delete(c)}},25000);req.on('close',()=>{clearInterval(timer);sseClients.delete(c)});return;}
  if((url.pathname==='/api/sports/live'||url.pathname==='/api/sports/feed')&&req.method==='GET'){
    const sync=await ensureSportsSync();
    const dbLive=await dbStore.read();
    await hydrateMissingLogosForVisibleEvents(dbLive,16);
    const search=String(url.searchParams.get('search')||'').trim().toLowerCase();
    const country=String(url.searchParams.get('country')||'').trim().toLowerCase();
    const leagueFilter=String(url.searchParams.get('league')||'').trim().toLowerCase();
    const sportFilter=String(url.searchParams.get('sport')||'').trim().toLowerCase();
    const statusFilter=String(url.searchParams.get('status')||'all').trim().toLowerCase();
    let games=(dbLive.events||[]).map(e=>sportsEventView(dbLive,e));
    if(statusFilter!=='all')games=games.filter(g=>g.status===statusFilter);
    if(search)games=games.filter(g=>`${g.home} ${g.away} ${g.league} ${g.country}`.toLowerCase().includes(search));
    if(country)games=games.filter(g=>g.country.toLowerCase()===country);
    if(leagueFilter)games=games.filter(g=>g.league.toLowerCase().includes(leagueFilter));
    if(sportFilter)games=games.filter(g=>g.sport.toLowerCase()===sportFilter || (sportFilter==='football'&&normalizeTeamName(g.sport)==='futebol'));
    const order={live:0,scheduled:1,finished:2,cancelled:3};
    games.sort((a,b)=>url.pathname==='/api/sports/feed'?(sportsPriority(b)-sportsPriority(a)):((order[a.status]??9)-(order[b.status]??9)||sportsPriority(b)-sportsPriority(a)));
    if(url.pathname==='/api/sports/feed' && !search && !country && !leagueFilter && !sportFilter && statusFilter==='all') games=games.slice(0,6);
    return send(res,200,{source:sync?.provider||'gambly-db',games,total:games.length,liveCount:(dbLive.events||[]).filter(e=>e.status==='live').length,updatedAt:new Date().toISOString(),sync});
  }

  const eventDetail=url.pathname.match(/^\/api\/events\/([^/]+)$/);
  if(eventDetail&&req.method==='GET'){
    const dbEvents=await dbStore.read(), e=(dbEvents.events||[]).find(x=>x.id===eventDetail[1]);
    if(!e)return send(res,404,{error:'Evento não encontrado.'});
    const summary=eventSummary(dbEvents,e); return send(res,200,{event:{...e,...summary,stats:e.stats||{home:{},away:{}},events:e.providerEvents||[],halfTimeHomeScore:e.halfTimeHomeScore??null,halfTimeAwayScore:e.halfTimeAwayScore??null,venue:e.venue||''}});
  }
  const eventPlayers=url.pathname.match(/^\/api\/events\/([^/]+)\/players$/);
  if(eventPlayers&&req.method==='GET'){
    const dbEvents=await dbStore.read();
    const e=(dbEvents.events||[]).find(x=>x.id===eventPlayers[1]);

    if(!e){
      return send(res,404,{error:'Evento não encontrado.'});
    }

    if(!e.providerEventId){
      return send(res,200,{
        players:[],
        source:'gambly-db',
        available:false,
        message:'Este evento não possui ID do provedor.'
      });
    }

    if(!process.env.API_FOOTBALL_KEY){
      return send(res,503,{
        players:[],
        source:'api-football',
        available:false,
        error:'API_FOOTBALL_KEY não configurada.'
      });
    }

    try{
      const players=await fetchApiFootballFixturePlayers({
        token:process.env.API_FOOTBALL_KEY,
        fixtureId:e.providerEventId,
        timeoutMs:Number(process.env.SPORTS_SYNC_TIMEOUT_MS||10000)
      });

      if(Array.isArray(players)&&players.length>0){
        e.playerStats=players;
        e.playerStatsReceivedAt=new Date().toISOString();
        e.playerStatsSource='api-football';
        e.playerStatsAvailable=true;

        await dbStore.write(dbEvents);

        return send(res,200,{
          players,
          source:'api-football',
          available:true,
          cached:false
        });
      }

      e.playerStatsAvailable=false;
      e.playerStatsLastCheckedAt=new Date().toISOString();
      e.playerStatsSource='api-football';

      await dbStore.write(dbEvents);

      return send(res,200,{
        players:[],
        source:'api-football',
        available:false,
        cached:false,
        message:'Os dados dos jogadores ainda não estão disponíveis para esta partida.'
      });

    }catch(err){
      console.error('Players:',err);

      return send(res,502,{
        players:[],
        source:'api-football',
        available:false,
        error:'Não foi possível carregar os jogadores agora.'
      });
    }
  }

// ===== GAMBLY MVP: eventos, palpites, histórico, estatísticas e ranking =====
  // Administração/resultado: separado da conta comum para evitar que um usuário
  // consiga alterar resultados esportivos. Configure GAMBLY_ADMIN_TOKEN no ambiente.
  const adminAuthorized = () => {
    const configured = String(process.env.GAMBLY_ADMIN_TOKEN || '');
    const provided = String(req.headers['x-admin-token'] || '').trim();
    return Boolean(configured && provided && provided.length === configured.length && crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(configured)));
  };

  // ===== SPRINT 29: Bet Slip Engine + Sports Data =====
  if(url.pathname==='/api/bet-slips/parse'&&req.method==='POST'){
    if(!user)return send(res,401,{error:'Faça login para analisar um bilhete.'});
    const b=await body(req), parsed=parseBetSlipText(b.extractedText||b.text||'');
    return send(res,200,{ok:true,parserVersion:'1.0',...parsed,message:parsed.selections.length?'Revise o jogo correspondente antes de publicar.':'Não foi possível identificar seleções no texto.'});
  }
  if(url.pathname==='/api/admin/sports/sync'&&req.method==='POST'){
    if(!adminAuthorized())return send(res,401,{error:'Token administrativo inválido ou não configurado.'});
    try{return send(res,200,{ok:true,...await syncSportsAndSettle()})}catch(e){console.error('Sports sync:',e);return send(res,502,{ok:false,error:e.message||'Falha ao sincronizar dados esportivos.'})}
  }
  if(url.pathname==='/api/admin/sports/status'&&req.method==='GET'){
    if(!adminAuthorized())return send(res,401,{error:'Token administrativo inválido ou não configurado.'});
    const dbStatus=await dbStore.read();
    return send(res,200,{provider:process.env.SPORTS_PROVIDER||'api-football',configured:Boolean(process.env.API_FOOTBALL_KEY||process.env.SPORTS_SYNC_URL),events:(dbStatus.events||[]).length,pending:(dbStatus.predictions||[]).filter(p=>p.result==='pending').length});
  }

  const adminEventMatch = url.pathname.match(/^\/api\/admin\/events\/([^/]+)\/result$/);
  if (adminEventMatch && req.method === 'POST') {
    if (!adminAuthorized()) return send(res, 401, {error:'Token administrativo inválido ou não configurado.'});
    const dbAdmin = await dbStore.read();
    const event = (dbAdmin.events || []).find(e => e.id === adminEventMatch[1]);
    if (!event) return send(res, 404, {error:'Evento não encontrado.'});
    const b = await body(req);
    const requestedStatus = String(b.status || 'finished').toLowerCase();
    if (!['finished','cancelled'].includes(requestedStatus)) return send(res,400,{error:'Status administrativo deve ser finished ou cancelled.'});
    if (requestedStatus === 'finished') {
      const homeScore = Number(b.homeScore), awayScore = Number(b.awayScore);
      if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) return send(res,400,{error:'Placar inválido.'});
      event.homeScore = homeScore; event.awayScore = awayScore;
    } else { event.homeScore = null; event.awayScore = null; }
    event.status = requestedStatus; event.resultSource = String(b.source || event.resultSource || 'manual_admin').slice(0,80); event.resultSourceVersion = b.sourceVersion == null ? (event.resultSourceVersion || null) : String(b.sourceVersion).slice(0,80); event.resultReceivedAt = new Date().toISOString(); event.updatedAt = event.resultReceivedAt;
    dbAdmin.predictions = dbAdmin.predictions || [];
    const home = (dbAdmin.teams||[]).find(t=>t.id===event.homeTeamId), away=(dbAdmin.teams||[]).find(t=>t.id===event.awayTeamId);
    let settled=0, unresolved=0;
    const affected=[];
    for (const prediction of dbAdmin.predictions) {
      if (prediction.eventId !== event.id || prediction.result !== 'pending') continue;
      const outcome = settlePrediction(prediction,event,{homeName:home?.name,awayName:away?.name});
      if (outcome.result === 'pending') { unresolved++; continue; }
      prediction.result=outcome.result; prediction.settledAt=new Date().toISOString(); prediction.settlementReason=outcome.reason; settled++; affected.push(prediction);
      const n={id:uid('n_'),userId:prediction.userId,text:`Seu palpite foi ${outcome.result==='won'?'vencedor':'encerrado como perdido'} no evento ${home?.name||'Casa'} x ${away?.name||'Fora'}.`,kind:'prediction_result',predictionId:prediction.id,read:false,createdAt:new Date().toISOString()};
      dbAdmin.notifications=dbAdmin.notifications||[]; dbAdmin.notifications.unshift(n); emit(prediction.userId,'notification',n);
    }
    for (const slip of (dbAdmin.predictionSlips || [])) { if ((slip.predictionIds || []).some(id => affected.some(p => p.id === id))) refreshPredictionSlip(slip, dbAdmin.predictions); }
    await dbStore.write(dbAdmin);
    return send(res,200,{ok:true,event,settled,unresolved,predictions:affected.map(p=>({id:p.id,userId:p.userId,result:p.result,settledAt:p.settledAt}))});
  }
  if (url.pathname==='/api/admin/predictions/pending' && req.method==='GET') {
    if (!adminAuthorized()) return send(res,401,{error:'Token administrativo inválido ou não configurado.'});
    const dbAdmin=await dbStore.read();
    const rows=(dbAdmin.predictions||[]).filter(p=>p.result==='pending').map(p=>{const e=(dbAdmin.events||[]).find(x=>x.id===p.eventId);return {...p,event:e||null};});
    return send(res,200,{predictions:rows,total:rows.length});
  }

  if(!user)return send(res,401,{error:'Faça login para continuar.'});
  const db=await dbStore.read();
  // ===== Comunidades =====
  if(url.pathname==='/api/communities'&&req.method==='GET'){
    db.communities=db.communities||[];
    const communities=db.communities.map(c=>({id:c.id,name:c.name,description:c.description||'',ownerId:c.ownerId,membersCount:(c.members||[]).length,settings:c.settings||{},isMember:(c.members||[]).includes(user.id),createdAt:c.createdAt}));
    return send(res,200,{communities});
  }
  if(url.pathname==='/api/communities'&&req.method==='POST'){
    const b=await body(req),name=String(b.name||'').trim(),description=String(b.description||'').trim();
    if(name.length<3||name.length>60)return send(res,400,{error:'O nome da comunidade deve ter entre 3 e 60 caracteres.'});
    db.communities=db.communities||[];
    if(db.communities.some(c=>c.name.toLowerCase()===name.toLowerCase()))return send(res,409,{error:'Já existe uma comunidade com esse nome.'});
    const settings={joinMode:b.joinMode==='approval'?'approval':'auto',postingMode:b.postingMode==='admin'?'admin':'all'};
    const c={id:uid('c_'),name,description:description.slice(0,240),ownerId:user.id,members:[user.id],posts:[],settings,createdAt:new Date().toISOString()};
    db.communities.unshift(c);await dbStore.write(db);return send(res,201,{community:{...c,members:[safeUser(user)]}});
  }
  const communityRoute=url.pathname.match(/^\/api\/communities\/([^/]+)$/);
  if(communityRoute&&req.method==='GET'){
    db.communities=db.communities||[];const c=db.communities.find(x=>x.id===communityRoute[1]);
    if(!c)return send(res,404,{error:'Comunidade não encontrada.'});
    const member=(c.members||[]).includes(user.id), pending=(c.pending||[]).includes(user.id);
    if(!member)return send(res,200,{community:{id:c.id,name:c.name,description:c.description||'',ownerId:c.ownerId,membersCount:(c.members||[]).length,settings:c.settings||{},isMember:false,pending}});
    const members=(c.members||[]).map(id=>db.users.find(u=>u.id===id)).filter(Boolean).map(safeUser);
    return send(res,200,{community:{...c,members,isMember:true,pending:false}});
  }
  const communityJoin=url.pathname.match(/^\/api\/communities\/([^/]+)\/join$/);
  if(communityJoin&&req.method==='POST'){
    db.communities=db.communities||[];const c=db.communities.find(x=>x.id===communityJoin[1]);if(!c)return send(res,404,{error:'Comunidade não encontrada.'});
    c.members=c.members||[];c.pending=c.pending||[];
    if(c.members.includes(user.id))return send(res,200,{status:'member'});
    const mode=(c.settings||{}).joinMode==='approval'?'approval':'auto';
    if(mode==='auto'){c.members.push(user.id);await dbStore.write(db);return send(res,200,{status:'member'});}
    if(!c.pending.includes(user.id))c.pending.push(user.id);
    await dbStore.write(db);
    const owner=db.users.find(u=>u.id===c.ownerId);if(owner){const n={id:uid('n_'),userId:owner.id,text:`${user.name} solicitou entrada na comunidade “${c.name}”.`,kind:'community_request',read:false,createdAt:new Date().toISOString()};db.notifications.unshift(n);await dbStore.write(db);emit(owner.id,'notification',n)}
    return send(res,200,{status:'pending'});
  }
  const communityApprove=url.pathname.match(/^\/api\/communities\/([^/]+)\/requests\/([^/]+)$/);
  if(communityApprove&&req.method==='POST'){
    db.communities=db.communities||[];const c=db.communities.find(x=>x.id===communityApprove[1]);if(!c)return send(res,404,{error:'Comunidade não encontrada.'});
    if(c.ownerId!==user.id)return send(res,403,{error:'Somente o administrador pode aprovar solicitações.'});
    c.pending=(c.pending||[]).filter(id=>id!==communityApprove[2]);c.members=c.members||[];
    if(!c.members.includes(communityApprove[2]))c.members.push(communityApprove[2]);
    await dbStore.write(db);return send(res,200,{status:'member'});
  }
  const communityPost=url.pathname.match(/^\/api\/communities\/([^/]+)\/posts$/);
  if(communityPost&&req.method==='POST'){
    db.communities=db.communities||[];const c=db.communities.find(x=>x.id===communityPost[1]);if(!c)return send(res,404,{error:'Comunidade não encontrada.'});
    if(!(c.members||[]).includes(user.id))return send(res,403,{error:'Você precisa fazer parte da comunidade.'});
    if((c.settings||{}).postingMode==='admin'&&c.ownerId!==user.id)return send(res,403,{error:'Somente o administrador pode publicar nesta comunidade.'});
    const b=await body(req),text=String(b.text||'').trim();if(!text)return send(res,400,{error:'Escreva algo para publicar.'});
    c.posts=c.posts||[];c.posts.unshift({id:uid('cp_'),authorId:user.id,author:user.name,text,createdAt:new Date().toISOString()});await dbStore.write(db);return send(res,201,{ok:true});
  }

  // ===== Grupos Premium =====
  if(url.pathname==='/api/premium/groups'&&req.method==='GET'){
    if(!user)return send(res,401,{error:'Faça login para continuar.'});
    db.groups=db.groups||[];
    const groups=db.groups.filter(g=>g.ownerId===user.id||(g.members||[]).includes(user.id)).map(g=>({id:g.id,name:g.name,description:g.description||'',ownerId:g.ownerId,membersCount:(g.members||[]).length,settings:g.settings||{},createdAt:g.createdAt}));
    return send(res,200,{groups});
  }
  if(url.pathname==='/api/premium/groups'&&req.method==='POST'){
    if(!user.premium)return send(res,403,{error:'A criação de grupos é exclusiva para membros Premium.'});
    const b=await body(req),name=String(b.name||'').trim(),description=String(b.description||'').trim();
    if(name.length<3||name.length>60)return send(res,400,{error:'O nome do grupo deve ter entre 3 e 60 caracteres.'});
    db.groups=db.groups||[];
    const settings={joinMode:b.joinMode==='approval'?'approval':'invite',postingMode:b.postingMode==='admin'?'admin':'all'}; const g={id:uid('g_'),name,description:description.slice(0,240),ownerId:user.id,members:[user.id],pending:[],posts:[],settings,createdAt:new Date().toISOString()};
    db.groups.unshift(g);await dbStore.write(db);return send(res,201,{group:{...g,members:[safeUser(user)]}});
  }
  const groupRoute=url.pathname.match(/^\/api\/premium\/groups\/([^/]+)$/);
  if(groupRoute&&req.method==='GET'){
    if(!user)return send(res,401,{error:'Faça login para continuar.'});
    db.groups=db.groups||[];const g=db.groups.find(x=>x.id===groupRoute[1]);
    if(!g)return send(res,404,{error:'Grupo não encontrado.'});
    if(!(g.members||[]).includes(user.id))return send(res,403,{error:'Você não faz parte deste grupo.'});
    const members=(g.members||[]).map(id=>db.users.find(u=>u.id===id)).filter(Boolean).map(safeUser);
    return send(res,200,{group:{id:g.id,name:g.name,description:g.description||'',ownerId:g.ownerId,createdAt:g.createdAt,members,posts:g.posts||[],settings:g.settings||{},pending:(g.pending||[]).length,pendingMembers:(g.pending||[]).map(id=>db.users.find(u=>u.id===id)).filter(Boolean).map(safeUser)}});
  }
  const premiumJoin=url.pathname.match(/^\/api\/premium\/groups\/([^/]+)\/join$/);
  if(premiumJoin&&req.method==='POST'){
    db.groups=db.groups||[];const g=db.groups.find(x=>x.id===premiumJoin[1]);if(!g)return send(res,404,{error:'Grupo não encontrado.'});
    g.members=g.members||[];g.pending=g.pending||[];
    if(g.members.includes(user.id))return send(res,200,{status:'member'});
    if((g.settings||{}).joinMode!=='approval')return send(res,403,{error:'Este grupo Premium aceita somente convites do administrador.'});
    if(!g.pending.includes(user.id))g.pending.push(user.id);await dbStore.write(db);
    const owner=db.users.find(u=>u.id===g.ownerId);if(owner){const n={id:uid('n_'),userId:owner.id,text:`${user.name} solicitou entrada no grupo Premium “${g.name}”.`,kind:'premium_group_request',read:false,createdAt:new Date().toISOString()};db.notifications.unshift(n);await dbStore.write(db);emit(owner.id,'notification',n)}
    return send(res,200,{status:'pending'});
  }
  const premiumApprove=url.pathname.match(/^\/api\/premium\/groups\/([^/]+)\/requests\/([^/]+)$/);
  if(premiumApprove&&req.method==='POST'){
    db.groups=db.groups||[];const g=db.groups.find(x=>x.id===premiumApprove[1]);if(!g)return send(res,404,{error:'Grupo não encontrado.'});
    if(g.ownerId!==user.id)return send(res,403,{error:'Somente o dono pode aprovar solicitações.'});
    g.pending=(g.pending||[]).filter(id=>id!==premiumApprove[2]);g.members=g.members||[];if(!g.members.includes(premiumApprove[2]))g.members.push(premiumApprove[2]);
    await dbStore.write(db);return send(res,200,{status:'member'});
  }
  const premiumSettings=url.pathname.match(/^\/api\/premium\/groups\/([^/]+)\/settings$/);
  if(premiumSettings&&req.method==='PATCH'){
    db.groups=db.groups||[];const g=db.groups.find(x=>x.id===premiumSettings[1]);if(!g)return send(res,404,{error:'Grupo não encontrado.'});
    if(g.ownerId!==user.id)return send(res,403,{error:'Somente o dono pode alterar as configurações.'});
    const b=await body(req);g.settings={joinMode:b.joinMode==='approval'?'approval':'invite',postingMode:b.postingMode==='admin'?'admin':'all'};await dbStore.write(db);return send(res,200,{settings:g.settings});
  }
  const membersRoute=url.pathname.match(/^\/api\/premium\/groups\/([^/]+)\/members$/);
  if(membersRoute&&req.method==='POST'){
    if(!user.premium)return send(res,403,{error:'Área exclusiva para membros Premium.'});
    db.groups=db.groups||[];const g=db.groups.find(x=>x.id===membersRoute[1]);if(!g)return send(res,404,{error:'Grupo não encontrado.'});
    if(g.ownerId!==user.id)return send(res,403,{error:'Somente o criador do grupo pode adicionar membros.'});
    const b=await body(req),identity=String(b.identity||b.handle||b.email||'').trim().toLowerCase();
    const target=db.users.find(u=>u.email.toLowerCase()===identity||String(u.handle||'').replace(/^@/,'').toLowerCase()===identity.replace(/^@/,''));
    if(!target)return send(res,404,{error:'Usuário não encontrado.'});
    if(!g.members.includes(target.id))g.members.push(target.id);
    await dbStore.write(db);
    const n={id:uid('n_'),userId:target.id,text:`Você foi adicionado ao grupo Premium “${g.name}”.`,kind:'premium_group',read:false,createdAt:new Date().toISOString()};db.notifications.unshift(n);await dbStore.write(db);emit(target.id,'notification',n);
    return send(res,200,{member:safeUser(target),groupId:g.id});
  }
  const postsRoute=url.pathname.match(/^\/api\/premium\/groups\/([^/]+)\/posts$/);
  if(postsRoute&&req.method==='POST'){
    if(!user)return send(res,401,{error:'Faça login para continuar.'});
    db.groups=db.groups||[];const g=db.groups.find(x=>x.id===postsRoute[1]);if(!g)return send(res,404,{error:'Grupo não encontrado.'});
    if(!(g.members||[]).includes(user.id))return send(res,403,{error:'Você não faz parte deste grupo.'});
    if((g.settings||{}).postingMode==='admin'&&g.ownerId!==user.id)return send(res,403,{error:'Somente o dono pode publicar neste grupo.'});
    const b=await body(req),title=String(b.title||'').trim(),text=String(b.text||'').trim(),platform=String(b.platform||'').trim(),platformUrl=String(b.platformUrl||'').trim();
    if(!title||!text)return send(res,400,{error:'Informe o título e a análise da aposta.'});
    if(platformUrl && !/^https?:\/\//i.test(platformUrl))return send(res,400,{error:'O link da plataforma deve começar com http:// ou https://.'});
    const post={id:uid('gp_'),authorId:user.id,author:user.name,title,text,odd:Number(b.odd||0),platform,platformUrl,createdAt:new Date().toISOString()};
    g.posts=g.posts||[];g.posts.unshift(post);await dbStore.write(db);
    for(const memberId of g.members){if(memberId===user.id)continue;const n={id:uid('n_'),userId:memberId,text:`${user.name} compartilhou uma aposta no grupo “${g.name}”.`,kind:'premium_group',read:false,createdAt:new Date().toISOString()};db.notifications.unshift(n);emit(memberId,'notification',n)}
    await dbStore.write(db);return send(res,201,{post});
  }

  if(url.pathname==='/api/events'&&req.method==='GET'){
    const events=(db.events||[]).map(e=>{
      const sport=(db.sports||[]).find(s=>s.id===e.sportId);
      const league=(db.leagues||[]).find(l=>l.id===e.leagueId);
      const home=(db.teams||[]).find(t=>t.id===e.homeTeamId);
      const away=(db.teams||[]).find(t=>t.id===e.awayTeamId);
      return {...e,sport:sport?.name||'',league:league?.name||'',homeTeam:home?.name||'Casa',awayTeam:away?.name||'Fora'};
    }).sort((a,b)=>new Date(a.startTime)-new Date(b.startTime));
    return send(res,200,{events});
  }
  if(url.pathname==='/api/predictions'&&req.method==='POST'){
    if(!user)return send(res,401,{error:'Faça login para criar um palpite.'});
    if(!rateLimit(req,'prediction-create',30,60000))return send(res,429,{error:'Muitos palpites em pouco tempo. Aguarde.'});
    const b=await body(req), eventId=String(b.eventId||''), type=String(b.type||'winner');
    const selection=String(b.selection||'').trim(), odds=b.odds==null?null:Number(b.odds);
    const event=(db.events||[]).find(e=>e.id===eventId);
    const allowed=['winner','draw','double_chance','over_under','both_teams_score','exact_score','first_half_winner','corners_over_under','cards_over_under','shots_on_target_over_under','total_shots_over_under','offsides_over_under','fouls_over_under','team_goals_over_under','player_anytime_score','player_goals','player_assists','player_shots_on_target','player_shots','player_to_be_booked','player_cards','player_red_cards','player_passes','player_tackles','player_fouls'];
    if(!event)return send(res,404,{error:'Evento não encontrado.'});
    if(!allowed.includes(type))return send(res,400,{error:'Tipo de palpite inválido.'});
    if(!selection)return send(res,400,{error:'Informe sua seleção.'});
    if(type.startsWith('player_') && !String(b.playerName||'').trim() && !String(b.playerId||'').trim())return send(res,400,{error:'Escolha um jogador para este mercado.'});
    if(odds!==null && (!Number.isFinite(odds)||odds<=0||odds>9999))return send(res,400,{error:'Odd inválida.'});
    db.predictions=db.predictions||[];
    const existing=db.predictions.find(p=>p.userId===user.id&&p.eventId===eventId&&p.result==='pending');
    if(existing)return send(res,409,{error:'Você já possui um palpite pendente para este evento.'});
    const prediction={id:uid('pr_'),userId:user.id,eventId,type,selection,odds,result:'pending',playerName:b.playerName||null,playerId:b.playerId||null,createdAt:new Date().toISOString(),settledAt:null,settlementReason:null};
    db.predictions.unshift(prediction);
    await dbStore.write(db);
    return send(res,201,{prediction});
  }
  if(url.pathname==='/api/prediction-slips'&&req.method==='POST'){
    if(!user)return send(res,401,{error:'Faça login para criar um palpite múltiplo.'});
    if(!rateLimit(req,'prediction-slip-create',10,60000))return send(res,429,{error:'Muitos palpites múltiplos em pouco tempo. Aguarde.'});
    const b=await body(req), raw=Array.isArray(b.items)?b.items:[];
    if(raw.length<2||raw.length>10)return send(res,400,{error:'Um palpite múltiplo precisa ter entre 2 e 10 seleções.'});
    db.predictions=db.predictions||[]; db.predictionSlips=db.predictionSlips||[];
    const seenEvents=new Set(), items=[];
    const allowed=['winner','draw','double_chance','over_under','both_teams_score','exact_score','first_half_winner','corners_over_under','cards_over_under','shots_on_target_over_under','total_shots_over_under','offsides_over_under','fouls_over_under','team_goals_over_under','player_anytime_score','player_goals','player_assists','player_shots_on_target','player_shots','player_to_be_booked','player_cards','player_red_cards','player_passes','player_tackles','player_fouls'];
    for(const item of raw){
      const eventId=String(item?.eventId||''), type=String(item?.type||'winner'), selection=String(item?.selection||'').trim();
      if(!eventId||!selection)return send(res,400,{error:'Todas as seleções precisam de jogo e seleção.'});
      if(seenEvents.has(eventId))return send(res,400,{error:'Cada jogo só pode aparecer uma vez no mesmo palpite múltiplo.'});
      seenEvents.add(eventId);
      const event=(db.events||[]).find(e=>e.id===eventId);
      if(!event)return send(res,404,{error:`Evento não encontrado: ${eventId}.`});
      if(!allowed.includes(type))return send(res,400,{error:'Tipo de palpite inválido.'});
      if(type.startsWith('player_') && !String(item.playerName||'').trim() && !String(item.playerId||'').trim())return send(res,400,{error:'Escolha um jogador para cada mercado de jogador.'});
      const odds=item.odds==null?null:Number(item.odds);
      if(odds!==null&&(!Number.isFinite(odds)||odds<=0||odds>9999))return send(res,400,{error:'Odd inválida.'});
      if(db.predictions.some(p=>p.userId===user.id&&p.eventId===eventId&&p.result==='pending'))return send(res,409,{error:'Você já possui um palpite pendente para um dos jogos selecionados.'});
      items.push({eventId,type,selection,odds});
    }
    const slipId=uid('ps_'), now=new Date().toISOString(), predictions=[];
    const slip={id:slipId,userId:user.id,title:String(b.title||'Palpite múltiplo').trim().slice(0,120)||'Palpite múltiplo',result:'pending',predictionIds:[],createdAt:now,settledAt:null};
    for(const item of items){const prediction={id:uid('pr_'),userId:user.id,eventId:item.eventId,slipId,type:item.type,selection:item.selection,odds:item.odds,result:'pending',playerName:item.playerName||null,playerId:item.playerId||null,createdAt:now,settledAt:null,settlementReason:null};predictions.push(prediction);slip.predictionIds.push(prediction.id);db.predictions.unshift(prediction);}
    db.predictionSlips.unshift(slip); await dbStore.write(db);
    return send(res,201,{slip,predictions});
  }
  const slipMine=url.pathname.match(/^\/api\/prediction-slips\/mine$/);
  if(slipMine&&req.method==='GET'){
    if(!user)return send(res,401,{error:'Faça login para consultar seus palpites múltiplos.'});
    db.predictionSlips=db.predictionSlips||[]; const filter=String(url.searchParams.get('result')||'all');
    const mine=db.predictionSlips.filter(s=>s.userId===user.id&&(filter==='all'||s.result===filter)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    mine.forEach(s=>refreshPredictionSlip(s,db.predictions||[]));
    return send(res,200,{slips:mine});
  }
  const slipRoute=url.pathname.match(/^\/api\/prediction-slips\/([^/]+)$/);
  if(slipRoute&&req.method==='GET'){
    if(!user)return send(res,401,{error:'Faça login para consultar o palpite múltiplo.'});
    db.predictionSlips=db.predictionSlips||[]; const slip=db.predictionSlips.find(x=>x.id===slipRoute[1]);
    if(!slip)return send(res,404,{error:'Palpite múltiplo não encontrado.'});
    if(slip.userId!==user.id)return send(res,403,{error:'Você não pode consultar este palpite.'});
    refreshPredictionSlip(slip,db.predictions||[]);
    const predictions=(db.predictions||[]).filter(p=>slip.predictionIds.includes(p.id));
    return send(res,200,{slip,predictions});
  }
    const mineMatch=url.pathname.match(/^\/api\/predictions\/mine$/);
  if(mineMatch&&req.method==='GET'){
    if(!user)return send(res,401,{error:'Faça login para consultar seu histórico.'});
    const filter=String(url.searchParams.get('result')||'all');
    const mine=(db.predictions||[]).filter(p=>p.userId===user.id&&(filter==='all'||p.result===filter)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const enriched=mine.map(p=>{
      const e=(db.events||[]).find(x=>x.id===p.eventId)||{};
      const home=(db.teams||[]).find(t=>t.id===e.homeTeamId), away=(db.teams||[]).find(t=>t.id===e.awayTeamId);
      return {...p,event:e,homeTeam:home?.name||'',awayTeam:away?.name||''};
    });
    return send(res,200,{predictions:enriched});
  }
  if(url.pathname==='/api/stats/me'&&req.method==='GET'){
    if(!user)return send(res,401,{error:'Faça login para ver suas estatísticas.'});
    const mine=(db.predictions||[]).filter(p=>p.userId===user.id);
    const won=mine.filter(p=>p.result==='won').length,lost=mine.filter(p=>p.result==='lost').length,pending=mine.filter(p=>p.result==='pending').length,voided=mine.filter(p=>p.result==='void').length,total=mine.length,settled=won+lost;
    const winRate=settled?Number((won/settled*100).toFixed(1)):0;
    let profit=0, stakeCount=0;
    for(const p of mine){if(p.result==='won'&&Number(p.odds)>0){profit+=Number(p.odds)-1;stakeCount++}else if(p.result==='lost'){profit-=1;stakeCount++}}
    const roi=stakeCount?Number((profit/stakeCount*100).toFixed(1)):0;
    let streak=0;
    for(const p of mine.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))){if(p.result==='won')streak++;else break}
    return send(res,200,{stats:{total,won,lost,pending,voided,settled,winRate,roi,streak}});
  }
  if(url.pathname==='/api/ranking'&&req.method==='GET'){
    const period=String(url.searchParams.get('period')||'all');
    const now=Date.now(), days=period==='week'?7:period==='month'?30:null;
    const cutoff=days?now-days*86400000:0;
    const users=db.users||[], rows=[];
    for(const u of users){
      const ps=(db.predictions||[]).filter(p=>p.userId===u.id&&(!cutoff||new Date(p.createdAt).getTime()>=cutoff));
      const won=ps.filter(p=>p.result==='won').length,lost=ps.filter(p=>p.result==='lost').length,pending=ps.filter(p=>p.result==='pending').length,total=ps.length,settled=won+lost;
      if(total===0)continue;
      const winRate=settled?won/settled*100:0;
      let profit=0,stakeCount=0;
      for(const p of ps){if(p.result==='won'&&Number(p.odds)>0){profit+=Number(p.odds)-1;stakeCount++}else if(p.result==='lost'){profit-=1;stakeCount++}}
      const roi=stakeCount?profit/stakeCount*100:0;
      if(settled===0)continue; rows.push({userId:u.id,name:u.name,handle:u.handle,avatar:u.avatar||'',total,settled,pending,won,lost,winRate:Number(winRate.toFixed(1)),roi:Number(roi.toFixed(1))});
    }
    rows.sort((a,b)=>b.winRate-a.winRate || b.roi-a.roi || b.won-a.won);
    return send(res,200,{ranking:rows.slice(0,100).map((x,i)=>({...x,rank:i+1}))});
  }
  if(url.pathname==='/api/profile'&&req.method==='GET')return send(res,200,{user:safeUser(user)});
  if(url.pathname==='/api/profile'&&req.method==='PATCH'){if(!user)return send(res,401,{error:'Não autenticado'});if(!rateLimit(req,'profile-update',20,60000))return send(res,429,{error:'Muitas alterações de perfil. Aguarde um minuto.'});
    const b=await body(req);
    if(b.name!==undefined){const name=String(b.name).trim();if(name.length<2)return send(res,400,{error:'Nome inválido.'});user.name=name}
    if(b.handle!==undefined){const handle=String(b.handle).trim().replace(/^@/,'').toLowerCase();if(!/^[a-z0-9._-]{3,24}$/i.test(handle))return send(res,400,{error:'Usuário deve ter 3–24 caracteres.'});if(db.users.some(x=>x.id!==user.id&&String(x.handle).replace(/^@/,'').toLowerCase()===handle))return send(res,409,{error:'Este usuário já está em uso.'});user.handle='@'+handle}
    if(b.bio!==undefined)user.bio=String(b.bio).trim().slice(0,280);
    if(b.avatar!==undefined){
      const avatar=String(b.avatar||'');
      if(avatar && !/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/i.test(avatar))return send(res,400,{error:'Imagem de avatar inválida.'});
      if(avatar.length>900000)return send(res,413,{error:'Imagem muito grande. Escolha uma imagem menor.'});
      user.avatar=avatar;
    }
    await dbStore.write(db);return send(res,200,{user:safeUser(user)});
  }
  if(url.pathname==='/api/users'&&req.method==='GET'){const q=String(url.searchParams.get('q')||'').toLowerCase();const users=db.users.filter(x=>x.id!==user.id&&(!q||x.name.toLowerCase().includes(q)||x.handle.toLowerCase().includes(q))).slice(0,30).map(safeUser);return send(res,200,{users});}
  const follow=url.pathname.match(/^\/api\/users\/([^/]+)\/follow$/);if(follow&&req.method==='POST'){if(!user)return send(res,401,{error:'Não autenticado'});if(!rateLimit(req,'follow',40,60000))return send(res,429,{error:'Muitas ações de seguir. Aguarde um minuto.'});const target=db.users.find(x=>x.id===follow[1]);if(!target||target.id===user.id)return send(res,400,{error:'Usuário inválido.'});db.follows=db.follows||[];const idx=db.follows.findIndex(f=>f.followerId===user.id&&f.followingId===target.id);if(idx>=0){db.follows.splice(idx,1);target.followers=Math.max(0,(target.followers||0)-1);user.following=Math.max(0,(user.following||0)-1);await dbStore.write(db);emit(target.id,'follow',{from:user.id,following:false});return send(res,200,{following:false,followers:target.followers})}db.follows.push({id:uid('f_'),followerId:user.id,followingId:target.id,createdAt:new Date().toISOString()});target.followers=(target.followers||0)+1;user.following=(user.following||0)+1;await dbStore.write(db);emit(target.id,'follow',{from:user.id,following:true});return send(res,200,{following:true,followers:target.followers});}
  if(url.pathname==='/api/network'&&req.method==='GET'){const following=new Set((db.follows||[]).filter(f=>f.followerId===user.id).map(f=>f.followingId));const followers=new Set((db.follows||[]).filter(f=>f.followingId===user.id).map(f=>f.followerId));const users=db.users.filter(x=>x.id!==user.id).slice(0,100).map(u=>({...safeUser(u),following:following.has(u.id),followsYou:followers.has(u.id)}));return send(res,200,{users,followers:followers.size,following:following.size});}
  const userRoute=url.pathname.match(/^\/api\/users\/([^/]+)$/);if(userRoute&&req.method==='GET'){const target=db.users.find(x=>x.id===userRoute[1]);if(!target)return send(res,404,{error:'Usuário não encontrado'});const following=(db.follows||[]).some(f=>f.followerId===user.id&&f.followingId===target.id);const followsYou=(db.follows||[]).some(f=>f.followerId===target.id&&f.followingId===user.id);const posts=db.posts.filter(p=>p.authorId===target.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,30).map(p=>publicPost(p,db,user?.id||''));return send(res,200,{user:{...safeUser(target),following,followsYou},posts});}
  if(url.pathname==='/api/feed'&&req.method==='GET'){
    db.follows=db.follows||[];
    const following=new Set(db.follows.filter(f=>f.followerId===user.id).map(f=>f.followingId));
    const all=db.posts.filter(p=>p.authorId===user.id||following.has(p.authorId)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const limit=Math.min(Math.max(Number(url.searchParams.get('limit')||10),1),30),offset=Math.max(Number(url.searchParams.get('offset')||0),0);
    const posts=all.slice(offset,offset+limit).map(p=>publicPost(p,db,user?.id||''));
    return send(res,200,{posts,following:following.size,total:all.length,hasMore:offset+limit<all.length,nextOffset:offset+limit});
  }
  if(url.pathname==='/api/posts'&&req.method==='GET'){
    const all=db.posts.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const limit=Math.min(Math.max(Number(url.searchParams.get('limit')||20),1),50),offset=Math.max(Number(url.searchParams.get('offset')||0),0);
    const posts=all.slice(offset,offset+limit).map(p=>publicPost(p,db,user?.id||''));
    return send(res,200,{posts,total:all.length,hasMore:offset+limit<all.length,nextOffset:offset+limit});
  }
  if(url.pathname==='/api/search'&&req.method==='GET'){
    const q=String(url.searchParams.get('q')||'').trim().toLowerCase();
    if(q.length<2)return send(res,200,{users:[],posts:[]});
    const users=db.users.filter(x=>String(x.name||'').toLowerCase().includes(q)||String(x.handle||'').toLowerCase().includes(q)).slice(0,8).map(safeUser);
    const posts=db.posts.filter(x=>String(x.title||'').toLowerCase().includes(q)||String(x.text||'').toLowerCase().includes(q)||String(x.market||'').toLowerCase().includes(q)).slice(0,8).map(p=>publicPost(p,db,user?.id||''));
    return send(res,200,{users,posts});
  }
  if(url.pathname==='/api/posts'&&req.method==='POST'){if(!user)return send(res,401,{error:'Não autenticado'});if(!rateLimit(req,'post-create',20,60000))return send(res,429,{error:'Limite de publicações atingido. Aguarde um minuto.'});const b=await body(req);const image=String(b.image||'');if(image&&!/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/i.test(image))return send(res,400,{error:'Imagem inválida.'});if(image.length>3600000)return send(res,413,{error:'Imagem muito grande. Escolha uma imagem menor.'});const p={id:uid('p_'),authorId:user.id,type:b.type||'Análise',title:b.title||'Nova publicação',text:b.text||'',market:b.market||'Mercado',odd:Number(b.odd||0),stake:Number(b.stake||0),confidence:Number(b.confidence||9),eventId:b.eventId||null,predictionId:b.predictionId||null,slipId:b.slipId||null,image:image||null,likes:0,comments:0,createdAt:new Date().toISOString()};db.posts.unshift(p);user.posts=(user.posts||0)+1;await dbStore.write(db);emit(user.id,'post_update',{postId:p.id,created:true});return send(res,201,{post:publicPost(p,db,user.id)});}
  const like=url.pathname.match(/^\/api\/posts\/([^/]+)\/like$/);if(like&&req.method==='POST'){if(!user)return send(res,401,{error:'Não autenticado'});if(!rateLimit(req,'like',120,60000))return send(res,429,{error:'Muitas interações em pouco tempo.'});
    const p=db.posts.find(x=>x.id===like[1]);if(!p)return send(res,404,{error:'Publicação não encontrada'});
    p.likedBy=Array.isArray(p.likedBy)?p.likedBy:[];
    const idx=p.likedBy.indexOf(user.id);let liked;
    if(idx>=0){p.likedBy.splice(idx,1);liked=false;p.likes=Math.max(0,(p.likes||0)-1)}
    else{p.likedBy.push(user.id);liked=true;p.likes=(p.likes||0)+1;
      if(p.authorId!==user.id){const n={id:uid('n_'),userId:p.authorId,text:`${user.name} curtiu sua publicação.`,kind:'interaction',read:false,createdAt:new Date().toISOString()};db.notifications.unshift(n);emit(p.authorId,'notification',n)}
    }
    await dbStore.write(db);emit(p.authorId,'post_update',{postId:p.id,likes:p.likes});
    return send(res,200,{likes:p.likes,liked});
  }
  const comments=url.pathname.match(/^\/api\/posts\/([^/]+)\/comments$/);if(comments&&req.method==='GET'){return send(res,200,{comments:db.comments.filter(c=>c.postId===comments[1]).slice(0,100).map(c=>({...c,author:db.users.find(u=>u.id===c.authorId)?.name||c.author}))});}if(comments&&req.method==='POST'){if(!user)return send(res,401,{error:'Não autenticado'});if(!rateLimit(req,'comment',60,60000))return send(res,429,{error:'Muitos comentários em pouco tempo.'});const p=db.posts.find(x=>x.id===comments[1]);if(!p)return send(res,404,{error:'Publicação não encontrada'});const b=await body(req),text=String(b.text||'').trim();if(!text)return send(res,400,{error:'Comentário vazio'});p.comments=(p.comments||0)+1;const c={id:uid('c_'),postId:p.id,authorId:user.id,author:user.name,text,createdAt:new Date().toISOString()};db.comments.unshift(c);if(p.authorId!==user.id){const n={id:uid('n_'),userId:p.authorId,text:`${user.name} comentou em sua publicação.`,kind:'interaction',read:false,createdAt:new Date().toISOString()};db.notifications.unshift(n);emit(p.authorId,'notification',n)}await dbStore.write(db);emit(p.authorId,'post_update',{postId:p.id,comments:p.comments});return send(res,201,{comment:c,comments:p.comments});}
  if(url.pathname==='/api/notifications'&&req.method==='GET')return send(res,200,{notifications:db.notifications.filter(n=>n.userId===user.id).slice(0,50),unread:db.notifications.filter(n=>n.userId===user.id&&!n.read).length});
  if(url.pathname==='/api/notifications/read'&&req.method==='POST'){db.notifications.filter(n=>n.userId===user.id).forEach(n=>n.read=true);await dbStore.write(db);return send(res,200,{ok:true});}
  if(url.pathname==='/api/messages'&&req.method==='GET')return send(res,200,{messages:db.messages.filter(m=>m.from===user.id||m.to===user.id).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt))});
  if(url.pathname==='/api/messages/read'&&req.method==='POST'){const b=await body(req);db.messages.filter(m=>m.to===user.id&&(!b.from||m.from===b.from)).forEach(m=>m.read=true);await dbStore.write(db);return send(res,200,{ok:true});}
  if(url.pathname==='/api/messages'&&req.method==='POST'){if(!user)return send(res,401,{error:'Não autenticado'});if(!rateLimit(req,'message-create',40,60000))return send(res,429,{error:'Muitas mensagens em pouco tempo. Aguarde um minuto.'});const b=await body(req),m={id:uid('m_'),from:user.id,to:b.to||'u_trader',text:String(b.text||'').trim(),createdAt:new Date().toISOString()};if(!m.text)return send(res,400,{error:'Mensagem vazia'});if(!db.users.some(u=>u.id===m.to))return send(res,404,{error:'Destinatário não encontrado'});db.messages.push(m);await dbStore.write(db);emit(m.to,'message',m);return send(res,201,{message:m});}
  return send(res,404,{error:'Rota não encontrada'});
}
function staticFile(req,res,url){let pathname=decodeURIComponent(url.pathname);if(pathname==='/')pathname='/index.html';const file=path.normalize(path.join(ROOT,pathname));if(!file.startsWith(ROOT))return send(res,403,{error:'Forbidden'});fs.stat(file,(err,st)=>{if(err||!st.isFile())return send(res,404,{error:'Arquivo não encontrado'});const ext=path.extname(file),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'});fs.createReadStream(file).pipe(res)})}
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  const origin=req.headers.origin||'';
  if(APP_ORIGIN && origin && origin!==APP_ORIGIN){res.setHeader('Vary','Origin');} else if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Vary','Origin');}
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,OPTIONS');
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('X-DNS-Prefetch-Control','off');
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; script-src 'self' 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'none';");
  if(path.extname(url.pathname) in {'.css':1,'.js':1,'.png':1,'.jpg':1,'.webp':1,'.svg':1,'.ico':1})res.setHeader('Cache-Control','public, max-age=86400, stale-while-revalidate=604800');
  if(process.env.NODE_ENV==='production')res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  if(req.method==='OPTIONS')return send(res,204,'');
  if(url.pathname.startsWith('/api/'))await api(req,res,url);else staticFile(req,res,url)}catch(e){console.error(e);send(res,500,{error:'Erro interno do servidor'})}});
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
(async()=>{await dbStore.init();setInterval(()=>{const now=Date.now();for(const [k,v] of sessions)if(v.expiresAt<now)sessions.delete(k);for(const [k,v] of rateBuckets)if(!v.some(t=>now-t<60000))rateBuckets.delete(k);for(const [k,v] of oauthStates)if(v.expiresAt<now)oauthStates.delete(k)},60000);server.listen(PORT,HOST,()=>console.log(`GAMBLY v0.29 rodando em http://${LOCAL_HOST}:${PORT} (escutando em ${HOST}:${PORT}) [DB: ${dbStore.getMode()}]`))})();
