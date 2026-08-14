/* BetSocial — Área exclusiva de Grupos Premium */
(()=>{
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const KEY='betsocial_v11_token';
  let currentUser=null,currentGroup=null;
  const token=()=>localStorage.getItem(KEY)||sessionStorage.getItem(KEY)||'';
  const toast=v=>{const t=$('#toast');if(t){t.textContent=v;t.classList.add('show');clearTimeout(window.__premiumToast);window.__premiumToast=setTimeout(()=>t.classList.remove('show'),2600)}};
  const api=async(path,opts={})=>{const headers={'Content-Type':'application/json',...(opts.headers||{})};const t=token();if(t)headers.Authorization='Bearer '+t;const r=await fetch('/api'+path,{...opts,headers});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Falha na API');return d};
  const nav=$('#openPremiumGroups'),modal=$('#premiumGroupsModal'),list=$('#premiumGroupList'),main=$('#premiumGroupMain');
  const closeModal=id=>$(id)?.classList.remove('open');
  const openModal=()=>modal?.classList.add('open');
  function setPremiumVisible(user){currentUser=user||null;const premium=!!user?.premium; if(nav)nav.hidden=!premium;}
  async function refreshGroups(){
    if(!currentUser?.premium){setPremiumVisible(currentUser);return []}
    try{const d=await api('/premium/groups');renderGroupList(d.groups||[]);if(currentGroup){const fresh=(d.groups||[]).find(g=>g.id===currentGroup.id);if(!fresh){currentGroup=null;renderEmpty()}}return d.groups||[]}catch(e){renderGroupList([]);toast(e.message);return []}
  }
  function renderGroupList(groups){
    if(!list)return;
    list.innerHTML=groups.length?groups.map(g=>`<button class="premium-group-item ${currentGroup?.id===g.id?'active':''}" data-group-id="${esc(g.id)}"><b>${esc(g.name)}</b><small>${g.membersCount} membro(s)</small></button>`).join(''):'<div class="empty-state">Você ainda não criou ou entrou em nenhum grupo.</div>';
    list.querySelectorAll('[data-group-id]').forEach(b=>b.addEventListener('click',()=>loadGroup(b.dataset.groupId)));
  }
  function renderEmpty(){if(!main)return;main.innerHTML=`<div class="premium-empty"><div class="premium-empty-icon">♛</div><h3>Seu espaço Premium</h3><p>Crie grupos privados e compartilhe suas análises e apostas com pessoas escolhidas por você.</p><button class="publish-btn" id="premiumEmptyCreate" type="button">Criar meu primeiro grupo</button></div>`;$('#premiumEmptyCreate')?.addEventListener('click',openCreateGroup)}
  async function loadGroup(id){
    try{const d=await api('/premium/groups/'+encodeURIComponent(id));currentGroup=d.group;renderGroup(d.group);renderGroupList((await api('/premium/groups')).groups||[])}catch(e){toast(e.message)}
  }
  function renderGroup(g){
    if(!main)return;
    const isOwner=g.ownerId===currentUser?.id;
    const members=(g.members||[]);
    const posts=(g.posts||[]); const pending=(g.pendingMembers||[]); const pendingHtml=isOwner&&pending.length?`<div class="premium-requests"><b>Solicitações de entrada (${pending.length})</b>${pending.map(u=>`<div><span>${esc(u.name)}</span><button type="button" data-approve-premium="${esc(u.id)}">Aprovar</button></div>`).join('')}</div>`:'';
    main.innerHTML=`<div class="premium-group-head"><div><h3>♛ ${esc(g.name)}</h3><p>${esc(g.description||'Grupo privado Premium')}</p></div><div class="premium-group-actions"><button class="primary" id="sharePremiumBet">＋ Compartilhar aposta</button>${isOwner?'<button id="addPremiumMember">＋ Adicionar pessoa</button>':''}</div></div><div class="premium-group-meta"><span class="premium-meta-chip">♛ Grupo Premium</span><span class="premium-meta-chip">${members.length} membro(s)</span><span class="premium-meta-chip">${g.settings?.joinMode==='approval'?'Solicitação + aprovação':'Somente convite'}</span><span class="premium-meta-chip">${g.settings?.postingMode==='admin'?'Só o dono publica':'Todos os membros publicam'}</span></div>${isOwner?`<div class="premium-settings"><div><b>Organização do grupo</b><small>Defina quem pode entrar e quem pode publicar.</small></div><div class="premium-settings-controls"><select id="premiumJoinSetting"><option value="invite" ${g.settings?.joinMode!=='approval'?'selected':''}>Entrada por convite</option><option value="approval" ${g.settings?.joinMode==='approval'?'selected':''}>Entrada com aprovação</option></select><select id="premiumPostSetting"><option value="all" ${g.settings?.postingMode!=='admin'?'selected':''}>Todos podem publicar</option><option value="admin" ${g.settings?.postingMode==='admin'?'selected':''}>Somente dono publica</option></select><button id="savePremiumSettings" type="button">Salvar</button></div></div>`:''}<div class="premium-feed">${posts.length?posts.map(renderPost).join(''):'<div class="empty-state">Nenhuma aposta compartilhada ainda. Use “Compartilhar aposta” para publicar a primeira.</div>'}</div><div class="premium-members"><h4>MEMBROS DO GRUPO</h4>${members.map(m=>`<div class="premium-member-row"><span class="avatar avatar-xs avatar-purple">${esc((m.name||'?')[0].toUpperCase())}</span><div><b>${esc(m.name)}</b><small>${esc(m.handle||'')}</small></div>${m.id===g.ownerId?'<span class="premium-meta-chip">Dono</span>':''}</div>`).join('')}${isOwner?'<div class="premium-add-row"><input id="premiumMemberIdentity" placeholder="@usuário ou e-mail"><button id="premiumAddMemberInline" type="button">Adicionar</button></div>':''}</div>`;
    document.querySelectorAll('[data-approve-premium]').forEach(b=>b.addEventListener('click',async()=>{try{await api('/premium/groups/'+encodeURIComponent(g.id)+'/requests/'+encodeURIComponent(b.dataset.approvePremium),{method:'POST'});toast('Solicitação aprovada.');await loadGroup(g.id)}catch(e){toast(e.message)}}));
    $('#sharePremiumBet')?.addEventListener('click',openShareBet);
    $('#addPremiumMember')?.addEventListener('click',()=>document.querySelector('#premiumMemberIdentity')?.focus());
    $('#premiumAddMemberInline')?.addEventListener('click',addMemberInline); $('#savePremiumSettings')?.addEventListener('click',savePremiumSettings);
  }
  function renderPost(p){
    const link=p.platformUrl?`<a href="${esc(p.platformUrl)}" target="_blank" rel="noopener noreferrer">Ir para ${esc(p.platform||'plataforma')}</a>`:'';
    return `<article class="premium-bet"><div class="premium-bet-head"><b>${esc(p.title)}</b><small>${esc(p.author||'Membro')}</small></div><p>${esc(p.text)}</p><div class="premium-bet-info"><div><small>ODD</small><b>${Number(p.odd||0)?Number(p.odd).toFixed(2):'—'}</b></div><div><small>PLATAFORMA</small><b>${esc(p.platform||'Não informada')}</b></div><div><small>DATA</small><b>${new Date(p.createdAt).toLocaleDateString('pt-BR')}</b></div></div>${link?`<div class="premium-platform"><span>Link compartilhado pelo autor</span>${link}</div>`:''}</article>`;
  }
  function openCreateGroup(){if(!currentUser?.premium)return toast('Esta área é exclusiva para membros Premium.');$('#createGroupModal')?.classList.add('open');$('#groupName')?.focus()}
  async function createGroup(e){e.preventDefault();try{const d=await api('/premium/groups',{method:'POST',body:JSON.stringify({name:$('#groupName').value.trim(),description:$('#groupDescription').value.trim(),joinMode:$('#groupJoinMode')?.value||'invite',postingMode:$('#groupPostingMode')?.value||'all'})});$('#createGroupModal')?.classList.remove('open');$('#createGroupForm')?.reset();await refreshGroups();await loadGroup(d.group.id);toast('Grupo Premium criado com sucesso.')}catch(err){toast(err.message)}}
  async function addMember(identity){if(!identity)return toast('Digite @usuário ou e-mail.');if(!currentGroup)return;try{await api('/premium/groups/'+encodeURIComponent(currentGroup.id)+'/members',{method:'POST',body:JSON.stringify({identity})});toast('Pessoa adicionada ao grupo.');await loadGroup(currentGroup.id)}catch(err){toast(err.message)}}
  async function addMemberInline(){const input=$('#premiumMemberIdentity');await addMember(input?.value.trim());if(input)input.value=''}
  async function savePremiumSettings(){if(!currentGroup)return;try{await api('/premium/groups/'+encodeURIComponent(currentGroup.id)+'/settings',{method:'PATCH',body:JSON.stringify({joinMode:$('#premiumJoinSetting').value,postingMode:$('#premiumPostSetting').value})});toast('Configurações do grupo atualizadas.');await loadGroup(currentGroup.id)}catch(err){toast(err.message)}}
  function openShareBet(){if(!currentGroup)return toast('Selecione um grupo primeiro.');$('#shareBetModal')?.classList.add('open');$('#shareBetTitle')?.focus()}
  async function shareBet(e){e.preventDefault();if(!currentGroup)return;try{await api('/premium/groups/'+encodeURIComponent(currentGroup.id)+'/posts',{method:'POST',body:JSON.stringify({title:$('#shareBetTitle').value.trim(),text:$('#shareBetText').value.trim(),odd:$('#shareBetOdd').value,platform:$('#shareBetPlatform').value.trim(),platformUrl:$('#shareBetUrl').value.trim()})});$('#shareBetModal')?.classList.remove('open');$('#shareBetForm')?.reset();await loadGroup(currentGroup.id);toast('Aposta compartilhada no grupo.')}catch(err){toast(err.message)}}
  nav?.addEventListener('click',async()=>{if(!currentUser?.premium)return toast('A área Grupos Premium é exclusiva para membros Premium.');openModal();await refreshGroups();if(!currentGroup){renderEmpty()}});
  $('#createPremiumGroup')?.addEventListener('click',openCreateGroup);$('#premiumEmptyCreate')?.addEventListener('click',openCreateGroup);
  $('#createGroupForm')?.addEventListener('submit',createGroup);$('#shareBetForm')?.addEventListener('submit',shareBet);
  document.addEventListener('click',e=>{if(e.target.closest('[data-close-premium]'))closeModal('#premiumGroupsModal');if(e.target.closest('[data-close-create-group]'))closeModal('#createGroupModal');if(e.target.closest('[data-close-share-bet]'))closeModal('#shareBetModal');if(e.target===modal)closeModal('#premiumGroupsModal')});
  document.addEventListener('betsocial:auth',e=>{setPremiumVisible(e.detail?.user||null);if(!e.detail?.user){currentGroup=null;closeModal('#premiumGroupsModal')}});
  (async()=>{try{const d=await api('/auth/me');setPremiumVisible(d.user)}catch{setPremiumVisible(null)}})();
  window.BetSocialPremium={refreshGroups,loadGroup};
})();
