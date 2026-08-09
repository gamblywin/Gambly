const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const toast=m=>{const e=$("#toast");e.textContent=m;e.classList.add("show");clearTimeout(window.t);window.t=setTimeout(()=>e.classList.remove("show"),2200)};
const modal=$("#composerModal");const close=()=>modal.classList.remove("open");
$("#openComposer").onclick=open;$("#openComposer2").onclick=open;$("#publishQuick").onclick=open;
$$(".close-modal").forEach(b=>b.onclick=close);modal.onclick=e=>{if(e.target===modal)close()};
$$(".story").forEach(b=>b.onclick=()=>toast("Abrindo story: "+b.dataset.story));
$$("[data-compose]").forEach(b=>b.onclick=()=>{open();toast("Modo de criação: "+b.dataset.compose)});
$$(".like").forEach(b=>b.onclick=()=>{b.classList.toggle("liked");toast(b.classList.contains("liked")?"Curtida adicionada":"Curtida removida")});
$$(".bet-bottom button").forEach(b=>b.onclick=()=>toast("Componente preparado para futura integração."));
$$(".type-card").forEach(c=>c.onclick=()=>{$$(".type-card").forEach(x=>x.classList.remove("selected"));c.classList.add("selected")});
$("#nextStep").onclick=()=>toast("Próxima etapa: selecionar esporte e partida.");
$$("[data-action]").forEach(b=>b.onclick=()=>toast("Módulo "+b.dataset.action+" será conectado nas próximas sprints."));
$("#globalSearch").onkeydown=e=>{if(e.key==="Enter"&&e.target.value.trim())toast("Pesquisando: "+e.target.value.trim())};
document.onkeydown=e=>{if(e.key==="Escape")close()};

let wizardStep=1;
const pages=$$(".wizard-page"), dots=$$(".wiz-dot"), labels=$$(".wiz-label"), fill=$("#progressFill");
function renderWizard(){
  pages.forEach(p=>p.classList.toggle("active",Number(p.dataset.page)===wizardStep));
  dots.forEach(d=>{const n=Number(d.dataset.step);d.classList.toggle("active",n===wizardStep);d.classList.toggle("done",n<wizardStep)});
  labels.forEach((l,i)=>l.classList.toggle("active",i===wizardStep-1));
  fill.style.width=((wizardStep-1)/4*100)+"%";
  $("#prevStep").style.visibility=wizardStep===1?"hidden":"visible";
  $("#nextStep").textContent=wizardStep===5?"Publicar":"Próximo";
  if(wizardStep===5){
    $("#previewText").textContent=$("#analysisText").value.trim()||"Minha análise para este jogo...";
    $("#previewMarket").textContent=$("#market").value;
    $("#previewOdd").textContent=Number($("#odd").value||0).toFixed(2);
    $("#previewStake").textContent=($("#stake").value||0)+"%";
    $("#previewConfidence").textContent=(document.querySelector(".confidence-btn.selected")?.dataset.confidence||9)+"/10";
  }
}
$("#nextStep").onclick=()=>{
  if(wizardStep<5){wizardStep++;renderWizard();}else{close();toast("Publicação criada com sucesso. Integração com backend ficará para a próxima etapa.");}
};
$("#prevStep").onclick=()=>{if(wizardStep>1){wizardStep--;renderWizard()}};
$$(".type-card").forEach(c=>c.onclick=()=>{$$(".type-card").forEach(x=>x.classList.remove("selected"));c.classList.add("selected")});
$$(".match-option").forEach(c=>c.onclick=()=>{$$(".match-option").forEach(x=>x.classList.remove("selected"));c.classList.add("selected")});
$$(".confidence-btn").forEach(c=>c.onclick=()=>{$$(".confidence-btn").forEach(x=>x.classList.remove("selected"));c.classList.add("selected")});
$("#analysisText").addEventListener("input",e=>$("#charCount").textContent=e.target.value.length);
function open(){wizardStep=1;renderWizard();modal.classList.add("open")}

