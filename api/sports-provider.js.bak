// GAMBLY Sports Data Provider — API-Football (API-SPORTS).
// A camada é propositalmente independente do fornecedor: podemos trocar de API
// sem alterar o motor de palpites/liquidação.
const DEFAULT_BASE='https://v3.football.api-sports.io';

function timeoutFetch(url, options={}, ms=10000){
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),ms);
  return fetch(url,{...options,signal:controller.signal}).finally(()=>clearTimeout(timer));
}
function isoDate(d){return new Date(d).toISOString().slice(0,10)}
function n(v){const x=Number(v);return Number.isFinite(x)?x:null}
function statValue(stats,type){
  const row=(Array.isArray(stats)?stats:[]).find(x=>String(x?.type||'').toLowerCase()===type.toLowerCase());
  const raw=row?.value;
  if(raw==null)return null;
  const m=String(raw).match(/-?\d+(?:\.\d+)?/); return m?n(m[0]):null;
}
function normalizeStats(statistics){
  const out={home:{},away:{}};
  for(const side of Array.isArray(statistics)?statistics:[]){
    const key=side?.team?.id===side?.team?.id ? (side?.team?.id) : null;
    const bucket=side?.team?.id===side?.team?.id ? null : null;
    const target=side?.team?.id!=null ? (side?.team?.id===statistics?.[0]?.team?.id?'home':(statistics?.[0]?.team?.id!=null?'away':null)) : null;
    if(target) out[target]={
      corners:statValue(side.statistics,'Corner Kicks'),
      yellowCards:statValue(side.statistics,'Yellow Cards'),
      redCards:statValue(side.statistics,'Red Cards'),
      shotsOnTarget:statValue(side.statistics,'Shots on Goal'),
      totalShots:statValue(side.statistics,'Total Shots'),
      offsides:statValue(side.statistics,'Offsides'),
      fouls:statValue(side.statistics,'Fouls'),
      possession:statValue(side.statistics,'Ball Possession')
    };
  }
  return out;
}
function normalizeStatsWithTeams(statistics, homeId, awayId){
  const out={home:{},away:{}};
  for(const side of Array.isArray(statistics)?statistics:[]){
    const id=side?.team?.id;
    const target=String(id)===String(homeId)?'home':String(id)===String(awayId)?'away':null;
    if(!target)continue;
    out[target]={
      corners:statValue(side.statistics,'Corner Kicks'),
      yellowCards:statValue(side.statistics,'Yellow Cards'),
      redCards:statValue(side.statistics,'Red Cards'),
      shotsOnTarget:statValue(side.statistics,'Shots on Goal'),
      totalShots:statValue(side.statistics,'Total Shots'),
      offsides:statValue(side.statistics,'Offsides'),
      fouls:statValue(side.statistics,'Fouls'),
      possession:statValue(side.statistics,'Ball Possession')
    };
  }
  return out;
}
function normalizeFixture(f){
  const homeId=f?.teams?.home?.id, awayId=f?.teams?.away?.id;
  const short=String(f?.fixture?.status?.short||'NS').toUpperCase();
  const finished=['FT','AET','PEN'].includes(short);
  const cancelled=['CANC','PST','ABD','AWD','WO'].includes(short);
  const live=['1H','HT','2H','ET','BT','P','LIVE'].includes(short);
  const homeScore=n(f?.goals?.home), awayScore=n(f?.goals?.away);
  const stats=normalizeStatsWithTeams(f?.statistics,homeId,awayId);
  const events=(Array.isArray(f?.events)?f.events:[]).map(e=>({
    type:String(e?.type||''),detail:String(e?.detail||''),minute:n(e?.time?.elapsed),extra:n(e?.time?.extra),teamId:e?.team?.id??null
  }));
  const ht=f?.score?.halftime||{};
  return {
    provider:'api-football',providerEventId:String(f?.fixture?.id||''),providerVersion:'api-football-v3',
    startTime:f?.fixture?.date||null,status:cancelled?'cancelled':finished?'finished':live?'live':'scheduled',
    homeName:f?.teams?.home?.name||'',awayName:f?.teams?.away?.name||'',
    homeScore,awayScore,halfTimeHomeScore:n(ht.home),halfTimeAwayScore:n(ht.away),
    leagueName:f?.league?.name||'',leagueCountry:f?.league?.country||'',sportName:'Futebol',
    stats,events,rawState:short,venue:f?.fixture?.venue?.name||''
  };
}
async function apiGet(path,token,timeoutMs){
  if(!token)throw new Error('API_FOOTBALL_KEY não configurado.');
  const r=await timeoutFetch(`${DEFAULT_BASE}${path}`,{headers:{Accept:'application/json','x-apisports-key':token}},timeoutMs);
  const payload=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(`API-Football respondeu ${r.status}.`);
  if(payload?.errors && Object.keys(payload.errors).length)throw new Error(`API-Football: ${JSON.stringify(payload.errors)}`);
  return payload;
}
async function fetchApiFootballFixtures({token,startDate,endDate,timeoutMs=10000}={}){
  const dates=[]; let d=new Date(startDate); const end=new Date(endDate);
  while(d<=end){dates.push(isoDate(d));d=new Date(d.getTime()+86400000)}
  const base=[];
  for(const date of dates){
    const p=await apiGet(`/fixtures?date=${date}&timezone=UTC`,token,timeoutMs);
    base.push(...(Array.isArray(p?.response)?p.response:[]));
  }
  // Enriquecemos somente partidas live/finalizadas, agrupando até 20 IDs por chamada.
  const ids=base.filter(f=>['1H','HT','2H','ET','BT','P','LIVE','FT','AET','PEN'].includes(String(f?.fixture?.status?.short||'').toUpperCase())).map(f=>f?.fixture?.id).filter(Boolean);
  const enriched=new Map();
  for(let i=0;i<ids.length;i+=20){
    const chunk=ids.slice(i,i+20); if(!chunk.length)continue;
    const p=await apiGet(`/fixtures?ids=${chunk.join('-')}`,token,timeoutMs);
    for(const f of (p?.response||[]))enriched.set(String(f?.fixture?.id),f);
  }
  return base.map(f=>normalizeFixture(enriched.get(String(f?.fixture?.id))||f)).filter(x=>x.providerEventId&&x.homeName&&x.awayName);
}

