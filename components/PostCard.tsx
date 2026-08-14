'use client';
import { useState } from 'react';
import type { Post } from '@/types';
import { toggleLike } from '@/lib/api';

export function PostCard({post}:{post:Post}){
 const [liked,setLiked]=useState(Boolean(post.liked)); const [likes,setLikes]=useState(post.likes||0); const [busy,setBusy]=useState(false);
 const author=post.author?.name||'Usuário GAMBLY'; const initials=author.split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase(); const ev=post.event;
 async function like(){if(busy)return;setBusy(true);try{const d=await toggleLike(post.id);setLiked(d.liked);setLikes(d.likes)}catch{}finally{setBusy(false)}}
 return <article className="post card">
  <div className="post-header"><div className="avatar">{(post as any).authorAvatar?<img src={(post as any).authorAvatar} alt=""/>:initials}</div><div className="post-author"><b>{author}</b><small>{post.author?.handle||'@gambly'} · {post.createdAt?new Date(post.createdAt).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'agora'}</small></div><button className="more-btn">•••</button></div>
  {post.title&&post.type!=='Palpite'&&<div className="post-type-label">{post.type==='Imagem'?'📷 Foto':post.type==='Jogo'?'⚽ Jogo':'📊 Análise'}</div>}
  {post.text&&<p className="post-text">{post.text}</p>}
  {post.image&&<div className="post-image-wrap"><img src={post.image} alt={post.title||'Imagem publicada no GAMBLY'} className="post-image"/></div>}
  {ev&&(post.type==='Jogo'||post.type==='Palpite'||post.type==='Análise')&&<div className="bet-card game-post-card"><div className="bet-top"><span>{ev.league}</span><span className="status">{ev.status==='live'?'● AO VIVO':ev.status==='finished'?'ENCERRADO':'AGENDADO'}</span></div><div className="match"><div className="club"><div className="club-badge">{ev.homeTeam.slice(0,2).toUpperCase()}</div><b>{ev.homeTeam}</b></div><div className="versus">{ev.homeScore!=null?`${ev.homeScore} × ${ev.awayScore}`:'VS'}</div><div className="club"><div className="club-badge">{ev.awayTeam.slice(0,2).toUpperCase()}</div><b>{ev.awayTeam}</b></div></div>{ev.status==='live'&&<div className="post-live-link"><a href={`/live/${ev.id}`}>🔴 Ver partida ao vivo →</a></div>}</div>}
  {post.type==='Palpite'&&<div className="bet-card"><div className="bet-top"><span>{post.market||'PALPITE ESPORTIVO'}</span><span className="status">● ABERTO</span></div><div className="bet-grid"><div><small>SELEÇÃO</small><b>{post.title||'Resultado final'}</b></div><div><small>ODD</small><b className="odd">{post.odd||'—'}</b></div><div><small>CONFIANÇA</small><b className="confidence">{post.confidence||82}%</b></div></div></div>}
  <div className="post-footer"><button className={liked?'liked':''} onClick={like}>♥ {likes}</button><button onClick={()=>window.dispatchEvent(new CustomEvent('gambly:comment',{detail:post.id}))}>◌ {post.comments||0}</button><button onClick={()=>navigator.clipboard?.writeText(window.location.href).catch(()=>{})}>↗ Compartilhar</button></div>
 </article>
}
