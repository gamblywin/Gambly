'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getLiveGames } from '@/lib/api';
import type { LiveGame, User } from '@/types';
function Logo({src,name}:{src?:string;name:string}){return <span className="rail-logo">{src?<img src={src} alt="" loading="lazy" width={22} height={22}/>:name.split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase()}</span>}
export function RightRail({user,authReady,onLogin}:{user:User|null;authReady:boolean;onLogin:()=>void}){
 const [games,setGames]=useState<LiveGame[]>([]);
 useEffect(()=>{let active=true;const load=()=>getLiveGames({status:'live'}).then(r=>{if(active)setGames((r.games||[]).slice(0,6))}).catch(()=>{});load();const t=window.setInterval(load,30000);return()=>{active=false;window.clearInterval(t)}},[]);
 const leagues=Array.from(new Set(games.map(g=>g.league))).slice(0,5);
 return <aside className="rightbar sports-rightbar">
  <div className="card right-sports"><div className="section-head compact"><h3>AO VIVO AGORA</h3><Link href="/live">Ver todos</Link></div><div className="rail-sport-tabs"><span className="active">◉ Todos</span><span>⚽ Futebol</span><span>🏀 Basquete</span><span>🎾 Tênis</span></div>{games.length?games.map(g=><Link href={`/live/${g.id}`} className="rail-game" key={g.id}><div className="rail-league"><span>{g.league}</span><b>{g.minute!=null?`${g.minute}'`:'LIVE'}</b></div><div className="rail-team"><Logo src={g.homeLogo} name={g.home}/><b>{g.home}</b><strong>{g.homeScore??0}</strong></div><div className="rail-team"><Logo src={g.awayLogo} name={g.away}/><b>{g.away}</b><strong>{g.awayScore??0}</strong></div><span className="rail-arrow">›</span></Link>):<div className="right-empty">Nenhum jogo ao vivo no momento.</div>}<Link href="/live" className="rail-all">Ver todos os jogos ao vivo →</Link></div>
  <div className="card trends"><div className="section-head compact"><h3>EM ALTA NA GAMBLY</h3><Link href="/ranking">Ver ranking</Link></div>{leagues.length?leagues.map((x,i)=><Link href="/live" className="trend" key={x}><small>↗ #{x}</small><b>{games.filter(g=>g.league===x).length} partidas</b><span>Explorar →</span></Link>):<div className="right-empty">Os campeonatos em alta aparecerão aqui.</div>}</div>
  {!user&&authReady&&<div className="card guest-card"><h3>Entre no GAMBLY</h3><p>Acompanhe jogos, publique análises e siga seus campeonatos.</p><button className="publish-btn" onClick={onLogin}>Entrar</button></div>}
 </aside>
}