async function fetchApiFootballFixturePlayers({token,fixtureId,timeoutMs=10000}={}){
  const p=await apiGet(`/fixtures/players?fixture=${encodeURIComponent(fixtureId)}`,token,timeoutMs);
  const rows=[];
  for(const team of (p?.response||[])){
    for(const item of (team?.players||[])){
      const pl=item?.player||{}; const st=Array.isArray(item?.statistics)?item.statistics[0]||{}:{};
      rows.push({
        id:pl.id??null,name:pl.name||'',teamId:team?.team?.id??null,
        goals:n(st?.goals?.total),assists:n(st?.goals?.assists),shots:n(st?.shots?.total),shotsOnTarget:n(st?.shots?.on),
        yellowCards:n(st?.cards?.yellow),redCards:n(st?.cards?.red),passes:n(st?.passes?.total),tackles:n(st?.tackles?.total),fouls:n(st?.fouls?.committed),minutes:n(st?.games?.minutes)
      });
    }
  }
  return rows.filter(x=>x.name);
}

async function fetchProviderFixtures(opts={}){
  const provider=String(process.env.SPORTS_PROVIDER||'api-football').toLowerCase();
  if(provider==='api-football'||provider==='apifootball'||provider==='api_sports'){
    return {provider:'api-football',fixtures:await fetchApiFootballFixtures({token:process.env.API_FOOTBALL_KEY,startDate:opts.startDate,endDate:opts.endDate,timeoutMs:opts.timeoutMs})};
  }
  if(process.env.SPORTS_SYNC_URL){
    const r=await timeoutFetch(process.env.SPORTS_SYNC_URL,{headers:process.env.SPORTS_API_KEY?{'x-api-key':process.env.SPORTS_API_KEY}:{}},opts.timeoutMs||10000);
    const p=await r.json().catch(()=>({})); if(!r.ok)throw new Error(`Provedor externo respondeu ${r.status}.`);
    return {provider:'generic',fixtures:Array.isArray(p?.fixtures)?p.fixtures:(Array.isArray(p?.data)?p.data:[])};
  }
  throw new Error(`Provedor ${provider} não configurado.`);
}
module.exports={fetchProviderFixtures,fetchApiFootballFixturePlayers,normalizeFixture,normalizeStatsWithTeams,isoDate};