/* ===== Sprint 3: Notificações, Mensagens e Perfil ===== */
const closeAllS3=()=>document.querySelectorAll('.s3-panel,.s3-menu,.modal-backdrop').forEach(x=>x.classList.remove('open'));
const openS3=id=>{closeAllS3();document.getElementById(id)?.classList.add('open')};
const notifBtn=document.querySelector('[data-action="notificações"]');
const msgBtn=document.querySelector('[data-action="mensagens"]');
notifBtn?.addEventListener('click',e=>{e.stopPropagation();openS3('notificationsPanel')});
msgBtn?.addEventListener('click',e=>{e.stopPropagation();openS3('messagesPanel')});
const profileChip=document.querySelector('.profile-chip');
profileChip?.addEventListener('click',e=>{e.stopPropagation();document.getElementById('profileMenu').classList.toggle('open')});
document.querySelectorAll('[data-close-panel]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.closePanel)?.classList.remove('open')));
document.querySelectorAll('[data-profile-action]').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.profileAction;document.getElementById('profileMenu').classList.remove('open');if(a==='profile')openS3('profileModal');else if(a==='followers')openS3('followersModal');else if(a==='stats'){openS3('profileModal');toast('Estatísticas: 68% win rate · ROI +8,6% · 84 publicações')}else toast('Configurações do perfil abertas')}));
document.querySelector('.rightbar .outline-btn')?.addEventListener('click',()=>{const logged=!!localStorage.getItem('betsocial_v11_token')||!!sessionStorage.getItem('betsocial_v11_token');if(logged)openS3('profileModal');else document.querySelector('#openLogin')?.click()});
document.querySelectorAll('.message-preview').forEach(b=>b.addEventListener('click',()=>{document.getElementById('conversationTitle').textContent=b.dataset.conversation;openS3('conversationModal')}));
document.querySelectorAll('.modal-backdrop .close-modal').forEach(b=>b.addEventListener('click',()=>b.closest('.modal-backdrop').classList.remove('open')));
document.querySelectorAll('.s3-tabs button').forEach(b=>b.addEventListener('click',()=>{b.parentElement.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active')}));
document.querySelectorAll('.feed-tabs button').forEach(b=>b.addEventListener('click',()=>{b.parentElement.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');toast('Feed atualizado: '+b.textContent)}));
document.querySelectorAll('.follow-card button').forEach(b=>b.addEventListener('click',()=>{const following=b.textContent.trim()==='Seguindo';b.textContent=following?'Seguir':'Seguindo';b.classList.toggle('primary',!following);toast(following?'Você deixou de seguir este perfil':'Agora você está seguindo este perfil')}));
const sendMessage=()=>{const input=document.getElementById('messageInput'),v=input.value.trim();if(!v)return;const row=document.createElement('div');row.className='bubble-row me';row.innerHTML='<div class="bubble"></div>';row.firstElementChild.textContent=v;document.getElementById('conversationBody').appendChild(row);input.value='';document.getElementById('conversationBody').scrollTop=99999;setTimeout(()=>toast('Mensagem enviada'),100)};
document.getElementById('sendMessage')?.addEventListener('click',sendMessage);document.getElementById('messageInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')sendMessage()});
document.addEventListener('click',e=>{if(!e.target.closest('.profile-chip')&&!e.target.closest('#profileMenu'))document.getElementById('profileMenu')?.classList.remove('open');if(!e.target.closest('.s3-panel')&&!e.target.closest('[data-action]'))document.querySelectorAll('.s3-panel').forEach(x=>x.classList.remove('open'))});

/* ===== Sprint 4: persistência, feed interativo e camada de dados ===== */
const BetSocialStore = (() => {
  const KEY='betsocial_v04_state';
  const seed={
    profile:{name:'Matheus',handle:'@matheus',bio:'Análises de futebol, gestão de banca e acompanhamento de resultados. 📈⚽'},
    posts:[], notifications:[], messages:[]
  };
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||seed}catch(e){return seed}};
  let state=load();
  const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
  return {get:()=>state,save,reset:()=>{state=JSON.parse(JSON.stringify(seed));save()},
    addPost:p=>{const post={id:'p_'+Date.now(),likes:0,comments:0,liked:false,createdAt:new Date().toISOString(),...p};state.posts.unshift(post);save();return post},
    toggleLike:id=>{const p=state.posts.find(x=>x.id===id);if(!p)return;p.liked=!p.liked;p.likes=Math.max(0,p.likes+(p.liked?1:-1));save();return p},
    comment:id=>{const p=state.posts.find(x=>x.id===id);if(!p)return;p.comments++;save();return p},
    notify:n=>{state.notifications.unshift({id:'n_'+Date.now(),read:false,createdAt:new Date().toISOString(),...n});state.notifications=state.notifications.slice(0,50);save()},
    markNotificationsRead:()=>{state.notifications.forEach(n=>n.read=true);save()},
    updateProfile:p=>{state.profile={...state.profile,...p};save()},
    addMessage:m=>{state.messages.push({id:'m_'+Date.now(),createdAt:new Date().toISOString(),...m});save()}
  };
})();

const fmtCount=n=>n>=1000?(n/1000).toFixed(1)+'k':String(n);
const store=BetSocialStore.get();

function hydrateProfile(){
  const p=BetSocialStore.get().profile;
  document.querySelectorAll('.profile-copy b').forEach(e=>e.textContent=p.name);
  document.querySelectorAll('.profile-copy small').forEach(e=>e.textContent=p.handle);
  const pm=document.querySelector('#profileModal');
  if(pm){pm.querySelectorAll('.profile-row-info h2').forEach(e=>e.textContent=p.name);pm.querySelectorAll('.profile-row-info small').forEach(e=>e.textContent=p.handle+' · Membro desde 2026');pm.querySelectorAll('.profile-bio').forEach(e=>e.textContent=p.bio)}
}

function renderLocalPosts(){
  const feed=document.querySelector('.feed-list'); if(!feed)return;
  feed.querySelectorAll('.local-post').forEach(e=>e.remove());
  BetSocialStore.get().posts.slice().reverse().forEach(p=>{
    const article=document.createElement('article'); article.className='post-card card local-post'; article.dataset.id=p.id;
    article.innerHTML=`<header class="post-header"><span class="avatar avatar-purple">M</span><div class="post-author"><b>${escapeHtml(BetSocialStore.get().profile.name)}</b><small>${escapeHtml(BetSocialStore.get().profile.handle)} · agora</small></div><button class="more-btn">•••</button></header><div class="post-body"><div class="post-tag">${escapeHtml(p.type||'Análise')}</div><h3>${escapeHtml(p.title||'Nova publicação')}</h3><p>${escapeHtml(p.text||'')}</p><div class="bet-bottom"><div><small>${escapeHtml(p.market||'Mercado')}</small><b>Odd ${Number(p.odd||0).toFixed(2)}</b></div><div><small>Confiança</small><b>${escapeHtml(String(p.confidence||9))}/10</b></div><div><small>Stake</small><b>${escapeHtml(String(p.stake||0))}%</b></div></div></div><footer class="post-footer"><button class="local-like ${p.liked?'liked':''}">${p.liked?'♥':'♡'} <span>${fmtCount(p.likes)}</span></button><button class="local-comment">◯ <span>${p.comments}</span></button><button class="local-share">↗ <span>0</span></button><button class="local-save">⌑</button></footer></article>`;
    feed.prepend(article);
  });
  bindLocalPosts();
}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function bindLocalPosts(){
  document.querySelectorAll('.local-like').forEach(b=>b.onclick=()=>{const p=BetSocialStore.toggleLike(b.closest('.local-post').dataset.id);renderLocalPosts();BetSocialStore.notify({text:p.liked?'Você curtiu sua própria publicação.':'Curtida removida.',kind:'interaction'});toast(p.liked?'Curtida salva':'Curtida removida')});
  document.querySelectorAll('.local-comment').forEach(b=>b.onclick=()=>{const id=b.closest('.local-post').dataset.id;const text=prompt('Digite um comentário:');if(text?.trim()){const p=BetSocialStore.comment(id);BetSocialStore.notify({text:'Seu comentário foi adicionado.',kind:'interaction'});renderLocalPosts();toast('Comentário adicionado')} });
  document.querySelectorAll('.local-share').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(location.href+'#post-'+b.closest('.local-post').dataset.id)}catch(e){}toast('Link da publicação copiado')});
  document.querySelectorAll('.local-save').forEach(b=>b.onclick=()=>toast('Publicação salva'));
}

