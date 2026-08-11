'use client';
import { useEffect, useState } from 'react';
import { getProfile } from '@/lib/api';
import type { User } from '@/types';

export default function ProfilePage(){
 const [user,setUser]=useState<User|null>(null); const [loading,setLoading]=useState(true);
 useEffect(()=>{getProfile().then(r=>setUser(r.user)).catch(()=>setUser(null)).finally(()=>setLoading(false))},[]);
 if(loading)return <section className="card feature"><p>Carregando perfil...</p></section>;
 if(!user)return <section className="card feature"><div><h1>Perfil</h1><p>Entre para acessar seu perfil.</p><button className="publish-btn" onClick={()=>window.dispatchEvent(new Event('gambly:open-login'))}>Entrar</button></div></section>;
 const initials=user.name.split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase();
 return <section className="profile-page"><div className="profile-cover card"></div><div className="card profile-page-body"><div className="avatar profile-page-avatar">{user.avatar?<img src={user.avatar} alt=""/>:initials}</div><div className="profile-page-head"><div><h1>{user.name}</h1><p>{user.handle} · Analista</p></div><button className="publish-btn" onClick={()=>window.dispatchEvent(new Event('gambly:profile-edit'))}>✎ Editar perfil</button></div><p className="profile-bio">{user.bio||'Ainda não adicionou uma bio.'}</p><div className="stats"><div><b>{user.followers||0}</b><span>Seguidores</span></div><div><b>{user.following||0}</b><span>Seguindo</span></div><div><b>{user.posts||0}</b><span>Publicações</span></div><div><b>{user.winRate||0}%</b><span>Win rate</span></div></div></div></section>
}
