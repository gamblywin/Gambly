/* BetSocial v0.7 — realtime SSE + live sports + server-first UX */
(() => {
  const API='/api', KEY='betsocial_v08_token';
  let token=localStorage.getItem(KEY)||sessionStorage.getItem(KEY);
  const $=s=>document.querySelector(s);
  const api=async(path,opts={})=>{const h={'Content-Type':'application/json',...(opts.headers||{})};if(token)h.Authorization='Bearer '+token;const r=await fetch(API+path,{...opts,headers:h});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Falha na API');return d};
  const toast=v=>{const t=$('#toast');if(t){t.textContent=v;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}};

  async function connectRealtime(){
    if(!token||!window.EventSource)return;
    try{
      const d=await api('/realtime/token',{method:'POST'});
      const es=new EventSource('/api/realtime?token='+encodeURIComponent(d.token));
      window.BetSocialRealtimeStream=es;
      es.addEventListener('connected',()=>setRealtime('online'));
      es.addEventListener('notification',e=>{setRealtime('online');toast('🔔 Nova notificação');refreshNotifications()});
      es.addEventListener('message',e=>{setRealtime('online');toast('💬 Nova mensagem');refreshMessages()});
      es.addEventListener('post_update',e=>{setRealtime('online');try{const x=JSON.parse(e.data);window.dispatchEvent(new CustomEvent('betsocial:post-update',{detail:x}))}catch(_){} });
      es.addEventListener('ping',()=>setRealtime('online'));
      es.onerror=()=>setRealtime('offline');
    }catch(e){setRealtime('offline')}
  }
  function setRealtime(state){const el=$('#backendStatus');if(!el)return;el.classList.toggle('realtime',state==='online');el.title=state==='online'?'Tempo real conectado':'Tempo real desconectado';const label=el.childNodes[el.childNodes.length-1];if(label&&label.nodeType===3)label.nodeValue=state==='online'?' Tempo real':' API offline'}

  async function refreshNotifications(){
    try{const d=await api('/notifications');const btn=document.querySelector('[data-action="notificações"]');if(btn)btn.dataset.unread=d.notifications.filter(n=>!n.read).length;const panel=$('#notificationsPanel');if(!panel)return;const list=panel.querySelector('.s3-list');if(!list)return;list.innerHTML=d.notifications.slice(0,20).map(n=>`<div class="s3-item"><span class="avatar avatar-purple avatar-xs">!</span><div class="s3-item-body"><p>${escapeHtml(n.text)}</p><small>${relative(n.createdAt)}</small></div>${n.read?'':'<span class="s3-unread"></span>'}</div>`).join('')||'<div class="empty-state">Nenhuma notificação.</div>'}catch(_){}
  }
  async function refreshMessages(){
    try{const d=await api('/messages');window.BetSocialMessages=d.messages;}
    catch(_){}
  }
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  function relative(v){const m=Math.max(1,Math.floor((Date.now()-new Date(v))/60000));return m<60?`há ${m} min`:`há ${Math.floor(m/60)} h`}

  async function loadLiveSports(){
    try{
      const d=await api('/sports/live');
      window.BetSocialLiveSports=d;
      const games=[...document.querySelectorAll('.live-game')];
      (d.data||[]).slice(0,2).forEach((g,i)=>{const el=games[i];if(!el)return;const rows=el.querySelectorAll('div');if(rows[0]){rows[0].querySelector('span').textContent=g.home;rows[0].querySelector('b').textContent=(g.score||'0 - 0').split('-')[0].trim()}if(rows[1]){rows[1].querySelector('span').textContent=g.away;rows[1].querySelector('b').textContent=(g.score||'0 - 0').split('-')[1]?.trim()||'0'}const sm=el.querySelector('small');if(sm)sm.textContent=(g.status||'AO VIVO')+' · '+(g.minute??'')+(g.minute?'\'':'')});
      document.querySelector('.live-label')?.classList.add('live-pulse');
    }catch(_){}
  }

  // Persist the message typed in the existing conversation modal through the API.
  const send=$('#sendMessage');
  if(send){send.onclick=async()=>{const input=$('#messageInput'),text=input?.value.trim();if(!text)return;try{const title=$('#conversationTitle')?.textContent.trim()||'TraderPro';const to=title==='TraderPro'?'u_trader':'u_trader';const d=await api('/messages',{method:'POST',body:JSON.stringify({to,text})});const body=$('#conversationBody');const row=document.createElement('div');row.className='bubble-row me';row.innerHTML='<div class="bubble"></div>';row.firstElementChild.textContent=text;body?.appendChild(row);if(input)input.value='';body?.scrollTo(0,99999);toast('Mensagem enviada para o servidor');window.BetSocialMessages=[...(window.BetSocialMessages||[]),d.message]}catch(e){toast(e.message)}}}

  loadLiveSports();setInterval(loadLiveSports,15000);refreshNotifications();refreshMessages();connectRealtime();
  window.BetSocialV7={api,reconnect:connectRealtime,loadLiveSports};
})();
/* BetSocial v0.11 — PostgreSQL/Supabase-ready auth + Google OAuth + password recovery + personalized feed */
(()=>{
 const $=s=>document.querySelector(s), KEY='betsocial_v11_token'; let token=localStorage.getItem(KEY)||sessionStorage.getItem(KEY);
 const api=async(path,opts={})=>{const h={'Content-Type':'application/json',...(opts.headers||{})};if(token)h.Authorization='Bearer '+token;const r=await fetch('/api'+path,{...opts,headers:h});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Falha na API');return d};
 const toast=v=>{const t=$('#toast');if(t){t.textContent=v;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800)}else alert(v)};
 const gate=$('#authGate'), appShell=document.querySelector('.app-shell');
 const loginBtn=$('#openLogin'), registerBtn=$('#openRegister'), guestActions=$('#guestActions'), userActions=$('#userActions'), profileChip=document.querySelector('.profile-chip');
 const headerName=$('#headerName'), headerHandle=$('#headerHandle'), headerAvatar=$('#headerAvatar');
 const sidebarCard=$('#sidebarProfileCard'), sidebarName=$('#sidebarName'), sidebarHandle=$('#sidebarHandle'), sidebarAvatar=$('#sidebarAvatar'), sidebarProfileBtn=$('#sidebarProfileBtn');
 const composerAvatar=$('#composerAvatar'), previewAuthor=$('#previewAuthor'), previewHandle=$('#previewHandle'), previewAvatar=$('#previewAvatar'), modalProfileName=$('#modalProfileName'), modalProfileHandle=$('#modalProfileHandle'), modalProfileAvatar=$('#modalProfileAvatar');
 let currentUser=null;
 const renderAuthState=()=>{
   const logged=!!currentUser;
   document.body.classList.toggle('auth-user',logged);
   document.body.classList.toggle('auth-guest',!logged);
   if(guestActions) guestActions.hidden=logged;
   loginBtn?.toggleAttribute('hidden',logged);
   registerBtn?.toggleAttribute('hidden',logged);
   if(userActions) userActions.hidden=!logged;
   sidebarCard?.classList.toggle('guest-card',!logged);
   if(logged){
     const name=currentUser.name||currentUser.handle||currentUser.email?.split('@')[0]||'Usuário';
     const handle=currentUser.handle||name.toLowerCase().replace(/\s+/g,'');
     if(headerName) headerName.textContent=name;
     if(headerHandle) headerHandle.textContent='@'+handle.replace(/^@/,'');
     if(headerAvatar) headerAvatar.textContent=name.charAt(0).toUpperCase();
     if(sidebarName) sidebarName.textContent=name;
     if(sidebarHandle) sidebarHandle.textContent='@'+handle.replace(/^@/,'');
     if(sidebarAvatar) sidebarAvatar.textContent=name.charAt(0).toUpperCase();
     if(sidebarProfileBtn) sidebarProfileBtn.textContent='Ver perfil';
     if(composerAvatar) composerAvatar.textContent=name.charAt(0).toUpperCase();
     if(previewAuthor) previewAuthor.textContent=name;
     if(previewHandle) previewHandle.textContent='@'+handle.replace(/^@/,'')+' · agora';
     if(previewAvatar) previewAvatar.textContent=name.charAt(0).toUpperCase();
     if(modalProfileName) modalProfileName.textContent=name;
     if(modalProfileHandle) modalProfileHandle.textContent='@'+handle.replace(/^@/,'')+' · Membro';
     if(modalProfileAvatar) modalProfileAvatar.textContent=name.charAt(0).toUpperCase();
   }else{
     // Visitantes não têm identidade falsa no cabeçalho: o CTA visível é apenas "Entrar".
     if(headerName) headerName.textContent='';
     if(headerHandle) headerHandle.textContent='';
     if(headerAvatar) headerAvatar.textContent='';
     if(sidebarName) sidebarName.textContent='';
     if(sidebarHandle) sidebarHandle.textContent='';
     if(sidebarAvatar) sidebarAvatar.textContent='';
     if(sidebarProfileBtn) sidebarProfileBtn.textContent='Entrar';
     if(composerAvatar) composerAvatar.textContent='';
     if(previewAuthor) previewAuthor.textContent='';
     if(previewHandle) previewHandle.textContent='';
     if(previewAvatar) previewAvatar.textContent='';
     if(modalProfileName) modalProfileName.textContent='';
     if(modalProfileHandle) modalProfileHandle.textContent='';
     if(modalProfileAvatar) modalProfileAvatar.textContent='';
   }
 };
 const setCurrentUser=u=>{currentUser=u||null;renderAuthState();document.dispatchEvent(new CustomEvent('betsocial:auth',{detail:{user:currentUser}}));};

 const showRegister=()=>gate?.classList.add('register-mode');
 const showLogin=()=>gate?.classList.remove('register-mode');
 const openAuth=()=>{gate?.classList.add('open');gate?.classList.remove('register-mode');appShell?.classList.add('auth-hidden');document.documentElement.classList.add('auth-open');document.body.classList.add('auth-open');};
 const openRegister=()=>{openAuth();gate?.classList.add('register-mode');};
 const closeAuth=()=>{gate?.classList.remove('open','register-mode');appShell?.classList.remove('auth-hidden');document.documentElement.classList.remove('auth-open');document.body.classList.remove('auth-open');};
 $('#openLogin')?.addEventListener('click',openAuth);
 $('#openRegister')?.addEventListener('click',openRegister);
 $('#closeLogin')?.addEventListener('click',closeAuth);

 const resetToken=new URLSearchParams(location.search).get('reset');
 if(resetToken){const box=document.createElement('div');box.className='modal-backdrop open';box.style.zIndex='9999';box.innerHTML='<div class="modal auth-modal"><header class="modal-head"><div><h2>Nova senha</h2><small>Crie uma nova senha para sua conta</small></div></header><form id="resetForm" class="auth-form"><label>Nova senha<input id="resetPassword" type="password" minlength=8 required></label><label>Confirmar senha<input id="resetConfirm" type="password" minlength=8 required></label><button class="publish-btn" type="submit">Salvar nova senha</button></form></div>';document.body.appendChild(box);$('#resetForm').onsubmit=async e=>{e.preventDefault();if($('#resetPassword').value!==$('#resetConfirm').value)return toast('As senhas não conferem.');try{await api('/auth/reset-password',{method:'POST',body:JSON.stringify({token:resetToken,password:$('#resetPassword').value})});toast('Senha alterada. Faça login novamente.');box.remove();history.replaceState({},'',location.pathname);showLogin();openAuth()}catch(err){toast(err.message)}}}

 $('#showRegister')?.addEventListener('click',showRegister);$('#showLogin')?.addEventListener('click',showLogin);$('#backToLogin')?.addEventListener('click',showLogin);
 $('#googleLogin')?.addEventListener('click',()=>location.href='/api/auth/google');
 document.querySelectorAll('.password-toggle').forEach(b=>b.onclick=()=>{const i=$('#'+b.dataset.target);if(i)i.type=i.type==='password'?'text':'password'});
 $('#forgotPassword')?.addEventListener('click',async()=>{const email=prompt('Digite o e-mail da sua conta:');if(!email)return;try{const d=await api('/auth/forgot-password',{method:'POST',body:JSON.stringify({email})});toast(d.devResetUrl?'Link de recuperação gerado para desenvolvimento.':d.message);if(d.devResetUrl)console.log('DEV reset:',d.devResetUrl)}catch(e){toast(e.message)}});
 $('#loginForm')?.addEventListener('submit',async e=>{e.preventDefault();try{const d=await api('/auth/login',{method:'POST',body:JSON.stringify({identity:$('#loginIdentity').value.trim(),password:$('#loginPassword').value})});token=d.token;($('#rememberLogin').checked?localStorage:sessionStorage).setItem(KEY,token);setCurrentUser(d.user||await api('/auth/me'));closeAuth();toast('Login realizado com sucesso');window.BetSocialAPI?.syncAll?.()}catch(e){toast(e.message)}});
 $('#registerForm')?.addEventListener('submit',async e=>{e.preventDefault();const p=$('#registerPassword').value;if(p!==$('#registerConfirm').value)return toast('As senhas não conferem.');try{const d=await api('/auth/register',{method:'POST',body:JSON.stringify({name:$('#registerName').value.trim(),handle:$('#registerHandle').value.trim(),email:$('#registerEmail').value.trim(),password:p})});token=d.token;localStorage.setItem(KEY,token);setCurrentUser(d.user||await api('/auth/me'));closeAuth();toast('Conta criada com sucesso')}catch(e){toast(e.message)}});
 if(new URLSearchParams(location.search).get('oauth')==='success'){history.replaceState({},'',location.pathname);openAuth();api('/auth/me').then(()=>{closeAuth();toast('Login com Google realizado')}).catch(()=>{})}
 if(token)api('/auth/me').then(u=>{setCurrentUser(u);closeAuth()}).catch(()=>{token=null;localStorage.removeItem(KEY);sessionStorage.removeItem(KEY);setCurrentUser(null);closeAuth()});
 else { setCurrentUser(null); closeAuth(); }
 $('#logoutBtn')?.addEventListener('click',async()=>{try{await api('/auth/logout',{method:'POST'})}catch{}token=null;localStorage.removeItem(KEY);sessionStorage.removeItem(KEY);setCurrentUser(null);document.getElementById('profileMenu')?.classList.remove('open');toast('Você saiu da conta');});

 // Use server feed when available; keep existing UI untouched.
 async function feed(){try{const d=await api('/feed');window.BetSocialPersonalFeed=d.posts}catch{}}
 feed();window.BetSocialV8={api,feed,logout:async()=>{try{await api('/auth/logout',{method:'POST'})}catch{}token=null;localStorage.removeItem(KEY);sessionStorage.removeItem(KEY);setCurrentUser(null);openAuth();showLogin()}};
})();
/* BetSocial v0.11 — rede, perfil real, feed personalizado e chat por conversa */
(()=>{
 const api=window.BetSocialV8?.api || window.BetSocialV7?.api; if(!api)return;
 const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
 const toast=v=>{const t=$('#toast');if(t){t.textContent=v;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)}};
 async function profile(){try{const d=await api('/profile');const u=d.user;document.querySelectorAll('.profile-chip .profile-copy b,.profile-modal .profile-row-info h2,.profile-card h2').forEach(x=>x.textContent=u.name);document.querySelectorAll('.profile-chip .profile-copy small,.profile-modal .profile-row-info small').forEach(x=>x.textContent=u.handle+(x.closest('.profile-row-info')?' · Membro desde 2026':''));const bio=$('.profile-bio');if(bio)bio.textContent=u.bio||'';return u}catch(e){return null}}
 async function network(){try{const d=await api('/network');window.BetSocialNetwork=d;const list=document.querySelector('.follow-list');if(list)list.innerHTML=d.users.slice(0,20).map(u=>`<div class="follow-card"><span class="avatar avatar-purple avatar-xs">${esc((u.name||'?')[0])}</span><div><b>${esc(u.name)}</b><small>${esc(u.handle)}</small></div><button class="outline-btn follow-live" data-user-id="${u.id}">${u.following?'Seguindo':'Seguir'}</button></div>`).join('')||'<div class="empty-state">Nenhum usuário encontrado.</div>';return d}catch(e){return null}}
 document.addEventListener('click',async e=>{const b=e.target.closest('.follow-live');if(!b)return;try{const d=await api('/users/'+b.dataset.userId+'/follow',{method:'POST'});b.textContent=d.following?'Seguindo':'Seguir';toast(d.following?'Você começou a seguir este usuário.':'Você deixou de seguir este usuário.');network()}catch(err){toast(err.message)}});
 async function openConversation(name){const users=(await network())?.users||[];const target=users.find(u=>u.name===name)||users[0];if(!target)return toast('Usuário não encontrado.');$('#conversationTitle').textContent=target.name;const d=await api('/messages');const msgs=d.messages.filter(m=>m.from===target.id||m.to===target.id);const body=$('#conversationBody');if(body)body.innerHTML=msgs.map(m=>`<div class="bubble-row ${m.to===target.id?'me':''}"><div class="bubble">${esc(m.text)}</div></div>`).join('')||'<div class="empty-state">Comece a conversa.</div>';await api('/messages/read',{method:'POST',body:JSON.stringify({from:target.id})}).catch(()=>{});document.querySelector('#conversationModal')?.classList.add('open');window.BetSocialConversationTarget=target.id;body?.scrollTo(0,99999)}
 document.querySelectorAll('.message-preview').forEach(el=>el.addEventListener('click',()=>openConversation(el.dataset.conversation)));
 const send=$('#sendMessage');if(send){send.onclick=async()=>{const text=$('#messageInput')?.value.trim(),to=window.BetSocialConversationTarget;if(!text||!to)return;try{const d=await api('/messages',{method:'POST',body:JSON.stringify({to,text})});const row=document.createElement('div');row.className='bubble-row me';row.innerHTML='<div class="bubble"></div>';row.firstElementChild.textContent=d.message.text;$('#conversationBody')?.appendChild(row);$('#messageInput').value='';$('#conversationBody')?.scrollTo(0,99999)}catch(e){toast(e.message)}}}
 window.BetSocialV9={profile,network,openConversation};profile();
})();
/* BetSocial v0.12 — profile UX, avatars and guest cleanup */
(()=>{
 const KEY='betsocial_v11_token', $=s=>document.querySelector(s);
 let token=localStorage.getItem(KEY)||sessionStorage.getItem(KEY), currentUser=null, selectedAvatar='';
 const api=async(path,opts={})=>{const h={'Content-Type':'application/json',...(opts.headers||{})};if(token)h.Authorization='Bearer '+token;const r=await fetch('/api'+path,{...opts,headers:h});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Falha na API');return d};
 const toast=v=>{const t=$('#toast');if(t){t.textContent=v;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}};
 const setImage=(el,url,fallback='?')=>{if(!el)return;if(url){el.classList.add('has-image');el.style.backgroundImage=`url("${url}")`;el.textContent=''}else{el.classList.remove('has-image');el.style.backgroundImage='';el.textContent=fallback}};
 const allAvatars=()=>['#headerAvatar','#sidebarAvatar','#composerAvatar','#previewAvatar','#modalProfileAvatar','#editAvatarPreview'];
 function render(u){
   currentUser=u||null;
   const logged=!!u;
   document.body.classList.toggle('auth-user',logged);
   document.body.classList.toggle('auth-guest',!logged);
   const layout=document.querySelector('.layout');
   layout?.classList.toggle('guest-mode',!logged);
   layout?.classList.toggle('authenticated-mode',logged);
   document.querySelectorAll('.guest-sensitive').forEach(e=>e.hidden=!logged);
   $('#sidebarProfileCard')?.toggleAttribute('hidden',!logged);
   const rightbar=document.querySelector('.rightbar');
   if(rightbar){rightbar.hidden=!logged;rightbar.classList.toggle('guest-empty',!logged);}
   // Never show "Visitante" as a fake logged-in identity.
   if(!logged){$('#headerName')?.closest('.profile-chip')?.setAttribute('hidden','');$('#userActions')?.setAttribute('hidden','');$('#guestActions')?.removeAttribute('hidden');return}
   $('#headerName')?.closest('.profile-chip')?.removeAttribute('hidden');$('#userActions')?.removeAttribute('hidden');$('#guestActions')?.setAttribute('hidden','');
   const name=u.name||'Usuário', handle=u.handle||'@usuario';
   $('#headerName').textContent=name; $('#headerHandle').textContent=handle;
   $('#sidebarName').textContent=name; $('#sidebarHandle').textContent=handle; $('#sidebarProfileBtn').textContent='Ver perfil';
   $('#modalProfileName').textContent=name; $('#modalProfileHandle').textContent=handle+' · Membro';
   $('#previewAuthor').textContent=name; $('#previewHandle').textContent=handle+' · agora';
   allAvatars().forEach(id=>setImage($(id),u.avatar,name.charAt(0).toUpperCase()));
   const bio=$('.profile-bio'); if(bio)bio.textContent=u.bio||'';
 }
 async function load(){
   if(!token){render(null);return}
   try{const d=await api('/auth/me');render(d.user)}catch{token=null;localStorage.removeItem(KEY);sessionStorage.removeItem(KEY);render(null)}
 }
 const openEdit=()=>{
   if(!currentUser)return $('#openLogin')?.click();
   $('#editName').value=currentUser.name||''; $('#editHandle').value=(currentUser.handle||'').replace(/^@/,''); $('#editBio').value=currentUser.bio||'';
   selectedAvatar=currentUser.avatar||'';setImage($('#editAvatarPreview'),selectedAvatar,(currentUser.name||'?')[0].toUpperCase());
   $('#editProfileModal')?.classList.add('open');
 };
 document.addEventListener('click',e=>{
   const edit=e.target.closest('#profileModal .profile-action:not(.primary)'); if(edit&&edit.textContent.trim()==='Editar perfil'){e.preventDefault();openEdit()}
   if(e.target.closest('#avatarPicker'))$('#avatarFile')?.click();
   if(e.target.closest('#removeAvatar')){selectedAvatar='';setImage($('#editAvatarPreview'),'',(currentUser?.name||'?')[0].toUpperCase())}
   const cancel=e.target.closest('.close-edit');
   if(cancel){e.preventDefault();e.stopPropagation();$('#editProfileModal')?.classList.remove('open');}
 });
 $('#avatarFile')?.addEventListener('change',e=>{
   const file=e.target.files?.[0];if(!file)return;
   if(file.size>2*1024*1024){toast('A foto deve ter no máximo 2 MB.');e.target.value='';return}
   const reader=new FileReader();reader.onload=ev=>{
     const img=new Image();img.onload=()=>{
       const max=512,scale=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
       c.getContext('2d').drawImage(img,0,0,c.width,c.height);selectedAvatar=c.toDataURL('image/webp',.82);setImage($('#editAvatarPreview'),selectedAvatar,'?');
     };img.src=ev.target.result;
   };reader.readAsDataURL(file);
 });
 $('#editProfileForm')?.addEventListener('submit',async e=>{
   e.preventDefault();if(!currentUser)return;
   try{
     const d=await api('/profile',{method:'PATCH',body:JSON.stringify({name:$('#editName').value.trim(),handle:$('#editHandle').value.trim(),bio:$('#editBio').value.trim(),avatar:selectedAvatar})});
     currentUser=d.user;render(currentUser);$('#editProfileModal')?.classList.remove('open');toast('Perfil atualizado com sucesso.');
   }catch(err){toast(err.message)}
 });
 document.addEventListener('betsocial:auth',e=>{render(e.detail?.user||null)});

 // Make the existing profile modal reflect server data whenever opened.
 document.addEventListener('click',async e=>{if(e.target.closest('[data-profile-action="profile"]')){if(currentUser){try{const d=await api('/profile');render(d.user)}catch{}}}});
 load();
 window.BetSocialV12={load,openEdit};
})();/* BetSocial v0.13 — auth/layout synchronization and profile modal safety */
(()=>{
 const $=s=>document.querySelector(s);
 const sync=(ev)=>{
   // A autenticação oficial valida o token no servidor. Não inferimos que o usuário
   // está logado apenas porque existe um token antigo no localStorage.
   const logged=!!ev?.detail?.user;
   document.body.classList.toggle('auth-user',logged);
   document.body.classList.toggle('auth-guest',!logged);
   document.querySelector('#userActions')?.toggleAttribute('hidden',!logged);
   document.querySelector('#guestActions')?.toggleAttribute('hidden',logged);
   const layout=$('.layout'), rightbar=$('.rightbar');
   layout?.classList.toggle('authenticated-mode',logged);
   layout?.classList.toggle('guest-mode',!logged);
   if(rightbar) rightbar.hidden=!logged;
 };
 document.addEventListener('betsocial:auth',sync);
 window.addEventListener('storage',e=>{if(e.key==='betsocial_v11_token'){
   // O módulo de autenticação principal fará a validação; aqui apenas pedimos um sync
   // quando o estado da sessão for removido em outra aba.
   if(!e.newValue)sync({detail:{user:null}});
 }});
 document.addEventListener('click',e=>{
   const cancel=e.target.closest('#editProfileModal .close-edit');
   if(cancel){e.preventDefault();e.stopImmediatePropagation();$('#editProfileModal')?.classList.remove('open');return;}
 });
})();

/* BetSocial v0.18 — search, feed pagination, mobile navigation and idempotent likes */
(()=>{
 const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
 const KEY='betsocial_v11_token'; let token=localStorage.getItem(KEY)||sessionStorage.getItem(KEY);
 const api=async(path,opts={})=>{const h={'Content-Type':'application/json',...(opts.headers||{})};if(token)h.Authorization='Bearer '+token;const r=await fetch('/api'+path,{...opts,headers:h});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Falha na API');return d};
 const toast=v=>{const t=$('#toast');if(t){t.textContent=v;t.classList.add('show');clearTimeout(window.__bst);window.__bst=setTimeout(()=>t.classList.remove('show'),2400)}};
 const search=$('#globalSearch'), box=$('#searchResults');
 let timer=null;
 const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
 const renderSearch=d=>{
   if(!box)return;let out='';
   if(d.users?.length){out+='<div class="search-group">Pessoas</div>'+d.users.map(u=>`<button class="search-result" data-user-id="${esc(u.id)}"><span class="avatar avatar-sm">${esc((u.name||'?')[0])}</span><span><strong>${esc(u.name)}</strong><small>${esc(u.handle||'')}</small></span></button>`).join('')}
   if(d.posts?.length){out+='<div class="search-group">Publicações</div>'+d.posts.map(p=>`<button class="search-result" data-post-id="${esc(p.id)}"><span>📝</span><span><strong>${esc(p.title||'Publicação')}</strong><small>${esc(p.author||'')}</small></span></button>`).join('')}
   box.innerHTML=out||'<div class="search-empty">Nenhum resultado encontrado.</div>';box.hidden=false;
 };
 search?.addEventListener('input',()=>{
   clearTimeout(timer);const q=search.value.trim();if(q.length<2){if(box)box.hidden=true;return}
   timer=setTimeout(async()=>{try{renderSearch(await api('/search?q='+encodeURIComponent(q)))}catch(e){toast(e.message)}},220);
 });
 document.addEventListener('click',e=>{
   if(box&&!e.target.closest('.global-search')&&!e.target.closest('#searchResults'))box.hidden=true;
   const u=e.target.closest('[data-user-id]');if(u){box.hidden=true;toast('Abrindo perfil…');document.querySelector('[data-profile-action="profile"]')?.click()}
   const p=e.target.closest('[data-post-id]');if(p){box.hidden=true;document.getElementById(p.dataset.postId)?.scrollIntoView?.({behavior:'smooth',block:'center'})}
 });
 // Mobile bottom navigation uses existing app actions; no duplicated business logic.
 document.addEventListener('click',e=>{
   const b=e.target.closest('[data-mobile-nav]');if(!b)return;
   $$('.mobile-bottom-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');
   const a=b.dataset.mobileNav;
   if(a==='compose')document.querySelector('#openComposer')?.click();
   else if(a==='profile')document.querySelector('[data-profile-action="profile"]')?.click();
   else if(a==='notifications')document.querySelector('[data-action="notificações"]')?.click();
   else if(a==='live')document.querySelector('.nav-item[href="#"]')?.click();
   else window.scrollTo({top:0,behavior:'smooth'});
 });
 // Expose a small server-first feed loader for the next UI iterations.
 window.BetSocialV18={api,loadFeed:async(offset=0)=>api('/feed?limit=10&offset='+offset)};
})();

/* GAMBLY v0.21 — tema claro sutil, persistente e acessível */
(function(){
  const KEY='gambly_theme', root=document.documentElement, btn=document.getElementById('themeToggle');
  function apply(theme){
    const light=theme==='light'; root.dataset.theme=light?'light':'dark';
    if(btn){btn.setAttribute('aria-pressed',String(light));btn.setAttribute('aria-label',light?'Ativar tema escuro':'Ativar tema claro');const i=btn.querySelector('.theme-icon'),l=btn.querySelector('.theme-label');if(i)i.textContent=light?'☾':'☼';if(l)l.textContent=light?'Tema escuro':'Tema claro'}
  }
  // O tema escuro é o padrão principal do GAMBLY. A escolha clara vale durante a sessão atual, mas uma nova abertura volta ao escuro.
  apply('dark'); btn?.addEventListener('click',()=>apply(root.dataset.theme==='light'?'dark':'light'));
})();
