'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getFeed, getMe, getSportsFeed } from '@/lib/api';
import type { LiveGame, Post, User } from '@/types';
import { PostCard } from './PostCard';

function initials(name='') { return name.split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase() || '⚽'; }
function Logo({game, side}:{game:LiveGame;side:'home'|'away'}) {
  const src=side==='home'?game.homeLogo:game.awayLogo;
  const name=side==='home'?game.home:game.away;
  return <span className="sports-logo">{src ? <img src={src} alt="" loading="lazy" width={44} height={44} /> : <b>{initials(name)}</b>}</span>;
}
function statusText(g:LiveGame){ if(g.status==='live') return g.minute!=null?`${g.minute}'`:'AO VIVO'; if(g.status==='finished') return 'ENCERRADO'; return g.startTime?new Date(g.startTime).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'AGENDADO'; }
function statusLabel(g:LiveGame){ return g.status==='live'?'AO VIVO':g.status==='finished'?'ENCERRADO':'PRÓXIMO'; }

function StatusStrip({games,user}:{games:LiveGame[];user:User|null}){
  const items=useMemo(()=>games.slice(0,8),[games]);
  const [active,setActive]=useState(0);
  useEffect(()=>{ if(!items.length)return; const t=window.setInterval(()=>setActive(v=>(v+1)%items.length),5000); return()=>window.clearInterval(t)},[items.length]);
  return <section className="sports-status card">
    <div className="status-progress" aria-hidden>{items.length?items.map((_,i)=><span className={i===active?'active':''} key={i}/>):<span className="active"/>}</div>
    <div className="status-row">
      <Link href={user?'/profile':'/'} className="status-item story-user"><span className="status-ring"><span className="status-avatar">{user?.avatar?<img src={user.avatar} alt=""/>:initials(user?.name||'Seu story')}</span></span><small>Seu story</small></Link>
      {items.map((g,i)=><Link href={`/live/${g.id}`} className={'status-item '+(i===active?'selected':'')} key={g.id}><span className="status-ring"><Logo game={g} side="home"/>{g.status==='live'&&<em>LIVE</em>}</span><small>{g.homeShortName||g.home}</small></Link>)}
      {!items.length&&<div className="status-empty">Carregando jogos e competições...</div>}
    </div>
  </section>
}

function MainGames({games}:{games:LiveGame[]}){
  const [index,setIndex]=useState(0);
  const [paused,setPaused]=useState(false);
  const visible=Math.min(4,Math.max(1,games.length));
  useEffect(()=>{setIndex(0)},[games.length]);
  useEffect(()=>{if(paused||games.length<=visible)return; const t=window.setInterval(()=>setIndex(v=>(v+1)%games.length),7000); return()=>window.clearInterval(t)},[paused,games.length,visible]);
  const cards=games.length ? Array.from({length:Math.min(games.length,Math.max(visible,1))},(_,offset)=>games[(index+offset)%games.length]) : [];
  return <section className="sports-main" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}>
    <div className="sports-section-title"><div><span>🔥</span><strong>PRINCIPAIS JOGOS</strong><small>{games.length?'AO VIVO E DESTAQUES':'CARREGANDO'}</small></div><Link href="/live">Ver todos →</Link></div>
    <div className="sports-carousel">
      <button className="carousel-arrow left" disabled={!games.length} onClick={()=>setIndex(v=>(v-1+games.length)%games.length)} aria-label="Jogo anterior">‹</button>
      <div className="sports-card-track">
        {cards.map(g=><Link href={`/live/${g.id}`} className="sports-game-card" key={`${g.id}-${index}`}>
          <div className="game-league"><span>{g.league||'Futebol'}</span><span>{g.status==='live'?'🔴 AO VIVO':statusText(g)}</span></div>
          <div className="game-teams"><div><Logo game={g} side="home"/><b>{g.home}</b></div><strong>{g.homeScore??'—'} <i>×</i> {g.awayScore??'—'}</strong><div><Logo game={g} side="away"/><b>{g.away}</b></div></div>
          <div className="game-live"><span>{statusLabel(g)}</span><b>{statusText(g)}</b></div>
          <div className="game-details">Ver detalhes</div>
        </Link>)}
        {!games.length&&<div className="sports-no-games">Aguardando partidas reais do provedor esportivo...</div>}
      </div>
      <button className="carousel-arrow right" disabled={!games.length} onClick={()=>setIndex(v=>(v+1)%games.length)} aria-label="Próximo jogo">›</button>
    </div>
    <div className="sports-dots">{games.slice(0,Math.min(games.length,8)).map((_,i)=><button key={i} className={i===index%Math.max(1,Math.min(games.length,8))?'active':''} onClick={()=>setIndex(i)} aria-label={`Ir para jogo ${i+1}`}/>)}</div>
    <div className="sports-refresh">↻ Dados em cache · rotação visual sem nova requisição</div>
  </section>
}

