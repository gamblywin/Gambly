'use client';

import Link from 'next/link';

const items = [
  ['⌂', 'Início', '/'], ['⚽', 'Ao vivo', '/live'], ['◉', 'Explorar', '/explore'],
  ['◷', 'Histórico', '/history'], ['▥', 'Estatísticas', '/stats'],
  ['🏆', 'Ranking', '/ranking'], ['♧', 'Notificações', '/notifications'], ['✉', 'Mensagens', '/messages'],
  ['👥', 'Comunidades', '/communities'], ['◆', 'Grupos Premium', '/premium'],
];

export function Sidebar({ active, authenticated }:{ active:string; authenticated:boolean }) {
  const visible = items.filter(([,label]) => authenticated || (label !== 'Notificações' && label !== 'Mensagens'));
  return <aside className="sidebar">
    <button className="create-main" onClick={() => window.dispatchEvent(new CustomEvent('gambly:compose',{detail:{mode:'analysis'}}))}>＋ Nova publicação</button>
    <nav className="main-nav">
      {visible.map(([icon,label,href]) => <Link key={label} href={href} className={'nav-item ' + (active===label?'active':'')}>
        <span>{icon}</span>{label}
        {label==='Notificações' && <em>NOVO</em>}
        {label==='Grupos Premium' && <em>PREMIUM</em>}
      </Link>)}
    </nav>
    <div className="sidebar-section">
      <p className="section-title">ACOMPANHE</p>
      <div className="team-mini"><span className="team-logo">FC</span>Flamengo <b>LIVE</b></div>
      <div className="team-mini"><span className="team-logo">PAL</span>Palmeiras <b>+2</b></div>
    </div>
    <div className="sidebar-bottom"><div className="mini-banner"><strong>GAMBLY Premium</strong><span>Mais recursos para quem leva suas análises a sério.</span><Link href="/premium">Conhecer →</Link></div></div>
  </aside>;
}
