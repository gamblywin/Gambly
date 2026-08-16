'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Brand } from './Brand';
import { Bell, Mail, ChevronDown, UserRound, Pencil, LogOut } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { logout } from '@/lib/api';
import type { User } from '@/types';

function initials(user: User) {
  return user.name.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
}

export function Header({ user, onLogin, onRegister, onLoggedOut }:{
  user: User | null; onLogin:()=>void; onRegister:()=>void; onLoggedOut:()=>void;
}) {
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);
  async function handleLogout() {
    try { await logout(); } finally { setMenu(false); onLoggedOut(); window.location.href = '/'; }
  }
  return <header className="topbar">
    <Brand />
    <label className="global-search"><span>⌕</span><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') window.dispatchEvent(new CustomEvent('gambly:search',{detail:q}))}} placeholder="Buscar pessoas, análises, times..." /></label>
    <div className="top-actions">
      <ThemeToggle />
      {user ? <>
        <button className="icon-btn" title="Notificações" onClick={()=>window.location.href='/notifications'}><Bell size={19} strokeWidth={2}/><i className="badge">3</i></button>
        <button className="icon-btn" title="Mensagens" onClick={()=>window.location.href='/messages' }><Mail size={19} strokeWidth={2}/></button>
        <div className="account-wrap">
          <button className="account-btn" onClick={()=>setMenu(v=>!v)} aria-label="Abrir menu da conta">
            {user.avatar ? <img src={user.avatar} alt=""/> : <span>{initials(user)}</span>}
            <strong>{user.name.split(' ')[0]}</strong><b><ChevronDown size={14}/></b>
          </button>
          {menu && <div className="account-menu">
            <div className="account-summary"><span className="avatar">{user.avatar ? <img src={user.avatar} alt=""/> : initials(user)}</span><div><strong>{user.name}</strong><small>{user.handle}</small></div></div>
            <Link className="account-menu-link" href="/profile" onClick={()=>setMenu(false)}><UserRound size={14}/> Meu perfil</Link>
            <button onClick={()=>{setMenu(false);window.dispatchEvent(new Event('gambly:profile-edit'))}}><Pencil size={14}/> Editar perfil</button>
            <button onClick={handleLogout}><LogOut size={14}/> Sair da conta</button>
          </div>}
        </div>
      </> : <>
        <button className="register-btn" onClick={onRegister}>Criar conta</button>
        <button className="login-btn" onClick={onLogin}>Entrar</button>
      </>}
    </div>
  </header>;
}
