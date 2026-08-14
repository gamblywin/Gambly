const fs=require('fs');
const path=require('path');
const ROOT=__dirname,DB_FILE=path.join(ROOT,'db.json');
let mode='json', supa=null, lastDb=null;
const empty={users:[],posts:[],notifications:[],messages:[],comments:[],follows:[],resetTokens:[],groups:[],communities:[],sports:[],leagues:[],teams:[],events:[],predictions:[],predictionSlips:[]};
const norm=db=>({...empty,...(db||{}),follows:(db&&db.follows)||[],resetTokens:(db&&db.resetTokens)||[],comments:(db&&db.comments)||[],groups:(db&&db.groups)||[],communities:(db&&db.communities)||[],sports:(db&&db.sports)||[],leagues:(db&&db.leagues)||[],teams:(db&&db.teams)||[],events:(db&&db.events)||[],predictions:(db&&db.predictions)||[],predictionSlips:(db&&db.predictionSlips)||[],notifications:(db&&db.notifications)||[],messages:(db&&db.messages)||[],posts:(db&&db.posts)||[],users:(db&&db.users)||[]});
const readJson=()=>norm(JSON.parse(fs.readFileSync(DB_FILE,'utf8')));
const writeJson=db=>fs.writeFileSync(DB_FILE,JSON.stringify(norm(db),null,2));
function headers(){return {'apikey':supa.key,'Authorization':`Bearer ${supa.key}`,'Content-Type':'application/json'}}
async function rest(table,params=''){
  const pageSize=1000;
  let offset=0;
  const all=[];
  while(true){
    const sep=params.includes('?')?'&':'?';
    const query=`${params}${sep}limit=${pageSize}&offset=${offset}`;
    const r=await fetch(`${supa.url}/rest/v1/${table}${query}`,{headers:headers()});
    if(!r.ok)throw new Error(`${table}: ${r.status} ${await r.text()}`);
    const rows=await r.json();
    if(!Array.isArray(rows))return rows;
    all.push(...rows);
    if(rows.length<pageSize)break;
    offset+=pageSize;
  }
  return all;
}
async function upsert(table,rows){if(!rows.length)return;const r=await fetch(`${supa.url}/rest/v1/${table}`,{method:'POST',headers:{...headers(),'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows)});if(!r.ok)throw new Error(`${table} upsert: ${r.status} ${await r.text()}`)}
async function del(table,id){const r=await fetch(`${supa.url}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:headers()});if(!r.ok)throw new Error(`${table} delete: ${r.status} ${await r.text()}`)}
const maps={
 users:u=>({id:u.id,name:u.name,handle:u.handle,email:u.email,password:u.password,bio:u.bio||'',followers:u.followers||0,following:u.following||0,posts:u.posts||0,win_rate:u.winRate||0,avatar:u.avatar||'',premium:!!u.premium,created_at:u.createdAt||new Date().toISOString()}),
 posts:p=>({id:p.id,author_id:p.authorId,type:p.type,title:p.title,text:p.text||'',market:p.market||'',odd:p.odd||0,stake:p.stake||0,confidence:p.confidence||0,event_id:p.eventId||null,prediction_id:p.predictionId||null,slip_id:p.slipId||null,image:p.image||null,likes:p.likes||0,comments:p.comments||0,liked_by:Array.isArray(p.likedBy)?p.likedBy:[],created_at:p.createdAt||new Date().toISOString()}),
 comments:x=>({id:x.id,post_id:x.postId,author_id:x.authorId,author:x.author||'',text:x.text,created_at:x.createdAt||new Date().toISOString()}),
 notifications:x=>({id:x.id,user_id:x.userId,text:x.text,kind:x.kind||'interaction',read:!!x.read,created_at:x.createdAt||new Date().toISOString()}),
 messages:x=>({id:x.id,from:x.from,to_user:x.to,text:x.text,created_at:x.createdAt||new Date().toISOString(),read:!!x.read}),
 follows:x=>({id:x.id,follower_id:x.followerId,following_id:x.followingId,created_at:x.createdAt||new Date().toISOString()}),
 reset_tokens:x=>({id:x.id,user_id:x.userId,hash:x.hash,expires_at:new Date(x.expiresAt).toISOString(),used:!!x.used}),
 groups:g=>({id:g.id,name:g.name,description:g.description||'',owner_id:g.ownerId,members:g.members||[],pending:g.pending||[],posts:g.posts||[],settings:g.settings||{},created_at:g.createdAt||new Date().toISOString()}),
 communities:g=>({id:g.id,name:g.name,description:g.description||'',owner_id:g.ownerId,members:g.members||[],pending:g.pending||[],posts:g.posts||[],settings:g.settings||{},created_at:g.createdAt||new Date().toISOString()}),
 sports:s=>({id:s.id,name:s.name}),
 leagues:l=>({id:l.id,sport_id:l.sportId,name:l.name,country:l.country||''}),
 teams:t=>({id:t.id,name:t.name,short_name:t.shortName||'',logo_url:t.logoUrl||''}),
 events:e=>({id:e.id,sport_id:e.sportId,league_id:e.leagueId||null,home_team_id:e.homeTeamId,away_team_id:e.awayTeamId,start_time:e.startTime,status:e.status,home_score:e.homeScore,away_score:e.awayScore,result_source:e.resultSource||null,result_source_version:e.resultSourceVersion||null,result_received_at:e.resultReceivedAt||null,provider_event_id:e.providerEventId||null,provider_name:e.providerName||null,provider_last_sync_at:e.providerLastSyncAt||null}),
 predictions:p=>({id:p.id,user_id:p.userId,event_id:p.eventId,slip_id:p.slipId||null,type:p.type,selection:p.selection,odds:p.odds,result:p.result,created_at:p.createdAt||new Date().toISOString(),settled_at:p.settledAt||null,settlement_reason:p.settlementReason||null}),
 prediction_slips:p=>({id:p.id,user_id:p.userId,title:p.title||'',result:p.result||'pending',prediction_ids:p.predictionIds||[],created_at:p.createdAt||new Date().toISOString(),settled_at:p.settledAt||null,source:p.source||'manual',source_text:p.sourceText||null,parser_version:p.parserVersion||null,parser_confidence:p.parserConfidence==null?null:p.parserConfidence})
};
function fromUsers(a){return a.map(u=>({...u,winRate:Number(u.win_rate||0),createdAt:u.created_at}))}
function fromPosts(a){return a.map(p=>({...p,authorId:p.author_id,eventId:p.event_id||null,predictionId:p.prediction_id||null,slipId:p.slip_id||null,image:p.image||null,likedBy:p.liked_by||[],createdAt:p.created_at}))}
function fromComments(a){return a.map(x=>({...x,postId:x.post_id,authorId:x.author_id,createdAt:x.created_at}))}
function fromNotifications(a){return a.map(x=>({...x,userId:x.user_id,createdAt:x.created_at}))}
function fromMessages(a){return a.map(x=>({...x,to:x.to_user,createdAt:x.created_at}))}
function fromFollows(a){return a.map(x=>({...x,followerId:x.follower_id,followingId:x.following_id,createdAt:x.created_at}))}
function fromResets(a){return a.map(x=>({...x,userId:x.user_id,expiresAt:new Date(x.expires_at).getTime()}))}
function fromGroups(a){return a.map(x=>({...x,ownerId:x.owner_id,createdAt:x.created_at,members:x.members||[],pending:x.pending||[],posts:x.posts||[],settings:x.settings||{}}))}
function fromSports(a){return a.map(x=>({...x}))}
function fromLeagues(a){return a.map(x=>({...x,sportId:x.sport_id}))}
function fromTeams(a){return a.map(x=>({...x,shortName:x.short_name,logoUrl:x.logo_url}))}
function fromEvents(a){return a.map(x=>({...x,sportId:x.sport_id,leagueId:x.league_id,homeTeamId:x.home_team_id,awayTeamId:x.away_team_id,startTime:x.start_time,homeScore:x.home_score,awayScore:x.away_score,resultSource:x.result_source||null,resultSourceVersion:x.result_source_version||null,resultReceivedAt:x.result_received_at||null,providerEventId:x.provider_event_id||null,providerName:x.provider_name||null,providerLastSyncAt:x.provider_last_sync_at||null}))}
function fromPredictionSlips(a){return a.map(x=>({...x,userId:x.user_id,title:x.title||'',result:x.result||'pending',predictionIds:x.prediction_ids||[],createdAt:x.created_at,settledAt:x.settled_at||null,source:x.source||'manual',sourceText:x.source_text||null,parserVersion:x.parser_version||null,parserConfidence:x.parser_confidence==null?undefined:Number(x.parser_confidence)}))}
function fromPredictions(a){return a.map(x=>({...x,userId:x.user_id,eventId:x.event_id,slipId:x.slip_id||null,createdAt:x.created_at,settledAt:x.settled_at||null,settlementReason:x.settlement_reason||null}))}
async function supaRead(){const [users,posts,comments,notifications,messages,follows,resetTokens,groups,sports,leagues,teams,events,predictions]=await Promise.all([rest('users','?select=*'),rest('posts','?select=*'),rest('comments','?select=*'),rest('notifications','?select=*'),rest('messages','?select=*'),rest('follows','?select=*'),rest('reset_tokens','?select=*'),rest('groups','?select=*'),rest('sports','?select=*'),rest('leagues','?select=*'),rest('teams','?select=*'),rest('events','?select=*'),rest('predictions','?select=*')]);let communities=[],predictionSlips=[];try{communities=await rest('communities','?select=*')}catch(e){console.warn('communities table unavailable; run the migration:',e.message)}try{predictionSlips=await rest('prediction_slips','?select=*')}catch(e){console.warn('prediction_slips table unavailable; run supabase-sprint28-plus.sql to enable multi-predictions:',e.message)}return norm({users:fromUsers(users),posts:fromPosts(posts),comments:fromComments(comments),notifications:fromNotifications(notifications),messages:fromMessages(messages),follows:fromFollows(follows),resetTokens:fromResets(resetTokens),groups:fromGroups(groups),communities:fromGroups(communities),sports:fromSports(sports),leagues:fromLeagues(leagues),teams:fromTeams(teams),events:fromEvents(events),predictions:fromPredictions(predictions),predictionSlips:fromPredictionSlips(predictionSlips)})}
async function supaWrite(db){
 db=norm(db);
 const sets=[['users',db.users,maps.users],['posts',db.posts,maps.posts],['comments',db.comments,maps.comments],['notifications',db.notifications,maps.notifications],['messages',db.messages,maps.messages],['follows',db.follows,maps.follows],['reset_tokens',db.resetTokens,maps.reset_tokens],['groups',db.groups,maps.groups],['communities',db.communities,maps.communities],['sports',db.sports,maps.sports],['leagues',db.leagues,maps.leagues],['teams',db.teams,maps.teams],['events',db.events,maps.events],['predictions',db.predictions,maps.predictions],['prediction_slips',db.predictionSlips,maps.prediction_slips]];
 for(const [table,rows,map] of sets){try{await upsert(table,rows.map(map))}catch(e){if(table==='communities'||table==='prediction_slips'){console.warn('communities table unavailable; data kept only in local snapshot:',e.message)}else throw e}}
 // Remove records deleted since the previous snapshot. This keeps follow toggles and one-time tokens correct.
 if(lastDb){for(const [table,rows,map] of sets){const old=lastDb[table==='reset_tokens'?'resetTokens':table]||[];const now=new Set(rows.map(r=>r.id));for(const r of old)if(!now.has(r.id))await del(table,r.id)}}
 lastDb=JSON.parse(JSON.stringify(db));
}
async function init(){
 const hasSupabase=Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY);
 if(hasSupabase){
   try{
     supa={url:process.env.SUPABASE_URL.replace(/\/$/,''),key:process.env.SUPABASE_SERVICE_ROLE_KEY};
     const db=await supaRead();
     lastDb=db;
     if(!db.users.length){
       const seed=readJson();
       if(seed.users.length) await supaWrite(seed);
       lastDb=seed;
     }
     mode='supabase';
     console.log('GAMBLY DB: Supabase REST conectado');
     return;
   }catch(e){
     supa=null;
     if(process.env.NODE_ENV==='production') throw new Error(`Supabase obrigatório em produção: ${e.message}`);
     console.warn('Supabase indisponível; usando JSON local apenas em desenvolvimento:',e.message);
   }
 }
 if(process.env.NODE_ENV==='production'){
   throw new Error('Produção exige SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
 }
 if(process.env.DATABASE_URL)console.warn('DATABASE_URL detectada, mas esta versão usa SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.');
 mode='json';
}
async function read(){if(mode==='supabase'){lastDb=await supaRead();return JSON.parse(JSON.stringify(lastDb))}return readJson()}
async function write(db){if(mode==='supabase')return supaWrite(db);return writeJson(db)}
async function check(){if(mode!=='supabase')return {mode:'json',ok:true,message:'Banco local JSON ativo'};const r=await fetch(`${supa.url}/rest/v1/users?select=id&limit=1`,{headers:headers()});return {mode:'supabase',ok:r.ok,message:r.ok?'Supabase REST ativo':'Supabase indisponível'} }
module.exports={init,read,write,check,getMode:()=>mode,DB_FILE};