const originalPublish=window.open;
const publishFromWizard=()=>{
  const text=document.querySelector('#analysisText')?.value.trim()||'Minha análise para este jogo...';
  const match=document.querySelector('.match-option.selected');
  const teams=match?match.innerText.replace(/\s+/g,' ').trim():'Partida selecionada';
  const p=BetSocialStore.addPost({type:document.querySelector('.type-card.selected')?.dataset.type||'Análise',title:teams,text,market:document.querySelector('#market')?.value||'Mercado',odd:document.querySelector('#odd')?.value||0,stake:document.querySelector('#stake')?.value||0,confidence:document.querySelector('.confidence-btn.selected')?.dataset.confidence||9});
  BetSocialStore.notify({text:'Sua nova publicação foi criada com sucesso.',kind:'publication'});renderLocalPosts();toast('Publicação adicionada ao feed');return p;
};

// Substitui o comportamento final do Wizard sem alterar sua UI.
const oldNext=document.querySelector('#nextStep');
if(oldNext){oldNext.addEventListener('click',()=>{if(document.querySelector('.wizard-page.active')?.dataset.page==='5'){setTimeout(publishFromWizard,20)}})}

function setupSearch(){
  const input=document.querySelector('#globalSearch'); if(!input)return;
  input.onkeydown=e=>{if(e.key!=='Enter')return;const q=input.value.trim().toLowerCase();if(!q)return;const hits=[...document.querySelectorAll('.post-card,.story,.tipster,.live-game')].filter(x=>x.innerText.toLowerCase().includes(q)).length;toast(hits?`${hits} resultado(s) para “${input.value.trim()}”`:`Nenhum resultado para “${input.value.trim()}”`)};
}

function addProfileEditor(){
  const btn=[...document.querySelectorAll('#profileModal button')].find(b=>b.textContent.trim()==='Editar perfil'); if(!btn)return;
  btn.onclick=()=>{const p=BetSocialStore.get().profile;const name=prompt('Nome',p.name);if(name===null)return;const handle=prompt('Usuário',p.handle);if(handle===null)return;const bio=prompt('Bio',p.bio);if(bio===null)return;BetSocialStore.updateProfile({name:name.trim()||p.name,handle:handle.startsWith('@')?handle.trim():'@'+handle.trim(),bio:bio.trim()||p.bio});hydrateProfile();toast('Perfil atualizado')};
}

function setupNotifications(){
  const btn=document.querySelector('[data-action="notificações"]'); if(!btn)return;
  btn.addEventListener('click',()=>{BetSocialStore.markNotificationsRead();const dot=btn.querySelector('i');if(dot)dot.style.display='none'});
}

hydrateProfile();renderLocalPosts();setupSearch();addProfileEditor();setupNotifications();
