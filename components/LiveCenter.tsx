'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getLiveGames } from '@/lib/api';
import type { LiveGame } from '@/types';

function groupGames(games: LiveGame[]) {
  const map = new Map<string, LiveGame[]>();
  games.forEach(g => { const key = g.country || 'Internacional'; if (!map.has(key)) map.set(key, []); map.get(key)!.push(g); });
  return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
}
function groupLeagues(items: LiveGame[]) {
  const map = new Map<string, LiveGame[]>();
  items.forEach(g=>{const key=g.league||'Futebol';if(!map.has(key))map.set(key,[]);map.get(key)!.push(g)});
  return [...map.entries()];
}
export function LiveCenter(){
  const [games,setGames]=useState<LiveGame[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [search,setSearch]=useState(''),[country,setCountry]=useState('all'),[league,setLeague]=useState('all'),[status,setStatus]=useState('live'),[timeFilter,setTimeFilter]=useState('all'),[last,setLast]=useState('');
  const load=async()=>{try{setError('');const d=await getLiveGames({search:search.trim(),country:country==='all'?'':country,league:league==='all'?'':league,status});setGames(d.games||[]);setLast(d.updatedAt||new Date().toISOString())}catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar os jogos.')}finally{setLoading(false)}};
  useEffect(()=>{load();const id=window.setInterval(load,30000);return()=>window.clearInterval(id)},[search,country,league,status]);
  const countries=useMemo(()=>Array.from(new Set(games.map(g=>g.country||'Internacional'))).sort(),[games]);
  const leagues=useMemo(()=>Array.from(new Set(games.map(g=>g.league))).sort(),[games]);
  const visibleGames=useMemo(()=>{const now=Date.now();return games.filter(g=>{if(timeFilter==='all')return true;const t=g.startTime?Date.parse(g.startTime):NaN;if(!Number.isFinite(t))return true;if(timeFilter==='now')return g.status==='live';if(timeFilter==='2h')return t>=now-30*60000&&t<=now+2*3600000;if(timeFilter==='today'){const d=new Date(t),n=new Date(now);return d.toDateString()===n.toDateString()}return true})},[games,timeFilter]);
  const grouped=useMemo(()=>groupGames(visibleGames),[visibleGames]);
  return <section className="live-center">
    <div className="page-title live-title"><div><span className="eyebrow">CENTRAL ESPORTIVA</span><h1>🔴 Ao Vivo</h1><p>Acompanhe placares e eventos em uma única central.</p></div><div className="live-counter"><b>{visibleGames.length}</b><span>jogos exibidos</span></div></div>
    <div className="live-toolbar card"><div className="live-search">🔎<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar time, campeonato ou país..."/></div><div className="live-filters"><select value={status} onChange={e=>setStatus(e.target.value)}><option value="live">🔴 Ao vivo</option><option value="scheduled">Próximos</option><option value="finished">Encerrados</option><option value="all">Todos os status</option></select><select value={country} onChange={e=>setCountry(e.target.value)}><option value="all">Todos os países</option>{countries.map(x=><option key={x}>{x}</option>)}</select><select value={league} onChange={e=>setLeague(e.target.value)}><option value="all">Todos os campeonatos</option>{leagues.map(x=><option key={x}>{x}</option>)}</select><select value={timeFilter} onChange={e=>setTimeFilter(e.target.value)}><option value="all">Todos os horários</option><option value="now">Agora</option><option value="2h">± 2 horas</option><option value="today">Hoje</option></select></div></div>
    {last&&<div className="live-updated">Atualizado {new Date(last).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})} · atualização automática a cada 30s</div>}
    {error&&<div className="card live-error">⚠️ {error}<button onClick={load}>Tentar novamente</button></div>}
    {loading?<div className="live-skeletons">{[1,2,3].map(x=><div className="card live-skeleton" key={x}/>)}</div>:!grouped.length?<div className="card live-empty"><div>🏟️</div><h2>Nenhum jogo encontrado</h2><p>Quando houver partidas ao vivo, elas aparecerão aqui agrupadas por país e campeonato.</p></div>:grouped.map(([countryName,items])=><div className="live-country" key={countryName}><div className="live-country-head"><h2>{countryName}</h2><span>{items.length} jogo{items.length===1?'':'s'}</span></div>{groupLeagues(items).map(([lg,rows])=><div className="live-league" key={lg}><div className="live-league-head"><b>{lg}</b><span>{rows.length}</span></div><div className="live-games">{rows.filter(g=>league==='all'||g.league===league).map(g=><Link className="live-match-card card" href={`/live/${g.id}`} key={g.id}><div className="live-match-meta"><span className="live-pill">● AO VIVO</span><span>{g.minute!=null?`${g.minute}'`:''}</span></div><div className="live-teams"><div><b>{g.home}</b><strong>{g.homeScore??0}</strong></div><div><b>{g.away}</b><strong>{g.awayScore??0}</strong></div></div><div className="live-card-foot"><span>Ver detalhes</span><span>→</span></div></Link>)}</div></div>)}</div>)}
  </section>
}
