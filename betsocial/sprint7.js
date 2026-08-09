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
