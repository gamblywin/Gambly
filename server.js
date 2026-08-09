console.log("SERVER.JS FOI INICIADO");
require('dotenv').config();
const http=require('http');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const dbStore=require('./db');
const ROOT=__dirname;
const PORT=Number(process.env.PORT||3000);
const sessions=new Map(), streamTokens=new Map(), sseClients=new Set(), rateBuckets=new Map(), oauthStates=new Map();
const SESSION_TTL=1000*60*60*24*7, RESET_TTL=1000*60*30, PBKDF2_ITERATIONS=120000;
const uid=p=>p+crypto.randomBytes(7).toString('hex');
function hashPassword(password){const salt=crypto.randomBytes(16).toString('hex');const hash=crypto.pbkdf2Sync(String(password),salt,PBKDF2_ITERATIONS,32,'sha256').toString('hex');return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hash}`}
function verifyPassword(password,stored){if(!String(stored).startsWith('pbkdf2$'))return String(stored)===String(password);const [,it,salt,hash]=stored.split('$');const c=crypto.pbkdf2Sync(String(password),salt,Number(it),32,'sha256');return crypto.timingSafeEqual(c,Buffer.from(hash,'hex'))}
function makeSession(userId){const t=crypto.randomBytes(32).toString('hex');sessions.set(t,{userId,expiresAt:Date.now()+SESSION_TTL});return t}
function cookieSession(t){return `betsocial_session=${t}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL/1000}`}
function clearCookie(){return 'betsocial_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0'}
function cookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(x=>x.trim().split('=')) .filter(x=>x[0]))}
async function authUser(req){const h=req.headers.authorization||'';let t=h.startsWith('Bearer ')?h.slice(7):cookies(req).betsocial_session||'';const s=sessions.get(t);if(!s)return null;if(s.expiresAt<Date.now()){sessions.delete(t);return null}s.expiresAt=Date.now()+SESSION_TTL;const db=await dbStore.read();return db.users.find(u=>u.id===s.userId)||null}
function safeUser(u){const {password,...x}=u;return x}
function rateLimit(req,key,limit,windowMs){const ip=req.socket.remoteAddress||'local',k=ip+':'+key,now=Date.now(),a=(rateBuckets.get(k)||[]).filter(t=>now-t<windowMs);a.push(now);rateBuckets.set(k,a);return a.length<=limit}
function send(res,status,data,headers={}){const body=typeof data==='string'?data:JSON.stringify(data);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',...headers});res.end(body)}
function body(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',c=>{raw+=c;if(raw.length>1e6)req.destroy()});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{})}catch(e){reject(e)}});req.on('error',reject)})}
function emit(userId,event,data){const payload=`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;for(const c of sseClients){if(c.userId===userId)try{c.res.write(payload)}catch{ sseClients.delete(c)}}}
function publicPost(p,db){const u=db.users.find(x=>x.id===p.authorId);return {...p,author:u?.name||p.author,handle:u?.handle||p.handle}}
function passwordStrength(p){let n=0;if(p.length>=8)n++;if(/[A-Z]/.test(p))n++;if(/[a-z]/.test(p))n++;if(/\d/.test(p))n++;if(/[^A-Za-z0-9]/.test(p))n++;return n}
async function sendResetEmail(email,url){if(!process.env.RESEND_API_KEY)return false;const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.EMAIL_FROM||'BetSocial <onboarding@resend.dev>',to:[email],subject:'Redefina sua senha do BetSocial',html:`<p>Recebemos um pedido para redefinir sua senha.</p><p><a href="${url}">Criar nova senha</a></p><p>O link expira em 30 minutos.</p>`})});return r.ok}
async function api(req,res,url){
  if(req.method==='OPTIONS')return send(res,204,'',{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS'});
  const user=await authUser(req);
  if(url.pathname==='/api/health'&&req.method==='GET')return send(res,200,{ok:true,version:'0.11.0',realtime:true,database:dbStore.getMode(),oauth:Boolean(process.env.GOOGLE_CLIENT_ID),time:new Date().toISOString()});
  if(url.pathname==='/api/auth/password-strength'&&req.method==='POST'){const b=await body(req);return send(res,200,{score:passwordStrength(String(b.password||'')),max:5})}
  if(url.pathname==='/api/auth/google'&&req.method==='GET'){
    if(!process.env.GOOGLE_CLIENT_ID||!process.env.GOOGLE_CLIENT_SECRET)return send(res,503,{error:'OAuth Google ainda não foi configurado no .env.'});
    const state=crypto.randomBytes(24).toString('hex');oauthStates.set(state,{expiresAt:Date.now()+300000});const redirect=process.env.GOOGLE_REDIRECT_URI||`${process.env.APP_URL||`http://localhost:${PORT}`}/api/auth/google/callback`;const q=new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,redirect_uri:redirect,response_type:'code',scope:'openid email profile',state,prompt:'select_account'});res.writeHead(302,{Location:'https://accounts.google.com/o/oauth2/v2/auth?'+q});return res.end();
  }
  if(url.pathname==='/api/auth/google/callback'&&req.method==='GET'){
    const st=oauthStates.get(url.searchParams.get('state'));if(!st||st.expiresAt<Date.now())return send(res,400,{error:'Estado OAuth inválido ou expirado.'});oauthStates.delete(url.searchParams.get('state'));
    const code=url.searchParams.get('code');if(!code)return send(res,400,{error:'Autorização Google cancelada.'});
    try{const redirect=process.env.GOOGLE_REDIRECT_URI||`${process.env.APP_URL||`http://localhost:${PORT}`}/api/auth/google/callback`;const tr=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,redirect_uri:redirect,grant_type:'authorization_code'})});const td=await tr.json();if(!tr.ok)throw new Error('Falha no token Google');const ur=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${td.access_token}`}});const g=await ur.json();if(!g.email)throw new Error('Google não retornou e-mail');const db=await dbStore.read();let u=db.users.find(x=>x.email.toLowerCase()===g.email.toLowerCase());if(!u){let h=(g.email.split('@')[0].replace(/[^a-z0-9._-]/gi,'').slice(0,20)||'googleuser').toLowerCase();while(db.users.some(x=>x.handle==='@'+h))h=h.slice(0,18)+Math.floor(Math.random()*99);u={id:uid('u_'),name:g.name||h,handle:'@'+h,email:g.email,password:hashPassword(crypto.randomBytes(24).toString('hex')),bio:'Membro da comunidade BetSocial.',followers:0,following:0,posts:0,winRate:0,avatar:g.picture||''};db.users.push(u);await dbStore.write(db)}const t=makeSession(u.id);res.writeHead(302,{Location:'/?oauth=success', 'Set-Cookie':cookieSession(t)});return res.end()}catch(e){console.error(e);return send(res,502,{error:'Não foi possível concluir o login com Google.'})}
  }
  if(url.pathname==='/api/auth/login'&&req.method==='POST'){
    if(!rateLimit(req,'login',10,60000))return send(res,429,{error:'Muitas tentativas. Aguarde um minuto.'});const b=await body(req),db=await dbStore.read(),identity=String(b.identity||b.email||'').trim().toLowerCase();const u=db.users.find(x=>x.email.toLowerCase()===identity||String(x.handle||'').replace(/^@/,'').toLowerCase()===identity.replace(/^@/,''));if(!u||!verifyPassword(b.password,u.password))return send(res,401,{error:'E-mail/usuário ou senha inválidos.'});if(!String(u.password).startsWith('pbkdf2$')){u.password=hashPassword(b.password);await dbStore.write(db)}const t=makeSession(u.id);return send(res,200,{token:t,user:safeUser(u)},{'Set-Cookie':cookieSession(t)});
  }
  if(url.pathname==='/api/auth/register'&&req.method==='POST'){
    if(!rateLimit(req,'register',5,60000))return send(res,429,{error:'Muitas tentativas de cadastro. Aguarde um minuto.'});const b=await body(req),db=await dbStore.read();const name=String(b.name||'').trim(),email=String(b.email||'').trim().toLowerCase(),handle=String(b.handle||'').trim().replace(/^@/,'').toLowerCase(),password=String(b.password||'');if(name.length<2)return send(res,400,{error:'Informe seu nome completo.'});if(!/^[a-z0-9._-]{3,24}$/i.test(handle))return send(res,400,{error:'Usuário deve ter 3–24 caracteres.'});if(!/^\S+@\S+\.\S+$/.test(email))return send(res,400,{error:'E-mail inválido.'});if(password.length<8||passwordStrength(password)<3)return send(res,400,{error:'Use uma senha de pelo menos 8 caracteres com letras e números.'});if(db.users.some(u=>u.email.toLowerCase()===email))return send(res,409,{error:'Este e-mail já está cadastrado.'});if(db.users.some(u=>String(u.handle).replace(/^@/,'').toLowerCase()===handle))return send(res,409,{error:'Este usuário já está em uso.'});const u={id:uid('u_'),name,handle:'@'+handle,email,password:hashPassword(password),bio:'Novo membro da comunidade BetSocial.',followers:0,following:0,posts:0,winRate:0};db.users.push(u);await dbStore.write(db);const t=makeSession(u.id);return send(res,201,{token:t,user:safeUser(u)},{'Set-Cookie':cookieSession(t)});
  }
  if(url.pathname==='/api/auth/forgot-password'&&req.method==='POST'){
    if(!rateLimit(req,'forgot',5,60000))return send(res,429,{error:'Aguarde antes de solicitar novamente.'});const b=await body(req),email=String(b.email||'').trim().toLowerCase(),db=await dbStore.read(),u=db.users.find(x=>x.email.toLowerCase()===email);if(!u)return send(res,200,{ok:true,message:'Se o e-mail existir, enviaremos as instruções.'});const raw=crypto.randomBytes(32).toString('hex'),hash=crypto.createHash('sha256').update(raw).digest('hex');db.resetTokens=db.resetTokens.filter(x=>x.expiresAt>Date.now());db.resetTokens.push({id:uid('rt_'),userId:u.id,hash,expiresAt:Date.now()+RESET_TTL,used:false});await dbStore.write(db);const resetUrl=`${process.env.APP_URL||`http://localhost:${PORT}`}/?reset=${raw}`;const sent=await sendResetEmail(email,resetUrl).catch(()=>false);return send(res,200,{ok:true,message:'Se o e-mail existir, enviaremos as instruções.',...(process.env.NODE_ENV!=='production'&&!sent?{devResetUrl:resetUrl}:{} )});
  }
  if(url.pathname==='/api/auth/reset-password'&&req.method==='POST'){
    const b=await body(req),raw=String(b.token||''),password=String(b.password||''),db=await dbStore.read(),h=crypto.createHash('sha256').update(raw).digest('hex'),rt=db.resetTokens.find(x=>x.hash===h&&!x.used&&x.expiresAt>Date.now());if(!rt)return send(res,400,{error:'Link inválido ou expirado.'});if(password.length<8||passwordStrength(password)<3)return send(res,400,{error:'Senha fraca. Use pelo menos 8 caracteres com letras e números.'});const u=db.users.find(x=>x.id===rt.userId);if(!u)return send(res,400,{error:'Usuário não encontrado.'});u.password=hashPassword(password);rt.used=true;await dbStore.write(db);for(const [k,s] of sessions)if(s.userId===u.id)sessions.delete(k);return send(res,200,{ok:true});
  }
  if(url.pathname==='/api/auth/me'&&req.method==='GET'){if(!user)return send(res,401,{error:'Não autenticado'});return send(res,200,{user:safeUser(user)});}
  if(url.pathname==='/api/auth/logout'&&req.method==='POST'){const h=req.headers.authorization||'';if(h.startsWith('Bearer '))sessions.delete(h.slice(7));const c=cookies(req).betsocial_session;if(c)sessions.delete(c);return send(res,200,{ok:true},{'Set-Cookie':clearCookie()});}
  if(url.pathname==='/api/realtime/token'&&req.method==='POST'){if(!user)return send(res,401,{error:'Não autenticado'});const t=crypto.randomBytes(24).toString('hex');streamTokens.set(t,{userId:user.id,expiresAt:Date.now()+60000});return send(res,200,{token:t,expiresIn:60});}
  if(url.pathname==='/api/realtime'&&req.method==='GET'){const x=streamTokens.get(url.searchParams.get('token'));if(!x||x.expiresAt<Date.now())return send(res,401,'Unauthorized',{'Content-Type':'text/plain'});streamTokens.delete(url.searchParams.get('token'));res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive'});res.write(`event: connected\ndata: ${JSON.stringify({ok:true})}\n\n`);const c={userId:x.userId,res};sseClients.add(c);const timer=setInterval(()=>{try{res.write(`event: ping\ndata: ${JSON.stringify({time:Date.now()})}\n\n`)}catch{clearInterval(timer);sseClients.delete(c)}},25000);req.on('close',()=>{clearInterval(timer);sseClients.delete(c)});return;}
  if(url.pathname==='/api/sports/live'&&req.method==='GET'){
    const normalizeSportmonks=(payload)=>{
      const list=Array.isArray(payload?.data)?payload.data:[];
      return list.map(g=>{
        const home=g?.participants?.find(p=>p.meta?.location==='home')||g?.home_team||g?.home;
        const away=g?.participants?.find(p=>p.meta?.location==='away')||g?.away_team||g?.away;
        const hScore=(g?.scores||[]).find(x=>x.description==='CURRENT'&&x.participant_id===home?.id)?.score?.goals ?? g?.home_score ?? 0;
        const aScore=(g?.scores||[]).find(x=>x.description==='CURRENT'&&x.participant_id===away?.id)?.score?.goals ?? g?.away_score ?? 0;
        const state=g?.state?.name||g?.state?.short_name||g?.status||'AO VIVO';
        const minute=g?.periods?.[0]?.minutes ?? g?.minute ?? '';
        return {id:String(g.id),league:g?.league?.name||g?.competition?.name||'Futebol',home:home?.name||'Casa',away:away?.name||'Fora',score:`${hScore} - ${aScore}`,minute,status:String(state).toUpperCase().includes('LIVE')?'AO VIVO':state};
      });
    };
    // Sportmonks free tier: real production data, with live scores for the leagues included in the free plan.
    if(process.env.SPORTMONKS_API_TOKEN){
      try{
        const endpoint=process.env.SPORTMONKS_LIVESCORE_URL||'https://api.sportmonks.com/v3/football/livescores/inplay';
        const sep=endpoint.includes('?')?'&':'?';
        const r=await fetch(endpoint+sep+'api_token='+encodeURIComponent(process.env.SPORTMONKS_API_TOKEN)+'&include=participants;scores;state;league');
        const payload=await r.json().catch(()=>({}));
        if(r.ok)return send(res,200,{source:'sportmonks',data:normalizeSportmonks(payload),updatedAt:new Date().toISOString()});
        console.error('Sportmonks:',r.status,payload);
      }catch(e){console.error('Sportmonks:',e.message)}
    }
    // Generic provider remains supported for an existing integration.
    if(process.env.SPORTS_API_URL)try{const r=await fetch(process.env.SPORTS_API_URL,{headers:process.env.SPORTS_API_KEY?{'x-api-key':process.env.SPORTS_API_KEY}:{}});if(r.ok)return send(res,200,{source:'external',data:await r.json(),updatedAt:new Date().toISOString()})}catch(e){console.error('External sports API:',e.message)}
    return send(res,200,{source:'not-configured',data:[],updatedAt:new Date().toISOString(),message:'Configure SPORTS_API_TOKEN ou SPORTMONKS_API_TOKEN para exibir jogos reais. O BetSocial não apresenta partidas fictícias como se fossem reais.'});
  }
  if(!user)return send(res,401,{error:'Faça login para continuar.'});
  const db=await dbStore.read();
  if(url.pathname==='/api/profile'&&req.method==='GET')return send(res,200,{user:safeUser(user)});
  if(url.pathname==='/api/profile'&&req.method==='PATCH'){const b=await body(req);user.name=b.name??user.name;user.handle=b.handle??user.handle;user.bio=b.bio??user.bio;await dbStore.write(db);return send(res,200,{user:safeUser(user)});}
  if(url.pathname==='/api/users'&&req.method==='GET'){const q=String(url.searchParams.get('q')||'').toLowerCase();const users=db.users.filter(x=>x.id!==user.id&&(!q||x.name.toLowerCase().includes(q)||x.handle.toLowerCase().includes(q))).slice(0,30).map(safeUser);return send(res,200,{users});}
  const follow=url.pathname.match(/^\/api\/users\/([^/]+)\/follow$/);if(follow&&req.method==='POST'){const target=db.users.find(x=>x.id===follow[1]);if(!target||target.id===user.id)return send(res,400,{error:'Usuário inválido.'});db.follows=db.follows||[];const idx=db.follows.findIndex(f=>f.followerId===user.id&&f.followingId===target.id);if(idx>=0){db.follows.splice(idx,1);target.followers=Math.max(0,(target.followers||0)-1);user.following=Math.max(0,(user.following||0)-1);await dbStore.write(db);emit(target.id,'follow',{from:user.id,following:false});return send(res,200,{following:false,followers:target.followers})}db.follows.push({id:uid('f_'),followerId:user.id,followingId:target.id,createdAt:new Date().toISOString()});target.followers=(target.followers||0)+1;user.following=(user.following||0)+1;await dbStore.write(db);emit(target.id,'follow',{from:user.id,following:true});return send(res,200,{following:true,followers:target.followers});}
  if(url.pathname==='/api/network'&&req.method==='GET'){const following=new Set((db.follows||[]).filter(f=>f.followerId===user.id).map(f=>f.followingId));const followers=new Set((db.follows||[]).filter(f=>f.followingId===user.id).map(f=>f.followerId));const users=db.users.filter(x=>x.id!==user.id).slice(0,100).map(u=>({...safeUser(u),following:following.has(u.id),followsYou:followers.has(u.id)}));return send(res,200,{users,followers:followers.size,following:following.size});}
  const userRoute=url.pathname.match(/^\/api\/users\/([^/]+)$/);if(userRoute&&req.method==='GET'){const target=db.users.find(x=>x.id===userRoute[1]);if(!target)return send(res,404,{error:'Usuário não encontrado'});const following=(db.follows||[]).some(f=>f.followerId===user.id&&f.followingId===target.id);const followsYou=(db.follows||[]).some(f=>f.followerId===target.id&&f.followingId===user.id);const posts=db.posts.filter(p=>p.authorId===target.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,30).map(p=>publicPost(p,db));return send(res,200,{user:{...safeUser(target),following,followsYou},posts});}
  if(url.pathname==='/api/feed'&&req.method==='GET'){db.follows=db.follows||[];const following=new Set(db.follows.filter(f=>f.followerId===user.id).map(f=>f.followingId));const posts=db.posts.filter(p=>p.authorId===user.id||following.has(p.authorId)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(p=>publicPost(p,db));return send(res,200,{posts,following:following.size});}
  if(url.pathname==='/api/posts'&&req.method==='GET'){return send(res,200,{posts:db.posts.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(p=>publicPost(p,db))});}
  if(url.pathname==='/api/posts'&&req.method==='POST'){const b=await body(req),p={id:uid('p_'),authorId:user.id,type:b.type||'Análise',title:b.title||'Nova publicação',text:b.text||'',market:b.market||'Mercado',odd:Number(b.odd||0),stake:Number(b.stake||0),confidence:Number(b.confidence||9),likes:0,comments:0,createdAt:new Date().toISOString()};db.posts.unshift(p);user.posts=(user.posts||0)+1;await dbStore.write(db);emit(user.id,'post_update',{postId:p.id,created:true});return send(res,201,{post:publicPost(p,db)});}
  const like=url.pathname.match(/^\/api\/posts\/([^/]+)\/like$/);if(like&&req.method==='POST'){const p=db.posts.find(x=>x.id===like[1]);if(!p)return send(res,404,{error:'Publicação não encontrada'});p.likes=(p.likes||0)+1;if(p.authorId!==user.id){const n={id:uid('n_'),userId:p.authorId,text:`${user.name} curtiu sua publicação.`,kind:'interaction',read:false,createdAt:new Date().toISOString()};db.notifications.unshift(n);emit(p.authorId,'notification',n)}await dbStore.write(db);emit(p.authorId,'post_update',{postId:p.id,likes:p.likes});return send(res,200,{likes:p.likes});}
  const comments=url.pathname.match(/^\/api\/posts\/([^/]+)\/comments$/);if(comments&&req.method==='GET'){return send(res,200,{comments:db.comments.filter(c=>c.postId===comments[1]).slice(0,100).map(c=>({...c,author:db.users.find(u=>u.id===c.authorId)?.name||c.author}))});}if(comments&&req.method==='POST'){const p=db.posts.find(x=>x.id===comments[1]);if(!p)return send(res,404,{error:'Publicação não encontrada'});const b=await body(req),text=String(b.text||'').trim();if(!text)return send(res,400,{error:'Comentário vazio'});p.comments=(p.comments||0)+1;const c={id:uid('c_'),postId:p.id,authorId:user.id,author:user.name,text,createdAt:new Date().toISOString()};db.comments.unshift(c);if(p.authorId!==user.id){const n={id:uid('n_'),userId:p.authorId,text:`${user.name} comentou em sua publicação.`,kind:'interaction',read:false,createdAt:new Date().toISOString()};db.notifications.unshift(n);emit(p.authorId,'notification',n)}await dbStore.write(db);emit(p.authorId,'post_update',{postId:p.id,comments:p.comments});return send(res,201,{comment:c,comments:p.comments});}
  if(url.pathname==='/api/notifications'&&req.method==='GET')return send(res,200,{notifications:db.notifications.filter(n=>n.userId===user.id).slice(0,50),unread:db.notifications.filter(n=>n.userId===user.id&&!n.read).length});
  if(url.pathname==='/api/notifications/read'&&req.method==='POST'){db.notifications.filter(n=>n.userId===user.id).forEach(n=>n.read=true);await dbStore.write(db);return send(res,200,{ok:true});}
  if(url.pathname==='/api/messages'&&req.method==='GET')return send(res,200,{messages:db.messages.filter(m=>m.from===user.id||m.to===user.id).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt))});
  if(url.pathname==='/api/messages/read'&&req.method==='POST'){const b=await body(req);db.messages.filter(m=>m.to===user.id&&(!b.from||m.from===b.from)).forEach(m=>m.read=true);await dbStore.write(db);return send(res,200,{ok:true});}
  if(url.pathname==='/api/messages'&&req.method==='POST'){const b=await body(req),m={id:uid('m_'),from:user.id,to:b.to||'u_trader',text:String(b.text||'').trim(),createdAt:new Date().toISOString()};if(!m.text)return send(res,400,{error:'Mensagem vazia'});if(!db.users.some(u=>u.id===m.to))return send(res,404,{error:'Destinatário não encontrado'});db.messages.push(m);await dbStore.write(db);emit(m.to,'message',m);return send(res,201,{message:m});}
  return send(res,404,{error:'Rota não encontrada'});
}
function staticFile(req,res,url){let pathname=decodeURIComponent(url.pathname);if(pathname==='/')pathname='/index.html';const file=path.normalize(path.join(ROOT,pathname));if(!file.startsWith(ROOT))return send(res,403,{error:'Forbidden'});fs.stat(file,(err,st)=>{if(err||!st.isFile())return send(res,404,{error:'Arquivo não encontrado'});const ext=path.extname(file),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'});fs.createReadStream(file).pipe(res)})}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(
      req.url,
      `http://${req.headers.host || 'localhost'}`
    );

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,PATCH,OPTIONS'
    );

    if (url.pathname.startsWith('/api/')) {
      await api(req, res, url);
    } else {
      staticFile(req, res, url);
    }
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Erro interno do servidor' });
  }
});

let initialized = false;

async function initServer() {
  if (initialized) return;

  await dbStore.init();

  setInterval(() => {
    const now = Date.now();

    for (const [k, v] of sessions) {
      if (v.expiresAt < now) sessions.delete(k);
    }

    for (const [k, v] of rateBuckets) {
      if (!v.some(t => now - t < 60000)) {
        rateBuckets.delete(k);
      }
    }

    for (const [k, v] of oauthStates) {
      if (v.expiresAt < now) {
        oauthStates.delete(k);
      }
    }
  }, 60000);

  initialized = true;
}

module.exports = {
  server,
  initServer
};

if (require.main === module) {
  initServer().then(() => {
    server.listen(PORT, () => {
      console.log(
        `BetSocial v0.11 rodando em http://localhost:${PORT} [DB: ${dbStore.getMode()}]`
      );
    });
  });
}