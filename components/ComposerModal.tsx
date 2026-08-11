'use client';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPost, createPrediction, createPredictionSlip, getEvents } from '@/lib/api';
import type { Event, User } from '@/types';

type EventOption = Event & {homeTeam:string;awayTeam:string;league:string};
type Leg = { eventId:string; type:string; selection:string; playerName?:string; odds?:number };
type Mode = 'analysis'|'game'|'image'|'prediction';

export function ComposerModal({open,onClose,initialMode='analysis',user}:{open:boolean;onClose:()=>void;initialMode?:Mode;user:User|null}){
  const [mode,setMode]=useState<Mode>(initialMode);
  const [events,setEvents]=useState<EventOption[]>([]); const [eventId,setEventId]=useState('');
  const [type,setType]=useState('winner'); const [selection,setSelection]=useState(''); const [playerName,setPlayerName]=useState(''); const [odds,setOdds]=useState('2.10');
  const [text,setText]=useState(''); const [multi,setMulti]=useState(false); const [legs,setLegs]=useState<Leg[]>([]);
  const [title,setTitle]=useState('Palpite múltiplo'); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const [image,setImage]=useState(''); const [imageName,setImageName]=useState('');
  const fileRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{ if(open){setMode(initialMode);setError('');setLegs([]);setPlayerName('');setMulti(false);setTitle('Palpite múltiplo');setText('');setImage('');setImageName('');getEvents().then(r=>{setEvents(r.events as any);setEventId(r.events[0]?.id||'');}).catch(()=>setEvents([]));} },[open,initialMode]);
  const selected=events.find(e=>e.id===eventId);
  const selections=useMemo(()=>{ if(!selected)return []; if(type.startsWith('player_')){if(!playerName.trim())return[]; if(['player_anytime_score','player_to_be_booked'].includes(type))return[playerName.trim()]; return['Over 0.5','Over 1.5','Over 2.5','Under 0.5','Under 1.5','Under 2.5'].map(x=>`${playerName.trim()} ${x}`);} if(type==='winner')return[selected.homeTeam,selected.awayTeam]; if(type==='draw')return['Empate']; if(type==='double_chance')return['1X','X2','12']; if(type==='first_half_winner')return['Casa','Empate','Fora']; if(type==='both_teams_score')return['Sim','Não']; if(type==='exact_score')return['1-0','2-0','2-1','1-1','0-1','0-2','1-2']; const lines=type==='corners_over_under'?['4.5','5.5','6.5','7.5','8.5','9.5','10.5','11.5']:type==='cards_over_under'?['1.5','2.5','3.5','4.5','5.5','6.5']:type==='shots_on_target_over_under'?['2.5','3.5','4.5','5.5','6.5','7.5']:type==='total_shots_over_under'?['15.5','17.5','19.5','21.5','23.5','25.5']:type==='offsides_over_under'?['1.5','2.5','3.5','4.5','5.5']:type==='fouls_over_under'?['15.5','19.5','23.5','27.5','31.5']:type==='team_goals_over_under'?['0.5','1.5','2.5','3.5']:['0.5','1.5','2.5','3.5','4.5']; if(type==='team_goals_over_under')return lines.flatMap(x=>[`Casa Over ${x}`,`Casa Under ${x}`,`Fora Over ${x}`,`Fora Under ${x}`]); if(['over_under','corners_over_under','cards_over_under','shots_on_target_over_under','total_shots_over_under','offsides_over_under','fouls_over_under'].includes(type))return lines.flatMap(x=>[`Over ${x}`,`Under ${x}`]); return []; },[selected,type,playerName]);
  const addLeg=()=>{if(!eventId||!selection)return setError('Escolha o jogo e a seleção.');if(legs.some(x=>x.eventId===eventId))return setError('Esse jogo já está no palpite múltiplo.');const n=Number(odds);if(!Number.isFinite(n)||n<=0)return setError('Informe uma odd válida.');if(legs.length>=10)return setError('O palpite múltiplo aceita no máximo 10 seleções.');setLegs([...legs,{eventId,type,selection,playerName:playerName.trim()||undefined,odds:n}]);setSelection('');setPlayerName('');setError('');};
  const removeLeg=(id:string)=>setLegs(legs.filter(x=>x.eventId!==id));
  const changeMode=(next:Mode)=>{setMode(next);setError('');if(next==='image')setTimeout(()=>fileRef.current?.click(),80)};
  const handleFile=(file?:File)=>{if(!file)return;if(!file.type.startsWith('image/'))return setError('Escolha uma imagem JPG, PNG ou WEBP.');if(file.size>2.5*1024*1024)return setError('A imagem precisa ter no máximo 2,5 MB.');const reader=new FileReader();reader.onload=()=>{setImage(String(reader.result||''));setImageName(file.name);setError('')};reader.readAsDataURL(file)};

  async function submit(e:FormEvent){
    e.preventDefault(); if(!user)return setError('Entre na sua conta para publicar.'); setBusy(true);setError('');
    try{
      if(mode==='image'){
        if(!image)throw new Error('Escolha uma imagem antes de publicar.');
        await createPost({type:'Imagem',title:'Foto da comunidade',text:text.trim(),image});
      } else if(mode==='game'){
        if(!eventId)throw new Error('Escolha um jogo.');
        if(!text.trim())throw new Error('Escreva algo sobre o jogo.');
        await createPost({type:'Jogo',title:`${selected?.homeTeam||'Casa'} × ${selected?.awayTeam||'Fora'}`,text:text.trim(),eventId});
      } else if(mode==='analysis'){
        if(!text.trim())throw new Error('Escreva sua análise antes de publicar.');
        await createPost({type:'Análise',title:'Nova análise',text:text.trim(),eventId:eventId||undefined});
      } else {
        if(multi){
          const all=selection?[...legs,{eventId,type,selection,playerName:playerName.trim()||undefined,odds:Number(odds)}]:legs;
          if(all.length<2)throw new Error('Adicione pelo menos 2 seleções ao palpite múltiplo.');
          if(all.some(x=>!x.eventId||!x.selection||!Number.isFinite(Number(x.odds))))throw new Error('Revise as seleções e odds do múltiplo.');
          const r=await createPredictionSlip({title,items:all});
          if(text.trim())await createPost({type:'Palpite',title:`${title} — ${all.length} seleções`,text:text.trim(),market:'Múltiplo',odd:Number(all.reduce((acc,x)=>acc*Number(x.odds||1),1).toFixed(2)),predictionId:r.predictions[0]?.id,slipId:r.slip.id});
        } else {
          if(!eventId||!selection)throw new Error('Escolha o jogo e a seleção do palpite.');
          const n=Number(odds);if(!Number.isFinite(n)||n<=0)throw new Error('Informe uma odd válida.');
          const r=await createPrediction({eventId,type,selection,playerName:playerName.trim()||undefined,odds:n});
          if(text.trim())await createPost({type:'Palpite',title:`Palpite: ${selection}`,text:text.trim(),market:type,odd:n,predictionId:r.prediction.id});
        }
      }
      onClose();window.location.reload();
    }catch(err){setError(err instanceof Error?err.message:'Não foi possível publicar.')}finally{setBusy(false)}
  }
  if(!open)return null;
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="composer-modal composer-pro"><button className="modal-close" onClick={onClose}>×</button>
    <div className="composer-heading"><div><span className="eyebrow">NOVA PUBLICAÇÃO</span><h2>{mode==='prediction'?'Criar palpite':mode==='image'?'Publicar foto':mode==='game'?'Compartilhar jogo':'Criar análise'}</h2><p>Escolha o formato e publique algo que a comunidade possa acompanhar.</p></div>{user && <span className="composer-user">{user.avatar ? <img src={user.avatar} alt=""/> : user.name.slice(0,1).toUpperCase()}</span>}</div>
    <div className="composer-mode-tabs">
      {([['analysis','📊 Análise'],['game','⚽ Jogo'],['image','📷 Imagem'],['prediction','🎯 Palpite']] as [Mode,string][]).map(([m,label])=><button type="button" key={m} className={mode===m?'active':''} onClick={()=>changeMode(m)}>{label}</button>)}
    </div>
    {error&&<div className="auth-error">{error}</div>}
    <form onSubmit={submit}>
      {mode==='analysis'&&<><label>Texto da análise<textarea value={text} onChange={e=>setText(e.target.value)} placeholder="O que você está vendo nesse jogo? Compartilhe sua leitura..." rows={6} autoFocus/></label><div className="helper-row"><span>💡 Seja objetivo e explique sua leitura.</span><b>{text.length}/1000</b></div></>}
      {mode==='game'&&<><label>Jogo<select value={eventId} onChange={e=>setEventId(e.target.value)}>{events.map(e=><option key={e.id} value={e.id}>{e.homeTeam} × {e.awayTeam} — {e.league}</option>)}</select></label><label>Comentário<textarea value={text} onChange={e=>setText(e.target.value)} placeholder="O que você espera desse jogo?" rows={5}/></label></>}
      {mode==='image'&&<><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>handleFile(e.target.files?.[0])}/><button type="button" className="image-dropzone" onClick={()=>fileRef.current?.click()}>{image?<img src={image} alt="Prévia da publicação"/>:<><span>📷</span><strong>Escolha uma foto</strong><small>JPG, PNG ou WEBP · até 2,5 MB</small></>}</button>{image&&<div className="image-file-row"><span>{imageName}</span><button type="button" onClick={()=>{setImage('');setImageName('')}}>Remover</button></div>}<label>Legenda<textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Adicione uma legenda para sua foto..." rows={4}/></label></>}
      {mode==='prediction'&&<>
        <div className="format-switch"><button type="button" className={!multi?'active':''} onClick={()=>setMulti(false)}>Palpite simples</button><button type="button" className={multi?'active':''} onClick={()=>setMulti(true)}>Palpite múltiplo</button></div>
        {multi&&<label>Título do múltiplo<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={120}/></label>}
        <label>Jogo<select value={eventId} onChange={e=>{setEventId(e.target.value);setSelection('')}}>{events.map(e=><option key={e.id} value={e.id}>{e.homeTeam} × {e.awayTeam} — {e.league}</option>)}</select></label>
        {type.startsWith('player_')&&<label>Jogador<input value={playerName} onChange={e=>{setPlayerName(e.target.value);setSelection('')}} placeholder="Nome do jogador" autoComplete="off"/></label>}
        <div className="form-grid"><label>Tipo<select value={type} onChange={e=>{setType(e.target.value);setSelection('');setPlayerName('')}}><option value="winner">Vencedor</option><option value="draw">Empate</option><option value="double_chance">Dupla chance</option><option value="first_half_winner">Vencedor 1º tempo</option><option value="over_under">Gols — Mais/Menos</option><option value="both_teams_score">Ambas marcam</option><option value="corners_over_under">Escanteios — Mais/Menos</option><option value="cards_over_under">Cartões — Mais/Menos</option><option value="shots_on_target_over_under">Chutes no alvo — Mais/Menos</option><option value="total_shots_over_under">Chutes totais — Mais/Menos</option><option value="offsides_over_under">Impedimentos — Mais/Menos</option><option value="fouls_over_under">Faltas — Mais/Menos</option><option value="team_goals_over_under">Gols da equipe — Mais/Menos</option><option value="exact_score">Placar exato</option><option value="player_anytime_score">Jogador marca a qualquer momento</option><option value="player_goals">Gols do jogador — Mais/Menos</option><option value="player_assists">Assistências do jogador — Mais/Menos</option><option value="player_shots_on_target">Chutes no alvo do jogador — Mais/Menos</option><option value="player_shots">Chutes do jogador — Mais/Menos</option><option value="player_to_be_booked">Jogador recebe cartão</option><option value="player_cards">Cartões do jogador — Mais/Menos</option><option value="player_red_cards">Cartão vermelho do jogador — Mais/Menos</option><option value="player_passes">Passes do jogador — Mais/Menos</option><option value="player_tackles">Desarmes do jogador — Mais/Menos</option><option value="player_fouls">Faltas do jogador — Mais/Menos</option></select></label><label>Seleção<select value={selection} onChange={e=>setSelection(e.target.value)}><option value="">Selecione</option>{selections.map(x=><option key={x}>{x}</option>)}</select></label></div>
        <div className="form-grid"><label>Odd<input value={odds} onChange={e=>setOdds(e.target.value)} inputMode="decimal"/></label><label>Comentário<textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Por que você acredita nesse palpite?" rows={3}/></label></div>
        {multi&&<><button type="button" className="outline-btn add-leg-btn" onClick={addLeg}>＋ Adicionar seleção ao múltiplo</button><div className="slip-legs">{legs.map((leg,i)=>{const ev=events.find(x=>x.id===leg.eventId);return <div className="slip-leg" key={leg.eventId}><span className="leg-number">{i+1}</span><span><b>{ev?.homeTeam||'Casa'} × {ev?.awayTeam||'Fora'}</b><small>{leg.selection} · odd {Number(leg.odds).toFixed(2)}</small></span><button type="button" onClick={()=>removeLeg(leg.eventId)}>×</button></div>})}</div><small className="slip-count">{legs.length} seleção(ões) adicionada(s) · máximo 10</small></>}
      </>}
      <button className="auth-submit composer-submit" disabled={busy||!user}>{busy?'Publicando...':mode==='prediction'?(multi?'Registrar palpite múltiplo':'Registrar palpite'):'Publicar no GAMBLY'}</button>
      {!user&&<small className="login-hint">Entre ou crie sua conta para publicar.</small>}
    </form>
  </section></div>
}
