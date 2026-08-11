'use client';
import Link from 'next/link';
import type { User } from '@/types';

export function RightRail({ user, authReady, onLogin }:{user:User|null;authReady:boolean;onLogin:()=>void}){
  return <aside className="rightbar">
    {user ? <div className="card profile-card"><div className="cover"></div><div className="profile-body">
      <div className="avatar avatar-lg">{user.avatar ? <img src={user.avatar} alt=""/> : user.name.split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()}</div>
      <h2>{user.name}</h2><small>{user.handle} · Analista</small>
      <div className="stats"><div><b>{user.followers||0}</b><span>Seguidores</span></div><div><b>{user.following||0}</b><span>Seguindo</span></div><div><b>{user.winRate||0}%</b><span>Win rate</span></div></div>
      <Link href="/profile" className="outline-btn profile-link">Meu perfil →</Link>
    </div></div> : authReady ? <div className="card guest-card"><span className="guest-icon">◉</span><h3>Entre no GAMBLY</h3><p>Crie seu perfil, acompanhe jogos e participe da comunidade.</p><button className="publish-btn" onClick={onLogin}>Entrar</button></div> : null}
    <div className="card live-card"><div className="section-head compact"><h3>⚡ Ao vivo agora</h3><Link href="/live">Ver todos</Link></div>
      <div className="live-match"><div><b>Flamengo</b><span>1</span></div><strong>72'</strong><div><b>Palmeiras</b><span>0</span></div></div>
      <div className="live-match"><div><b>Real Madrid</b><span>2</span></div><strong>2T</strong><div><b>Barcelona</b><span>2</span></div></div>
    </div>
    <div className="card trends"><div className="section-head compact"><h3>🔥 Em alta</h3><Link href="/explore">Explorar</Link></div>{['Flamengo x Palmeiras','Champions League','Odds do fim de semana'].map((x,i)=><div className="trend" key={x}><small>#{i+1} · agora</small><b>{x}</b><span>{12+i*7} mil análises</span></div>)}</div>
  </aside>
}
