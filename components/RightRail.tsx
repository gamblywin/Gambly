'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getLiveGames } from '@/lib/api';
import type { LiveGame, User } from '@/types';

export function RightRail({ user, authReady, onLogin }:{user:User|null;authReady:boolean;onLogin:()=>void}){
 const [live,setLive]=useState<LiveGame[]>([]);
 useEffect(()=>{getLiveGames().then(r=>setLive((r.games||[]).slice(0,3))).catch(()=>{});const t=window.setInterval(()=>getLiveGames().then(r=>setLive((r.games||[]).slice(0,3))).catch(()=>{}),30000);return()=>window.clearInterval(t)},[]);
 return <aside className="rightbar">
  {user ? <div className="card profile-card"><div className="cover"></div><div className="profile-body"><div className="avatar avatar-lg">{user.avatar ? <img src={user.avatar} alt=""/> : user.name.split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()}</div><h2>{user.name}</h2><small>{user.handle} · Analista</small><div className="stats"><div><b>{user.followers||0}</b><span>Seguidores</span></div><div><b>{user.following||0}</b><span>Seguindo</span></div><div><b>{user.winRate||0}%</b><span>Win rate</span></div></div><Link href="/profile" className="outline-btn profile-link">Meu perfil →</Link></div></div> : authReady ? <div className="card guest-card"><span className="guest-icon">◉</span><h3>Entre no GAMBLY</h3><p>Crie seu perfil, acompanhe jogos e participe da comunidade.</p><button className="publish-btn" onClick={onLogin}>Entrar</button></div> : null}
  <div className="card live-card"><div className="section-head compact"><h3>🔴 Ao vivo agora</h3><Link href="/live">Ver todos</Link></div>{live.length?live.map(g=><Link href={`/live/${g.id}`} className="live-match" key={g.id}><div><b>{g.home}</b><span>{g.homeScore??0}</span></div><strong>{g.minute!=null?`${g.minute}'`:'LIVE'}</strong><div><b>{g.away}</b><span>{g.awayScore??0}</span></div></Link>):<div className="right-empty">Nenhum jogo ao vivo agora.</div>}</div>
  <div className="card trends"><div className="section-head compact"><h3>🏆 Competições ao vivo</h3><Link href="/live">Explorar</Link></div>{Array.from(new Set(live.map(g=>g.league))).slice(0,4).map((x,i)=><Link href="/live" className="trend" key={x}><small>#{i+1} · ao vivo</small><b>{x}</b><span>Ver partidas →</span></Link>)}{!live.length&&<div className="right-empty">Os campeonatos aparecem aqui quando houver partidas.</div>}</div>
 </aside>
}
