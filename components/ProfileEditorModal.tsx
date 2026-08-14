'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { getProfile, updateProfile } from '@/lib/api';
import type { User } from '@/types';

export function ProfileEditorModal({open,user,onClose,onSaved}:{open:boolean;user:User|null;onClose:()=>void;onSaved:(user:User)=>void}){
 const [name,setName]=useState(user?.name||''); const [handle,setHandle]=useState((user?.handle||'').replace(/^@/,'')); const [bio,setBio]=useState(user?.bio||''); const [avatar,setAvatar]=useState(user?.avatar||''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const fileRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(open){setName(user?.name||'');setHandle((user?.handle||'').replace(/^@/,''));setBio(user?.bio||'');setAvatar(user?.avatar||'');setError('');}},[open,user]);
 const file=(f?:File)=>{if(!f)return;if(!f.type.startsWith('image/'))return setError('Escolha uma imagem válida.');if(f.size>2.5*1024*1024)return setError('A foto precisa ter no máximo 2,5 MB.');const r=new FileReader();r.onload=()=>setAvatar(String(r.result||''));r.readAsDataURL(f)};
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await updateProfile({name,handle,bio,avatar});onSaved(r.user);onClose();}catch(err){setError(err instanceof Error?err.message:'Não foi possível atualizar seu perfil.')}finally{setBusy(false)}}
 if(!open)return null;
 return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="auth-modal profile-editor"><button className="modal-close" onClick={onClose}>×</button><span className="eyebrow">MINHA CONTA</span><h1>Editar perfil</h1><p>Atualize seus dados e a foto que aparece na comunidade.</p><form onSubmit={submit}>
   <div className="profile-avatar-editor"><button type="button" className="avatar avatar-edit" onClick={()=>fileRef.current?.click()}>{avatar?<img src={avatar} alt="Prévia"/>:<span>{name.split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()||'G'}</span>}<i>📷</i></button><input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>file(e.target.files?.[0])}/><div><strong>Foto do perfil</strong><small>JPG, PNG ou WEBP · até 2,5 MB</small></div></div>
   <label>Nome<input value={name} onChange={e=>setName(e.target.value)} required/></label><label>Usuário<input value={handle} onChange={e=>setHandle(e.target.value)} required/></label><label>Bio<textarea value={bio} onChange={e=>setBio(e.target.value)} rows={4} maxLength={280} placeholder="Fale um pouco sobre você..."/></label>{error&&<div className="form-error">{error}</div>}<button className="auth-submit" disabled={busy}>{busy?'Salvando...':'Salvar alterações'}</button>
 </form></section></div>
}
