
/* BetSocial v0.6 — Sprint 6 auth + realtime client */
(() => {
  const API='/api', KEY='betsocial_v06_token';
  const gate=document.querySelector('#authGate');
  const $=s=>document.querySelector(s);
  let token=localStorage.getItem(KEY)||localStorage.getItem('betsocial_v05_token');
  if(token) localStorage.setItem(KEY,token);
  const api=async(path,opts={})=>{
    const headers={'Content-Type':'application/json',...(opts.headers||{})};
    if(token) headers.Authorization='Bearer '+token;
    const r=await fetch(API+path,{...opts,headers});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.error||'Não foi possível concluir a operação.');
    return d;
  };
  const toast=v=>{const t=$('#toast');if(t){t.textContent=v;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}};
  const showRegister=()=>gate?.classList.add('register-mode');
  const showLogin=()=>gate?.classList.remove('register-mode');
  $('#showRegister')?.addEventListener('click',showRegister);
  $('#backToLogin')?.addEventListener('click',showLogin);
  $('#showLogin')?.addEventListener('click',showLogin);
  document.querySelectorAll('.password-toggle').forEach(b=>b.addEventListener('click',()=>{const i=$('#'+b.dataset.target);i.type=i.type==='password'?'text':'password';b.textContent=i.type==='password'?'◉':'◌'}));
  $('#forgotPassword')?.addEventListener('click',()=>toast('A recuperação de senha será ativada na próxima etapa. Use o cadastro para criar uma nova conta.'));
  $('#googleLogin')?.addEventListener('click',()=>toast('Login Google está preparado, mas requer configuração OAuth.'));
  function strength(v){
    let score=0;if(v.length>=8)score++;if(/[A-Z]/.test(v))score++;if(/[0-9]/.test(v))score++;if(/[^A-Za-z0-9]/.test(v))score++;
    const names=['Fraca','Fraca','Média','Boa','Forte'], colors=['#ff5b5f','#ff5b5f','#f5c542','#7bdc45','#65ef39'];
    const text=$('#passwordStrengthText'), fill=$('#strengthFill'); if(text){text.textContent=names[score];text.style.color=colors[score];fill.style.width=Math.max(20,score*25)+'%';fill.style.background=colors[score]}
  }
  $('#registerPassword')?.addEventListener('input',e=>strength(e.target.value));
  function openApp(){gate?.classList.remove('open','register-mode','loading');document.querySelector('.app-shell')?.classList.remove('auth-hidden');}
  function openAuth(){gate?.classList.add('open');document.querySelector('.app-shell')?.classList.add('auth-hidden');}
  if(!token) openAuth(); else api('/auth/me').then(()=>openApp()).catch(()=>{token=null;localStorage.removeItem(KEY);sessionStorage.removeItem(KEY);openAuth()});
  $('#loginForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const identity=$('#loginIdentity').value.trim(), password=$('#loginPassword').value;
    try{
      const d=await api('/auth/login',{method:'POST',body:JSON.stringify({identity,password})});
      token=d.token;
      if($('#rememberLogin').checked){localStorage.setItem(KEY,token);sessionStorage.removeItem(KEY)}
      else{sessionStorage.setItem(KEY,token);localStorage.removeItem(KEY)}
      openApp(); toast('Login realizado com sucesso'); window.BetSocialAPI?.syncAll?.();
    }catch(err){toast(err.message)}
  });
  $('#registerForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const password=$('#registerPassword').value, confirm=$('#registerConfirm').value;
    if(password!==confirm)return toast('As senhas não conferem.');
    if(password.length<8)return toast('Use uma senha com pelo menos 8 caracteres.');
    try{
      const d=await api('/auth/register',{method:'POST',body:JSON.stringify({
        name:$('#registerName').value.trim(),handle:$('#registerHandle').value.trim(),email:$('#registerEmail').value.trim(),password
      })});
      token=d.token;localStorage.setItem(KEY,token);openApp();toast('Conta criada com sucesso');window.BetSocialAPI?.syncAll?.();
    }catch(err){toast(err.message)}
  });
  // Real-time UX: lightweight polling without external dependencies.
  let lastNotif=0;
  async function realtime(){
    if(!token)return;
    try{
      const [n,m]=await Promise.all([api('/notifications'),api('/messages')]);
      const unread=n.notifications.filter(x=>!x.read).length;
      const bell=document.querySelector('[data-action="notificações"]');
      if(bell) bell.dataset.unread=unread;
      if(unread>lastNotif) toast('Você recebeu uma nova notificação.');
      lastNotif=unread;
      window.BetSocialRealtime={notifications:n.notifications,messages:m.messages};
    }catch(e){
      if(/autenticado|login/i.test(e.message)){token=null;localStorage.removeItem(KEY);openAuth();}
    }
  }
  setTimeout(realtime,1000);setInterval(realtime,5000);
  window.BetSocialV6={api,logout:async()=>{
    try{await api('/auth/logout',{method:'POST'})}catch(e){}
    token=null;localStorage.removeItem(KEY);sessionStorage.removeItem(KEY);openAuth();showLogin();
  }};
})();
