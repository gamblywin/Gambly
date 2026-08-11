'use client';
import { useEffect, useState } from 'react';
import { getMyPredictions, getMyStats, getRanking } from '@/lib/api';
import type { Prediction, RankingRow, UserStats } from '@/types';

export function PredictionHistory(){
 const [filter,setFilter]=useState('all'); const [items,setItems]=useState<any[]>([]); const [error,setError]=useState('');
 useEffect(()=>{getMyPredictions(filter).then(r=>setItems(r.predictions)).catch(e=>setError(e.message))},[filter]);
 return <section className="card feature"><div className="tabs">{['all','pending','won','lost','void'].map(x=><button className={filter===x?'active':''} key={x} onClick={()=>setFilter(x)}>{x==='all'?'Todos':x==='pending'?'Pendentes':x==='won'?'Ganhos':x==='lost'?'Perdidos':'Anulados'}</button>)}</div>{error?<p>{error}</p>:items.length?<div className="prediction-list">{items.map(p=><article className="prediction-row" key={p.id}><div><strong>{p.homeTeam} × {p.awayTeam}</strong><span>{p.selection} · odd {p.odds??'—'}</span></div><b className={`result-${p.result}`}>{p.result}</b></article>)}</div>:<p>Nenhum palpite encontrado.</p>}</section>
}

export function StatsPanel(){
 const [stats,setStats]=useState<UserStats|null>(null);
 useEffect(()=>{getMyStats().then(r=>setStats(r.stats)).catch(()=>{})},[]);
 if(!stats)return <section className="card feature"><h2>Suas estatísticas</h2><p>Faça login para carregar suas métricas.</p></section>;
 return <section className="card feature"><h2>Suas estatísticas</h2><div className="stats-grid"><div><b>{stats.total}</b><span>Palpites</span></div><div><b>{stats.won}</b><span>Acertos</span></div><div><b>{stats.lost}</b><span>Erros</span></div><div><b>{stats.winRate}%</b><span>Win rate</span></div><div><b>{stats.roi}%</b><span>ROI</span></div><div><b>{stats.streak}</b><span>Sequência</span></div></div></section>
}

export function RankingPanel(){
 const [period,setPeriod]=useState('all'); const [rows,setRows]=useState<RankingRow[]>([]);
 useEffect(()=>{getRanking(period).then(r=>setRows(r.ranking)).catch(()=>setRows([]))},[period]);
 return <section className="card feature"><div className="tabs"><button className={period==='all'?'active':''} onClick={()=>setPeriod('all')}>Geral</button><button className={period==='week'?'active':''} onClick={()=>setPeriod('week')}>Semana</button><button className={period==='month'?'active':''} onClick={()=>setPeriod('month')}>Mês</button></div>{rows.length?<div className="ranking-list">{rows.map(r=><article className="ranking-row" key={r.userId}><b>#{r.rank}</b><span className="avatar">{r.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</span><div><strong>{r.name}</strong><small>{r.handle} · {r.total} palpites</small></div><strong>{r.winRate}%</strong></article>)}</div>:<p>O ranking aparecerá quando houver palpites liquidados.</p>}</section>
}