export function Feed() {
  const [user,setUser]=useState<User|null>(null),[posts,setPosts]=useState<Post[]>([]),[loading,setLoading]=useState(true),[more,setMore]=useState(false),[offset,setOffset]=useState(0);
  const [sports,setSports]=useState<LiveGame[]>([]),[sportsLoading,setSportsLoading]=useState(true);
  useEffect(()=>{let alive=true;const refresh=()=>getMe().then(r=>{if(alive)setUser(r.user)}).catch(()=>{if(alive)setUser(null)});refresh();const onAuth=()=>refresh();const onPost=(event:Event)=>{const post=(event as CustomEvent).detail;if(post?.id)setPosts(current=>[post,...current.filter(x=>x.id!==post.id)])};window.addEventListener('gambly:auth-refresh',onAuth);window.addEventListener('gambly:post-created',onPost);return()=>{alive=false;window.removeEventListener('gambly:auth-refresh',onAuth);window.removeEventListener('gambly:post-created',onPost)}},[]);
  useEffect(()=>{getFeed(0).then(d=>{setPosts(d.posts||[]);setMore(!!d.hasMore)}).catch(()=>{}).finally(()=>setLoading(false));},[]);
  useEffect(()=>{let alive=true;const load=()=>getSportsFeed().then(d=>{if(alive)setSports(d.games||[])}).catch(()=>{}).finally(()=>{if(alive)setSportsLoading(false)});load();const t=window.setInterval(load,45000);return()=>{alive=false;window.clearInterval(t)}},[]);
  async function load(){const next=offset+10;try{const d=await getFeed(next);setPosts(p=>[...p,...(d.posts||[])]);setOffset(next);setMore(!!d.hasMore)}catch{}}
  return <section className="feed sports-feed"><StatusStrip games={sports} user={user}/><MainGames games={sports}/>
    <div className="composer card">{user?<><div className="composer-top"><div className="avatar composer-avatar">{user.avatar?<img src={user.avatar} alt=""/>:initials(user.name)}</div><button className="composer-input" onClick={()=>window.dispatchEvent(new Event('gambly:compose'))}>O que você está pensando?</button></div><div className="composer-actions"><button onClick={()=>window.dispatchEvent(new CustomEvent('gambly:compose',{detail:{mode:'image'}}))}>▧ Imagem</button><button onClick={()=>window.dispatchEvent(new CustomEvent('gambly:compose',{detail:{mode:'game'}}))}>▣ Vídeo</button><button onClick={()=>window.dispatchEvent(new CustomEvent('gambly:compose',{detail:{mode:'analysis'}}))}>☷ Enquete</button><button onClick={()=>window.dispatchEvent(new CustomEvent('gambly:compose',{detail:{mode:'prediction'}}))}>♧ Palpite</button><button className="publish-btn" onClick={()=>window.dispatchEvent(new CustomEvent('gambly:compose',{detail:{mode:'analysis'}}))}>Publicar</button></div></>:<div className="guest-composer"><div><strong>Quer compartilhar algo?</strong><span>Entre ou crie sua conta para publicar análises, jogos e fotos.</span></div><button className="publish-btn" onClick={()=>window.dispatchEvent(new Event('gambly:open-login'))}>Entrar</button></div>}</div>
    {loading?<div className="card loading">Carregando seu feed...</div>:posts.length?posts.map(p=><PostCard key={p.id} post={p}/>):<div className="card empty"><b>Seu feed está pronto.</b><span>Publique a primeira análise ou siga outros apostadores para personalizá-lo.</span><button onClick={()=>window.dispatchEvent(new CustomEvent('gambly:compose',{detail:{mode:'analysis'}}))}>Criar publicação</button></div>}
    {more&&<button className="load-more" onClick={load}>Carregar mais</button>}
  </section>
}
