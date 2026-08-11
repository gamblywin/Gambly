'use client';
import { useState } from 'react';
import type { Post } from '@/types';
import { toggleLike } from '@/lib/api';

export function PostCard({post}:{post:Post}){
 const [liked,setLiked]=useState(false); const [likes,setLikes]=useState(post.likes||0); const [busy,setBusy]=useState(false);
 const author=post.author?.name||'Usuário GAMBLY'; const initials=author.split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase();
 async function like(){if(busy)return;setBusy(true);try{const d=await toggleLike(post.id);setLiked(d.liked);setLikes(d.likes)}catch{}finally{setBusy(false)}}
 return <article className="post card">
  <div className="post-header"><div className="avatar">{(post as any).authorAvatar?<img src={(post as any).authorAvatar} alt=""/>:initials}</div><div className="post-author"><b>{author}</b><small>{post.handle||'@gambly'} · agora</small></div><button className="more-btn">•••</button></div>
  {post.title&&post.type!=='Palpite'&&<div className="post-type-label">{post.type==='Imagem'?'📷 Foto':post.type==='Jogo'?'⚽ Jogo':'📊 Análise'}</div>}
  {post.text&&<p className="post-text">{post.text}</p>}
  {post.image&&<div className="post-image-wrap"><img src={post.image} alt={post.title||'Imagem publicada no GAMBLY'} className="post-image"/></div>}
  {post.type==='Jogo'&&<div className="bet-card game-post-card"><div className="bet-top"><span>JOGO COMPARTILHADO</span><span className="status">● ACOMPANHANDO</span></div><div className="match"><div className="club"><div className="club-badge">FC</div><b>Flamengo</b></div><div className="versus">VS</div><div className="club"><div className="club-badge">PAL</div><b>Palmeiras</b></div></div></div>}
  {post.type==='Palpite'&&<div className="bet-card"><div className="bet-top"><span>{post.market||'PALPITE ESPORTIVO'}</span><span className="status">● ABERTO</span></div><div className="match"><div className="club"><div className="club-badge">FC</div><b>Flamengo</b></div><div className="versus">VS</div><div className="club"><div className="club-badge">PAL</div><b>Palmeiras</b></div></div><div className="bet-grid"><div><small>SELEÇÃO</small><b>{post.title||'Resultado final'}</b></div><div><small>ODD</small><b className="odd">{post.odd||'—'}</b></div><div><small>CONFIANÇA</small><b className="confidence">{post.confidence||82}%</b></div></div></div>}
  <div className="post-footer"><button className={liked?'liked':''} onClick={like}>♥ {likes}</button><button onClick={()=>window.dispatchEvent(new CustomEvent('gambly:comment',{detail:post.id}))}>◌ {post.comments||0}</button><button onClick={()=>navigator.clipboard?.writeText(window.location.href).catch(()=>{})}>↗ Compartilhar</button></div>
 </article>
}
