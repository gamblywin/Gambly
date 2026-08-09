/* BetSocial v0.11 — PostgreSQL/Supabase-ready auth + Google OAuth + password recovery + personalized feed */
(()=>{
 const $=s=>document.querySelector(s), KEY='betsocial_v11_token'; let token=localStorage.getItem(KEY)||sessionStorage.getItem(KEY);
 const api=async(path,opts={})=>{const h={'Content-Type':'application/json',...(opts.headers||{})};if(token)h.Authorization='Bearer '+token;const r=await fetch('/api'+path,{...opts,headers:h});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Falha na API');return d};
 const toast=v=>{const t=$('#toast');if(t){t.textContent=v;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800)}else alert(v)};
 const gate=$('#authGate'), appShell=document.querySelector('.app-shell');
 const loginBtn=$('#openLogin'), userActions=$('#userActions'), profileChip=document.querySelector('.profile-chip');
 const headerName=$('#headerName'), headerHandle=$('#headerHandle'), headerAvatar=$('#headerAvatar');
 const sidebarCard=$('#sidebarProfileCard'), sidebarName=$('#sidebarName'), sidebarHandle=$('#sidebarHandle'), sidebarAvatar=$('#sidebarAvatar'), sidebarProfileBtn=$('#sidebarProfileBtn');
 const composerAvatar=$('#composerAvatar'), previewAuthor=$('#previewAuthor'), previewHandle=$('#previewHandle'), previewAvatar=$('#previewAvatar'), modalProfileName=$('#modalProfileName'), modalProfileHandle=$('#modalProfileHandle'), modalProfileAvatar=$('#modalProfileAvatar');
 let currentUser=null;
 const renderAuthState=()=>{
   const logged=!!currentUser;
   loginBtn?.toggleAttribute('hidden',logged);
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
     if(headerName) headerName.textContent='Visitante';
     if(headerHandle) headerHandle.textContent='@visitante';
     if(headerAvatar) headerAvatar.textContent='?';
     if(sidebarName) sidebarName.textContent='Visitante';
     if(sidebarHandle) sidebarHandle.textContent='Entre para ver seu perfil';
     if(sidebarAvatar) sidebarAvatar.textContent='?';
     if(sidebarProfileBtn) sidebarProfileBtn.textContent='Entrar para ver perfil';
     if(composerAvatar) composerAvatar.textContent='?';
     if(previewAuthor) previewAuthor.textContent='Visitante';
     if(previewHandle) previewHandle.textContent='@visitante · agora';
     if(previewAvatar) previewAvatar.textContent='?';
     if(modalProfileName) modalProfileName.textContent='Visitante';
     if(modalProfileHandle) modalProfileHandle.textContent='Entre para ver seu perfil';
     if(modalProfileAvatar) modalProfileAvatar.textContent='?';
   }
 };
 const setCurrentUser=u=>{currentUser=u||null;renderAuthState();};

 const showRegister=()=>gate?.classList.add('register-mode');
 const showLogin=()=>gate?.classList.remove('register-mode');
 const openAuth=()=>{gate?.classList.add('open');gate?.classList.remove('register-mode');};
 const closeAuth=()=>{gate?.classList.remove('open','register-mode');appShell?.classList.remove('auth-hidden');};
 $('#openLogin')?.addEventListener('click',openAuth);
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
