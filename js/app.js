// ===== KONEAT - app.js PARTE 1/3 =====

// --- IndexedDB: mesmo banco do criar.html ---
function openDB(){ return new Promise((res,rej)=>{ const r=indexedDB.open('koneat_db',1); r.onupgradeneeded=()=>{ if(!r.result.objectStoreNames.contains('media')) r.result.createObjectStore('media'); }; r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
function saveMedia(id,file){ return openDB().then(db=> new Promise((res,rej)=>{ const tx=db.transaction('media','readwrite'); tx.objectStore('media').put(file,id); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); })); }
function getMediaUrl(id){ if(!id) return Promise.resolve(''); return openDB().then(db=> new Promise((res)=>{ try{ const tx=db.transaction('media','readonly'); const req=tx.objectStore('media').get(id); req.onsuccess=()=>{ if(!req.result) return res(''); res(URL.createObjectURL(req.result)); }; req.onerror=()=>res(''); }catch(e){ res(''); } })); }
function deleteMedia(id){ if(!id) return Promise.resolve(); return openDB().then(db=> new Promise((res)=>{ try{ const tx=db.transaction('media','readwrite'); tx.objectStore('media').delete(id); tx.oncomplete=()=>res(); tx.onerror=()=>res(); }catch(e){ res(); } })); }
async function resolveMidia(item){ if(item.mediaId){ const u=await getMediaUrl(item.mediaId); if(u) return u; } return item.midia || item.url || ''; }

// ===== REFINO - REGRA DO PERFIL =====
function normalizarTipo(t){
  const s = String(t || 'FEED').toLowerCase().trim();
  if(s.includes('story')) return 'STORY';
  if(s.includes('video') || s.includes('viral') || s.includes('reel')) return 'VIRAL';
  return 'FEED';
}
function ficaNoPerfil(p){ return normalizarTipo(p.tipo || p.type) !== 'STORY'; }

function getPosts(){
  let posts = JSON.parse(localStorage.getItem('koneat_posts')||'[]');
  let old1 = JSON.parse(localStorage.getItem('koneat_user_posts')||'[]');
  let old2 = JSON.parse(localStorage.getItem('koneat_virais_feed')||'[]');
  let todos = [...old1, ...old2];
  let mudou = false;
  posts.forEach(p=>{ const nt = normalizarTipo(p.tipo || p.type); if(p.tipo !== nt){ p.tipo = nt; mudou = true; } });
  todos.forEach(p=>{
    if(!p || (!p.url && !p.midia && !p.mediaId)) return;
    if(posts.some(x=>String(x.id)===String(p.id))) return;
    const tipo = normalizarTipo(p.tipo || p.type);
    posts.unshift({ id: p.id || ('post_'+Date.now()+Math.random()), mediaId: p.mediaId || '', url: p.url || '', midia: p.midia || p.url || '', mediaType: p.mediaType || (String(p.type||'').toLowerCase()==='video' ? 'video' : 'image'), tipo: tipo, type: p.type || '', author: p.author || localStorage.getItem('koneat_username') || 'koneat_user', caption: p.caption || p.legenda || '', createdAt: p.createdAt || p.data || Date.now(), expiresAt: p.expiresAt || null });
    mudou = true;
  });
  const agora = Date.now();
  const antes = posts.length;
  posts = posts.filter(p=> !(normalizarTipo(p.tipo||p.type)==='STORY' && p.expiresAt && p.expiresAt < agora));
  if(posts.length!==antes) mudou=true;
  if(mudou) localStorage.setItem('koneat_posts', JSON.stringify(posts));
  return posts;
}
function savePosts(p){ localStorage.setItem('koneat_posts', JSON.stringify(p)); }
function getUser(){ return localStorage.getItem('koneat_username')||'koneat_user'; }

// ===== REAÇÕES GLOBAL - FUNCIONAL, NÃO SÓ ESTÉTICA =====
// Mesma chave em VIRAL e HOME. Ex: like, repost, save, follow
function reactionKey(tipo,id){ return `koneat_${tipo}_${id}`; }
function isReaction(tipo,id){ return localStorage.getItem(reactionKey(tipo,id))==='true'; }
function toggleReaction(tipo,id){
  const k = reactionKey(tipo,id);
  const on = localStorage.getItem(k)!=='true';
  localStorage.setItem(k, on ? 'true' : 'false');
  // Atualiza TODOS os botões desse post na tela, em qualquer aba
  document.querySelectorAll(`[data-reaction="${tipo}"][data-id="${id}"]`).forEach(b=>{ b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
  return on;
}
function getCounts(id){
  try{ return JSON.parse(localStorage.getItem('koneat_counts')||'{}')[id] || {like:0, comment:0, repost:0}; }catch(e){ return {like:0, comment:0, repost:0}; }
}
function bumpCount(id, campo, delta){
  let all = {}; try{ all = JSON.parse(localStorage.getItem('koneat_counts')||'{}'); }catch(e){}
  if(!all[id]) all[id] = {like:0, comment:0, repost:0};
  all[id][campo] = Math.max(0, (all[id][campo]||0) + delta);
  localStorage.setItem('koneat_counts', JSON.stringify(all));
  return all[id];
}
function getComments(id){ try{ return JSON.parse(localStorage.getItem('koneat_comments_'+id)||'[]'); }catch(e){ return []; } }
function addComment(id, texto, autor){
  const arr = getComments(id); arr.push({text:texto, author:autor||getUser(), at:Date.now()}); localStorage.setItem('koneat_comments_'+id, JSON.stringify(arr)); return arr;
}
function doRepost(id){
  const posts = getPosts(); const orig = posts.find(p=>String(p.id)===String(id)); if(!orig) return false;
  const on = toggleReaction('repost', id); bumpCount(id,'repost', on?1:-1);
  if(on){ posts.unshift({...orig, id:'post_'+Date.now(), isRepost:true, repostedFrom:String(id), createdAt:Date.now()}); savePosts(posts); }
  else { savePosts(posts.filter(p=>!(p.isRepost && String(p.repostedFrom)===String(id)))); }
  return on;
}
async function doShare(post){
  const texto = (post && post.caption) ? post.caption : 'Confira no Koneat!';
  const url = location.href;
  try{ if(navigator.share){ await navigator.share({title:'Koneat', text:texto, url}); return; } }catch(e){}
  try{ await navigator.clipboard.writeText(url); alert('Link copiado!'); }catch(e){ alert('Link: '+url); }
}
// Modal de comentários - global, usado em VIRAL e HOME
function openComments(id){
  let m = document.getElementById('koneatCommentsModal');
  if(!m){ m=document.createElement('div'); m.id='koneatCommentsModal'; m.style.cssText='display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;align-items:flex-end;justify-content:center;'; m.innerHTML=`<div style="background:#fff;width:100%;max-width:520px;border-radius:16px 16px 0 0;max-height:75vh;display:flex;flex-direction:column;"><div style="display:flex;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #eee;"><b>Comentários</b><button id="koneatCommentsClose" style="border:none;background:none;font-size:20px;">✕</button></div><div id="koneatCommentsList" style="flex:1;overflow:auto;padding:12px 16px;"></div><div style="display:flex;gap:8px;padding:10px 16px;border-top:1px solid #eee;"><input id="koneatCommentInput" placeholder="Adicione um comentário..." style="flex:1;border:1px solid #ddd;border-radius:20px;padding:10px 12px;"><button id="koneatCommentSend" style="background:#000;color:#fff;border:none;border-radius:20px;padding:10px 16px;">Enviar</button></div></div>`; document.body.appendChild(m); m.querySelector('#koneatCommentsClose').onclick=()=>m.style.display='none'; m.onclick=e=>{ if(e.target===m) m.style.display='none'; }; }
  const list = m.querySelector('#koneatCommentsList'); const input = m.querySelector('#koneatCommentInput');
  function renderList(){ const c = getComments(id); list.innerHTML = c.length ? c.map(x=>`<div style="padding:8px 0;border-bottom:1px solid #f0f0f0;"><b>@${x.author}</b><div>${x.text}</div></div>`).join('') : '<p style="color:#888;">Nenhum comentário ainda.</p>'; }
  renderList(); m.style.display='flex'; input.value=''; input.focus();
  m.querySelector('#koneatCommentSend').onclick=()=>{ const t=input.value.trim(); if(!t) return; addComment(id,t); bumpCount(id,'comment',1); renderList(); input.value=''; document.querySelectorAll(`[data-count-comment="${id}"]`).forEach(el=>el.textContent=getCounts(id).comment); };
}
function openPostMenu(post){
  // ⋮ do topo - abre compartilhar / copiar link / denunciar / etc
  const op = prompt('⋮ Opções:\n1 = Compartilhar\n2 = Copiar link\n3 = Salvar\nDigite 1, 2 ou 3');
  if(op==='1') doShare(post);
  if(op==='2'){ navigator.clipboard.writeText(location.href); alert('Link copiado!'); }
  if(op==='3'){ toggleReaction('save', post.id); alert('Salvo!'); }
}
// ===== VÍDEO LISO - só toca o que está na tela =====
function setupSmoothVideo(video, container){
  if(!video) return;
  video.preload='metadata'; video.setAttribute('playsinline',''); video.setAttribute('webkit-playsinline','');
  if(!video._smooth){
    video._smooth=true;
    video.addEventListener('click', ()=>{ video.paused ? video.play().catch(()=>{}) : video.pause(); });
  }
  if(container && 'IntersectionObserver' in window){
    const io = new IntersectionObserver(entries=>{ entries.forEach(en=>{ if(en.isIntersecting){ video.play().catch(()=>{}); } else { video.pause(); } }); }, {threshold:0.6});
    io.observe(container);
  }
}

// ===== OLHO DA SENHA =====
function initOlho(){
  const pw = document.getElementById('passwordField'); const btn = document.getElementById('togglePassBtn'); const eye = document.getElementById('eyeIcon'); if(!pw||!btn||!eye) return;
  const open = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
  const closed = `<line x1="1" y1="1" x2="23" y2="23"></line><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>`;
  let manual = false;
  pw.addEventListener('input', ()=>{ if(pw.value.length>0 && !manual){ pw.setAttribute('type','password'); eye.innerHTML=closed; } else if(pw.value.length===0){ manual=false; pw.setAttribute('type','text'); eye.innerHTML=open; } });
  btn.addEventListener('click', ()=>{ manual=true; const isPw = pw.getAttribute('type')==='password'; pw.setAttribute('type', isPw?'text':'password'); eye.innerHTML = isPw?open:closed; });
}
function initLogin(){
  const form = document.getElementById('loginForm'); if(!form) return;
  form.addEventListener('submit', e=>{ e.preventDefault(); const email = document.getElementById('emailField').value.trim(); const pw = document.getElementById('passwordField').value; if(!email||!pw){ alert('Preencha o e-mail e a senha.'); return; } localStorage.setItem('koneat_email', email); window.location.href='passo1.html'; });
  const g = document.getElementById('btnGoogle'); if(g) g.addEventListener('click', ()=> window.location.href='passo1.html');
  const su = document.getElementById('btnSignUp'); if(su) su.addEventListener('click', ()=> window.location.href='cadastro.html');
  const fg = document.getElementById('btnForgot'); if(fg) fg.addEventListener('click', ()=> window.location.href='recuperar.html');
}
function initCadastro(){
  const form = document.getElementById('signupForm'); if(!form) return;
  const userF = document.getElementById('usernameField'); if(userF) userF.addEventListener('input', e=>{ e.target.value=e.target.value.toLowerCase().replace(/[^a-z0-9._]/g,''); });
  form.addEventListener('submit', e=>{ e.preventDefault(); const u = userF.value.trim(); const email = document.getElementById('emailField').value.trim(); const pw = document.getElementById('passwordField').value; if(!u||!email||!pw){ alert('Preencha todos os campos.'); return; } localStorage.setItem('koneat_username', u); localStorage.setItem('koneat_user_tag', '@'+u); localStorage.setItem('koneat_name', u); localStorage.setItem('koneat_email', email); window.location.href='passo1.html'; });
  const back = document.getElementById('btnLoginRedirect'); if(back) back.addEventListener('click', ()=> window.location.href='index.html');
}
function initRecuperar(){
  const form = document.getElementById('recoveryForm'); if(!form) return;
  form.addEventListener('submit', e=>{ e.preventDefault(); const email = document.getElementById('emailField').value.trim(); if(!email){ alert('Digite o e-mail da conta.'); return; } alert('Código de recuperação enviado para '+email); window.location.href='index.html'; });
  const back = document.getElementById('btnLoginRedirect'); if(back) back.addEventListener('click', ()=> window.location.href='index.html');
                                                                   }

// ===== KONEAT - app.js PARTE 2/3 =====

// ===== MENSAGENS =====
function initMensagens(){
  const header = document.getElementById('headerCurrentUsername');
  if(header) header.textContent = '@' + getUser();
  const btns = document.querySelectorAll('.tab-msg-btn');
  const ind = document.getElementById('tabIndicator');
  if(btns.length && ind){
    const pos = ()=>{
      const act = document.querySelector('.tab-msg-btn.active') || btns[0];
      ind.style.width = act.offsetWidth + 'px';
      ind.style.transform = `translateX(${act.offsetLeft}px)`;
    };
    window.addEventListener('load', pos);
    setTimeout(pos, 50);
    btns.forEach((b,i)=>{
      b.addEventListener('click', ()=>{
        btns.forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
        const pane = document.getElementById(i===0 ? 'pane-conversas' : 'pane-solicitacoes');
        if(pane) pane.classList.add('active');
        pos();
      });
    });
  }
  const search = document.querySelector('.search-input-msg');
  if(search){
    search.addEventListener('input', ()=>{
      const q = search.value.toLowerCase();
      document.querySelectorAll('.chat-item').forEach(item=>{
        item.style.display = item.textContent.toLowerCase().includes(q) ? 'flex' : 'none';
      });
    });
  }
  window.switchMsgTab = function(index, paneId){
    const buttons = document.querySelectorAll('.tab-msg-btn');
    buttons.forEach(btn=>btn.classList.remove('active'));
    if(buttons[index]) buttons[index].classList.add('active');
    document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
    const pane = document.getElementById(paneId);
    if(pane) pane.classList.add('active');
    const indicator = document.getElementById('tabIndicator');
    if(indicator && buttons[index]){
      indicator.style.width = buttons[index].offsetWidth + 'px';
      indicator.style.transform = `translateX(${buttons[index].offsetLeft}px)`;
    }
  };
}

// ===== CHAT =====
function initChat(){
  const box = document.getElementById('chatMessages');
  if(!box) return;
  const input = document.querySelector('.message-input');
  const sendBtn = document.querySelector('button[aria-label="Encaminhar"]');
  const KEY = 'koneat_chat_koneat';
  const msgs = JSON.parse(localStorage.getItem(KEY) || '[]');
  function render(){
    if(msgs.length===0) return;
    box.innerHTML = '';
    box.style.justifyContent = 'flex-start';
    box.style.alignItems = 'stretch';
    msgs.forEach(m=>{
      const div = document.createElement('div');
      div.style.cssText = 'align-self:flex-end;background:#000;color:#fff;padding:10px 14px;border-radius:18px;max-width:80%;margin-bottom:8px;font-size:15px;word-break:break-word;';
      div.textContent = m.text;
      box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
  }
  function send(){
    if(!input) return;
    const txt = input.value.trim();
    if(!txt) return;
    msgs.push({text: txt, at: Date.now()});
    localStorage.setItem(KEY, JSON.stringify(msgs));
    input.value = '';
    render();
  }
  if(sendBtn) sendBtn.addEventListener('click', send);
  if(input) input.addEventListener('keydown', e=>{ if(e.key==='Enter') send(); });
  document.querySelectorAll('button[aria-label="Câmera"], button[aria-label="Gravar áudio"], button[aria-label="Galeria"]').forEach(b=>{
    b.addEventListener('click', ()=> alert('Em breve no Koneat'));
  });
  render();
}

// ===== PASSO 1 - PERFIL - AGORA USA REAÇÃO GLOBAL =====
function initPasso1(){
  const grid = document.getElementById('userPostsGrid');
  if(!grid) return;
  const u = getUser();
  const name = localStorage.getItem('koneat_name') || u;
  const bio = localStorage.getItem('koneat_bio') || '';
  const h = document.getElementById('headerUsername'); if(h) h.textContent = u;
  const pn = document.getElementById('profileName'); if(pn) pn.textContent = name;
  const pt = document.getElementById('profileTag'); if(pt) pt.textContent = '@' + u;
  const pb = document.getElementById('profileBio'); if(pb) pb.textContent = bio;
  const menuBtn = document.getElementById('menuBtn');
  const menu = document.getElementById('dropdownMenu');
  if(menuBtn && menu){
    menuBtn.addEventListener('click', e=>{
      e.stopPropagation();
      menu.style.display = menu.style.display==='block' ? 'none' : 'block';
    });
    document.addEventListener('click', ()=>{ menu.style.display='none'; });
  }

  // MODAL - abre QUALQUER post + reações GLOBAL funcionando dentro dele
  let modal = document.getElementById('koneatPostModal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'koneatPostModal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:9999;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `<div style="position:relative;max-width:520px;width:100%;"><button id="koneatModalClose" style="position:absolute;top:-10px;right:-10px;background:#fff;border:none;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;z-index:2;">✕</button><div id="koneatModalMidia"></div><p id="koneatModalAutor" style="color:#fff;text-align:center;margin-top:10px;"></p><div id="koneatModalActions" style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;"><div style="display:flex;gap:16px;"><button data-m="like" style="background:none;border:none;font-size:22px;">❤️</button><button data-m="comment" style="background:none;border:none;font-size:22px;">💬</button><button data-m="repost" style="background:none;border:none;font-size:22px;">🔁</button><button data-m="share" style="background:none;border:none;font-size:22px;">↗️</button></div><button data-m="save" style="background:none;border:none;font-size:22px;">🔖</button></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('#koneatModalClose').addEventListener('click', ()=>{ const v = modal.querySelector('video'); if(v) v.pause(); modal.style.display='none'; });
    modal.addEventListener('click', e=>{ if(e.target===modal){ const v = modal.querySelector('video'); if(v) v.pause(); modal.style.display='none'; } });
  }
  function abrirPost(post, midia){
    const box = document.getElementById('koneatModalMidia');
    const autor = document.getElementById('koneatModalAutor');
    // Vídeo liso também no modal: preload metadata + clique pausa/despausa
    if(post.mediaType==='video') box.innerHTML = `<video src="${midia}" controls autoplay loop playsinline preload="metadata" style="width:100%;max-height:75vh;border-radius:12px;background:#000;object-fit:cover;"></video>`;
    else box.innerHTML = `<img src="${midia}" style="width:100%;max-height:75vh;object-fit:contain;border-radius:12px;">`;
    if(autor) autor.textContent = '@' + (post.author || u);
    // Liga as reações do modal no sistema GLOBAL da Parte 1
    modal.querySelectorAll('#koneatModalActions [data-m]').forEach(btn=>{
      const tipo = btn.dataset.m;
      btn.onclick = (e)=>{
        e.stopPropagation();
        if(tipo==='like'){ const on = toggleReaction('like', post.id); bumpCount(post.id,'like', on?1:-1); }
        if(tipo==='save'){ toggleReaction('save', post.id); }
        if(tipo==='repost'){ doRepost(post.id); render(); }
        if(tipo==='comment'){ modal.style.display='none'; openComments(post.id); }
        if(tipo==='share'){ doShare(post); }
      };
    });
    modal.style.display = 'flex';
  }

  // ABAS - acha pelo texto, não depende de class/id
  let abaAtual = 'todos';
  const tabBtns = Array.from(document.querySelectorAll('button')).filter(b=> /todos|repost|marca/i.test(b.textContent));
  let indicator = document.getElementById('profileTabIndicator') || document.getElementById('tabIndicatorPerfil') || document.querySelector('.profile-tab-indicator');
  if(!indicator && tabBtns[0] && tabBtns[0].parentElement){
    indicator = document.createElement('div');
    indicator.id = 'profileTabIndicator';
    indicator.style.cssText = 'position:absolute;bottom:0;left:0;height:2px;background:#000;transition:transform .25s ease,width .25s ease;';
    const pai = tabBtns[0].parentElement;
    if(getComputedStyle(pai).position==='static') pai.style.position='relative';
    pai.appendChild(indicator);
  }
  function moveIndicator(){
    if(!indicator) return;
    const act = tabBtns.find(b=>b.classList.contains('active')) || tabBtns[0];
    if(!act) return;
    indicator.style.width = act.offsetWidth + 'px';
    const paiLeft = act.parentElement ? act.parentElement.getBoundingClientRect().left : 0;
    indicator.style.transform = `translateX(${act.getBoundingClientRect().left - paiLeft}px)`;
  }
  tabBtns.forEach(b=>{
    b.addEventListener('click', ()=>{
      tabBtns.forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      const t = b.textContent.toLowerCase();
      if(t.includes('repost')) abaAtual='reposts';
      else if(t.includes('marca')) abaAtual='marcacoes';
      else abaAtual='todos';
      moveIndicator();
      render();
    });
  });
  window.addEventListener('load', moveIndicator);
  setTimeout(moveIndicator, 80);
  setTimeout(moveIndicator, 300);

  async function render(){
    // USA A REGRA DA PARTE 1: POST + VÍDEO + VIRAL ficam. STORY não.
    let todos = getPosts().filter(p=>ficaNoPerfil(p));
    todos = todos.filter(p=>!p.author || p.author===u || p.author==='koneat_user' || p.author===localStorage.getItem('koneat_name'));
    let lista = todos;
    // AJUSTE GLOBAL: Repost e Marcações agora leem a mesma chave do Viral/Home
    // Se o post foi repostado no Viral/Home, ele aparece aqui. Se foi salvo, aparece em Marcações.
    if(abaAtual==='reposts') lista = todos.filter(p=> p.isRepost===true || isReaction('repost', p.id));
    if(abaAtual==='marcacoes') lista = todos.filter(p=> p.marcado===true || isReaction('save', p.id));
    const empty = document.getElementById('emptyState');
    const count = document.getElementById('postsCount');
    if(count) count.textContent = todos.length;

    // BOTÃO SEMPRE VISÍVEL, EM SCROLL, DEPOIS DO GRID
    if(empty){
      empty.style.display = 'flex';
      empty.style.flexDirection = 'column';
      empty.style.alignItems = 'center';
      empty.style.marginTop = '24px';
      const btn = empty.querySelector('.btn-create-post, a, button');
      const txt = empty.querySelector('p, span, h3, h4');
      if(lista.length===0){
        if(btn){ btn.textContent='Crie seu primeiro post'; btn.href='./passo3.html'; }
        if(txt) txt.textContent = 'Nenhuma publicação ainda.';
      } else {
        if(btn){ btn.textContent='Crie outro post'; btn.href='./passo3.html'; }
        if(txt) txt.textContent = '';
      }
      if(grid.parentElement) grid.parentElement.appendChild(empty);
    }
    if(lista.length===0){
      grid.style.display = 'none';
      grid.innerHTML = '';
      moveIndicator();
      return;
    }
    grid.style.display = 'grid';
    const comMidia = await Promise.all(lista.map(async post=>({ post, midia: await resolveMidia(post) })));
    grid.innerHTML = comMidia.map(({post, midia})=>{
      const isVideo = post.mediaType==='video';
      return `<div class="post-grid-item" data-id="${post.id}" data-midia="${midia}" style="cursor:pointer;">
        <button type="button" class="btn-delete-post" data-del="${post.id}" title="Excluir">🗑️</button>
        <a class="btn-download-post" href="${midia}" download="koneat_${post.id}" title="Baixar">⬇️</a>
        ${isVideo ? `<video src="${midia}" muted playsinline preload="metadata"></video><div class="badge-video">▶</div>` : `<img src="${midia}" alt="Post">`}
      </div>`;
    }).join('');
    grid.querySelectorAll('.post-grid-item').forEach(el=>{
      el.addEventListener('click', e=>{
        if(e.target.closest('[data-del]') || e.target.closest('.btn-download-post')) return;
        const post = lista.find(p=>String(p.id)===String(el.dataset.id));
        if(post) abrirPost(post, el.dataset.midia);
      });
    });
    grid.querySelectorAll('[data-del]').forEach(b=>{
      b.addEventListener('click', async (e)=>{
        e.stopPropagation();
        if(!confirm('Deseja realmente excluir esta publicação?')) return;
        const alvo = getPosts().find(p=>String(p.id)===String(b.dataset.del));
        if(alvo && alvo.mediaId) await deleteMedia(alvo.mediaId);
        savePosts(getPosts().filter(p=>String(p.id)!==String(b.dataset.del)));
        render();
      });
    });
    moveIndicator();
  }
  window.deletePost = async function(id){
    if(!confirm('Deseja realmente excluir esta publicação?')) return;
    const alvo = getPosts().find(p=>String(p.id)===String(id));
    if(alvo && alvo.mediaId) await deleteMedia(alvo.mediaId);
    savePosts(getPosts().filter(p=>String(p.id)!==String(id)));
    render();
  };
  window.shareProfile = function(){
    const link = window.location.href;
    if(navigator.share){ navigator.share({title:'Perfil no Koneat', text:'Confira meu perfil no Koneat!', url: link}).catch(()=>{}); }
    else { navigator.clipboard.writeText(link); alert('Link do perfil copiado!'); }
  };
  render();
}


// ===== KONEAT - app.js PARTE 3/3 =====

// ===== PASSO 2 - VIRAIS - 6 ÍCONES VERTICAL À DIREITA =====
async function initPasso2(){
  const container = document.getElementById('reelsContainer'); if(!container) return;
  const header = document.getElementById('mainHeader');
  if(header){ container.addEventListener('scroll', ()=>{ if(container.scrollTop > 50) header.classList.add('hidden'); else header.classList.remove('hidden'); }); }
  const mBtn = document.getElementById('menuDecisionsBtn'); const mMenu = document.getElementById('dropdownDecisions');
  if(mBtn && mMenu){ mBtn.addEventListener('click', e=>{ e.stopPropagation(); mMenu.classList.toggle('show'); }); document.addEventListener('click', ()=> mMenu.classList.remove('show')); }
  const virais = getPosts().filter(p=>normalizarTipo(p.tipo||p.type)==='VIRAL' && p.mediaType==='video');
  if(virais.length===0){ container.innerHTML = `<div class="empty-feed-wrapper">Os vídeos virais aparecerão aqui.<br>Poste um vídeo na aba VÍDEO do criar.</div>`; return; }
  const comMidia = await Promise.all(virais.map(async item=>({ item, midia: await resolveMidia(item) })));
  container.innerHTML = comMidia.map(({item, midia})=>{
    const c = getCounts(item.id);
    const liked = isReaction('like', item.id), reposted = isReaction('repost', item.id), saved = isReaction('save', item.id), followed = isReaction('follow', item.id);
    return `<article class="reel-card" data-video-id="${item.id}" style="position:relative;">
      <video class="reel-video-element" src="${midia}" autoplay loop muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;background:#000;"></video>
      <button type="button" class="btn-toggle-sound" aria-label="Som">🔊</button>
      <div class="video-progress-bar-container" style="bottom:40px;"><div class="video-progress-bar-fill"></div></div>
      <div class="video-footer-info"><div class="creator-row">
        <div class="creator-avatar-circle">${(item.author||'K').charAt(0).toUpperCase()}</div>
        <span class="creator-name">@${item.author||'koneat_user'}</span>
        <button type="button" class="btn-follow" data-reaction="follow" data-id="${item.id}">${followed?'Seguindo':'Seguir'}</button>
      </div><p style="color:#fff;font-size:13px;margin:6px 0 0;">${item.caption||''}</p></div>
      <div class="video-actions-sidebar" style="display:flex;flex-direction:column;gap:14px;align-items:center;">
        <button type="button" class="action-item btn-like ${liked?'is-on':''}" data-reaction="like" data-id="${item.id}" aria-label="Curtir">❤️<span style="font-size:11px;color:#fff;display:block;">${c.like||''}</span></button>
        <button type="button" class="action-item btn-comment" data-id="${item.id}" aria-label="Comentar">💬<span style="font-size:11px;color:#fff;display:block;" data-count-comment="${item.id}">${c.comment||''}</span></button>
        <button type="button" class="action-item btn-repost ${reposted?'is-on':''}" data-reaction="repost" data-id="${item.id}" aria-label="Repostar">🔁<span style="font-size:11px;color:#fff;display:block;">${c.repost||''}</span></button>
        <button type="button" class="action-item btn-share" data-id="${item.id}" aria-label="Encaminhar">↗️</button>
        <button type="button" class="action-item btn-save ${saved?'is-on':''}" data-reaction="save" data-id="${item.id}" aria-label="Marcar">🔖</button>
        <button type="button" class="action-item btn-more" data-id="${item.id}" aria-label="Mais" style="margin-top:10px;">⋮</button>
      </div>
    </article>`;
  }).join('');
  container.querySelectorAll('.reel-card').forEach(card=>{
    const video = card.querySelector('.reel-video-element'); const fill = card.querySelector('.video-progress-bar-fill'); const soundBtn = card.querySelector('.btn-toggle-sound');
    setupSmoothVideo(video, card);
    if(video && fill) video.addEventListener('timeupdate', ()=>{ if(video.duration) fill.style.width = (video.currentTime/video.duration*100)+'%'; });
    if(soundBtn && video) soundBtn.addEventListener('click', e=>{ e.stopPropagation(); video.muted = !video.muted; soundBtn.textContent = video.muted ? '🔇' : '🔊'; });
  });
  container.querySelectorAll('.btn-like').forEach(b=> b.addEventListener('click', ()=>{ const on = toggleReaction('like', b.dataset.id); bumpCount(b.dataset.id,'like', on?1:-1); b.classList.toggle('is-on', on); }));
  container.querySelectorAll('.btn-repost').forEach(b=> b.addEventListener('click', ()=>{ doRepost(b.dataset.id); b.classList.toggle('is-on', isReaction('repost', b.dataset.id)); }));
  container.querySelectorAll('.btn-save').forEach(b=> b.addEventListener('click', ()=>{ const on = toggleReaction('save', b.dataset.id); b.classList.toggle('is-on', on); }));
  container.querySelectorAll('.btn-comment').forEach(b=> b.addEventListener('click', ()=> openComments(b.dataset.id)));
  container.querySelectorAll('.btn-share').forEach(b=> b.addEventListener('click', ()=>{ const p = virais.find(x=>String(x.id)===String(b.dataset.id)); doShare(p); }));
  container.querySelectorAll('.btn-more').forEach(b=> b.addEventListener('click', ()=>{ const p = virais.find(x=>String(x.id)===String(b.dataset.id)); openPostMenu(p); }));
  container.querySelectorAll('.btn-follow').forEach(b=> b.addEventListener('click', ()=>{ const on = toggleReaction('follow', b.dataset.id); b.textContent = on ? 'Seguindo' : 'Seguir'; }));
}

// ===== PASSO 3 - CRIAR =====
function initPasso3(){
  const galleryInput = document.getElementById('galleryInput'); if(!galleryInput) return;
  const cameraInput = document.getElementById('cameraInput'); const emptyState = document.getElementById('emptyState'); const imagePreview = document.getElementById('imagePreview'); const videoPreview = document.getElementById('videoPreview'); const advanceBtn = document.getElementById('advanceButton');
  let selectedFile = null; let currentUrl = null; let currentTipo = 'FEED';
  const open = id => document.getElementById(id);
  if(open('openGallery')) open('openGallery').addEventListener('click', ()=> galleryInput.click());
  if(open('openGalleryIcon')) open('openGalleryIcon').addEventListener('click', ()=> galleryInput.click());
  if(open('openCamera')) open('openCamera').addEventListener('click', ()=> cameraInput && cameraInput.click());
  function show(file){ if(!file) return; selectedFile = file; if(currentUrl) URL.revokeObjectURL(currentUrl); currentUrl = URL.createObjectURL(file); if(emptyState) emptyState.style.display='none'; if(imagePreview) imagePreview.style.display='none'; if(videoPreview) videoPreview.style.display='none'; if(file.type.startsWith('video/')){ if(videoPreview){ videoPreview.src=currentUrl; videoPreview.style.display='block'; } } else { if(videoPreview){ videoPreview.pause(); videoPreview.removeAttribute('src'); } if(imagePreview){ imagePreview.src=currentUrl; imagePreview.style.display='block'; } } }
  galleryInput.addEventListener('change', e=> show(e.target.files[0])); if(cameraInput) cameraInput.addEventListener('change', e=> show(e.target.files[0]));
  document.querySelectorAll('.create-tab').forEach(tab=>{ tab.addEventListener('click', ()=>{ document.querySelectorAll('.create-tab').forEach(t=>t.classList.remove('active')); tab.classList.add('active'); const t = (tab.dataset.type || tab.textContent || '').toLowerCase(); if(t.includes('story')) currentTipo='STORY'; else if(t.includes('video') || t.includes('viral')) currentTipo='VIRAL'; else currentTipo='FEED'; }); });
  if(advanceBtn) advanceBtn.addEventListener('click', async ()=>{ if(!selectedFile){ galleryInput.click(); return; } if(currentTipo==='VIRAL' && selectedFile.size > 50*1024*1024){ alert('Vídeo viral muito grande. Use até 50MB.'); return; } if(currentTipo==='FEED' && selectedFile.size > 100*1024*1024){ alert('Arquivo muito grande. Use até 100MB.'); return; } const mediaId = 'media_'+Date.now(); try{ await saveMedia(mediaId, selectedFile); }catch(e){} const posts = getPosts(); posts.unshift({ id: 'post_'+Date.now(), mediaId: mediaId, url: '', midia: '', mediaType: selectedFile.type.startsWith('video/') ? 'video' : 'image', tipo: currentTipo, author: getUser(), caption: '', createdAt: Date.now(), expiresAt: currentTipo==='STORY' ? Date.now()+24*60*60*1000 : null }); savePosts(posts); window.location.href = currentTipo==='VIRAL' ? './passo2.html' : './passo4.html'; });
}

// ===== STORY VIEWER - AGRUPADO: 1 BOLHA = VÁRIOS STORIES =====
async function openStoryViewerGrouped(lista, startIndex, isMine){
  let idx = startIndex || 0;
  let v = document.getElementById('koneatStoryViewer'); if(v) v.remove();
  v = document.createElement('div'); v.id='koneatStoryViewer'; v.style.cssText='position:fixed;inset:0;background:#000;z-index:10001;display:flex;flex-direction:column;';
  document.body.appendChild(v);
  let timer = null, start = 0, videoEl = null;
  function fechar(){ if(timer) clearInterval(timer); if(videoEl) videoEl.pause(); v.remove(); }
  async function mostrar(i){
    if(i < 0){ fechar(); return; }
    if(i >= lista.length){ fechar(); return; }
    idx = i;
    const post = lista[idx];
    const midia = await resolveMidia(post);
    const isVideo = post.mediaType==='video';
    if(timer) clearInterval(timer);
    // Barrinhas no topo: 1 por story, igual o exemplo - 2 stories = 2 barrinhas
    const barras = lista.map((_, j)=>{
      const w = j < idx ? 100 : 0;
      return `<div style="flex:1;height:3px;background:rgba(255,255,255,.35);border-radius:99px;overflow:hidden;"><div id="koneatBar_${j}" style="height:100%;width:${w}%;background:#fff;"></div></div>`;
    }).join('');
    const horas = post.createdAt ? Math.max(1, Math.round((Date.now()-post.createdAt)/3600000)) + ' h' : '';
    v.innerHTML = `
      <div style="display:flex;gap:4px;padding:10px 12px 0;">${barras}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;color:#fff;"><b>@${post.author||'você'} <span style="font-weight:400;opacity:.7;font-size:13px;">${horas}</span></b><button id="koneatStoryClose" style="background:none;border:none;color:#fff;font-size:22px;">✕</button></div>
      <div id="koneatStoryArea" style="flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;">
        ${isVideo ? `<video id="koneatStoryVideo" src="${midia}" autoplay playsinline style="width:100%;height:100%;object-fit:cover;"></video>` : `<img src="${midia}" style="width:100%;height:100%;object-fit:cover;">`}
        <div id="koneatTapLeft" style="position:absolute;left:0;top:0;width:30%;height:100%;"></div>
        <div id="koneatTapRight" style="position:absolute;right:0;top:0;width:30%;height:100%;"></div>
      </div>
      <div id="koneatStoryBottom" style="padding:12px;display:flex;gap:10px;align-items:center;"></div>`;
    v.querySelector('#koneatStoryClose').onclick = fechar;
    v.querySelector('#koneatTapLeft').onclick = ()=> mostrar(idx-1);
    v.querySelector('#koneatTapRight').onclick = ()=> mostrar(idx+1);
    const bottom = v.querySelector('#koneatStoryBottom');
    const progress = v.querySelector('#koneatBar_'+idx);
    start = Date.now();
    timer = setInterval(()=>{ const p = Math.min(100, (Date.now()-start)/30000*100); if(progress) progress.style.width = p+'%'; if(p>=100) mostrar(idx+1); }, 100);
    videoEl = v.querySelector('#koneatStoryVideo');
    if(videoEl){
      videoEl.addEventListener('click', (e)=>{ e.stopPropagation(); videoEl.paused ? videoEl.play() : videoEl.pause(); });
      videoEl.addEventListener('loadedmetadata', ()=>{
        if(timer) clearInterval(timer);
        timer = setInterval(()=>{ if(!videoEl.duration) return; const p = Math.min(100, videoEl.currentTime/videoEl.duration*100); if(progress) progress.style.width = p+'%'; if(p>=100) mostrar(idx+1); }, 100);
      });
    }
    if(isMine){
      bottom.innerHTML = `<button id="koneatStoryDelete" style="margin-left:auto;background:#fff;border:none;border-radius:50%;width:44px;height:44px;font-size:20px;">🗑️</button>`;
      bottom.querySelector('#koneatStoryDelete').onclick = async ()=>{
        if(!confirm('Excluir este story?')) return;
        if(post.mediaId) await deleteMedia(post.mediaId);
        savePosts(getPosts().filter(p=>String(p.id)!==String(post.id)));
        lista.splice(idx,1);
        if(lista.length===0){ fechar(); location.reload(); return; }
        mostrar(Math.min(idx, lista.length-1));
      };
    } else {
      const liked = isReaction('like', post.id);
      bottom.innerHTML = `<input id="koneatStoryMsg" placeholder="Enviar mensagem" style="flex:1;background:none;border:1px solid #fff;color:#fff;border-radius:20px;padding:10px 14px;"><button style="background:none;border:none;color:#fff;font-size:22px;">⋮</button><button id="koneatStoryLike" style="background:none;border:none;font-size:26px;color:${liked?'#e74c3c':'#fff'};">${liked?'❤️':'♡'}</button>`;
      bottom.querySelector('#koneatStoryLike').onclick = (e)=>{ const on = toggleReaction('like', post.id); e.target.textContent = on ? '❤️' : '♡'; e.target.style.color = on ? '#e74c3c' : '#fff'; };
      bottom.querySelector('#koneatStoryMsg').addEventListener('keydown', e=>{ if(e.key==='Enter' && e.target.value.trim()){ addComment(post.id, e.target.value.trim()); alert('Mensagem enviada!'); e.target.value=''; } });
    }
  }
  mostrar(idx);
}
// Compatibilidade: se algum lugar ainda chamar o nome antigo
function openStoryViewer(post, midia, isMine){ openStoryViewerGrouped([post], 0, isMine); }

// ===== PASSO 4 - HOME - 5 ÍCONES + STORY DENTRO DO (+) =====
async function initPasso4(){
  const feed = document.getElementById('postsDynamicFeed'); if(!feed) return;
  const tabs = document.querySelectorAll('.subnav-tab'); const ind = document.getElementById('subnavIndicator');
  function moveInd(tab){ if(!ind || !tab) return; ind.style.width = tab.offsetWidth+'px'; ind.style.left = tab.offsetLeft+'px'; }
  tabs.forEach(t=> t.addEventListener('click', ()=>{ tabs.forEach(x=>x.classList.remove('active')); t.classList.add('active'); moveInd(t); render(t.dataset.target); }));
  window.addEventListener('load', ()=> moveInd(document.querySelector('.subnav-tab.active'))); setTimeout(()=> moveInd(document.querySelector('.subnav-tab.active')), 100);
  // STORIES: 1 BOLHA POR PESSOA - postou 2, 3 stories, fica na mesma bolha
  const storiesBar = document.querySelector('.stories-bar');
  if(storiesBar){
    const allStories = getPosts().filter(p=>normalizarTipo(p.tipo||p.type)==='STORY');
    // Agrupa por autor
    const porAutor = {};
    allStories.forEach(s=>{ const a = s.author || getUser(); if(!porAutor[a]) porAutor[a]=[]; porAutor[a].push(s); });
    Object.keys(porAutor).forEach(a=> porAutor[a].sort((x,y)=> (x.createdAt||0)-(y.createdAt||0)));
    const mine = porAutor[getUser()] || [];
    const outrosAutores = Object.keys(porAutor).filter(a=> a !== getUser());
    storiesBar.querySelectorAll('.js-story-item').forEach(el=>el.remove());
    // 1) MEU - dentro do (+) / "seu story" - 1 bolha só, mesmo com vários
    let meuEl = storiesBar.querySelector('.story-item');
    if(meuEl){
      meuEl.style.cursor='pointer';
      if(mine.length){
        const midiaMine = await resolveMidia(mine[0]);
        const avatar = meuEl.querySelector('.story-avatar');
        if(avatar) avatar.innerHTML = `<img src="${midiaMine}" style="width:100%;height:100%;object-fit:cover;">`;
        meuEl.onclick = ()=> openStoryViewerGrouped(mine, 0, true);
        const plus = meuEl.querySelector('.story-plus, .plus, [class*="plus"]');
        if(plus) plus.onclick = (e)=>{ e.stopPropagation(); window.location.href='./passo3.html'; };
      } else {
        meuEl.onclick = ()=> window.location.href='./passo3.html';
      }
    }
        // 2) OUTROS - 1 bolha por pessoa, fora do (+)
    for(const autor of outrosAutores){
      const lista = porAutor[autor];
      const midia = await resolveMidia(lista[0]);
      const div = document.createElement('div');
      div.className = 'story-item js-story-item';
      div.style.cursor = 'pointer';
      div.innerHTML = `<div class="story-avatar" style="padding:0;overflow:hidden;border:2px solid #000;"><img src="${midia}" style="width:100%;height:100%;object-fit:cover;"></div><span class="story-username">@${autor}</span>`;
      div.onclick = ()=> openStoryViewerGrouped(lista, 0, false);
      storiesBar.appendChild(div);
    }
  }

  async function render(filter){
    let posts = getPosts().filter(p=>normalizarTipo(p.tipo||p.type)==='FEED');
    if(filter==='following') posts = posts.filter(p=>p.author===getUser());
    if(posts.length===0){
      feed.innerHTML = `<div class="empty-home-feed">Nenhuma publicação no momento.<br>Crie um post para começar!</div>`;
      return;
    }
    const comMidia = await Promise.all(posts.map(async item=>({ item, midia: await resolveMidia(item) })));
    feed.innerHTML = comMidia.map(({item, midia})=>{
      const isVideo = item.mediaType==='video';
      const c = getCounts(item.id);
      const liked = isReaction('like', item.id);
      const saved = isReaction('save', item.id);
      const followed = isReaction('follow', item.id);
      const reposted = isReaction('repost', item.id);
      return `<article class="post-card" data-post-id="${item.id}" style="margin-bottom:18px;">
        <div class="post-header" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;">
          <div class="post-author-info" style="display:flex;align-items:center;gap:8px;">
            <div class="author-avatar">${(item.author||'K').charAt(0).toUpperCase()}</div>
            <span class="author-name">@${item.author||'koneat_user'}</span>
            <button type="button" class="btn-follow-home" data-reaction="follow" data-id="${item.id}">${followed?'Seguindo':'Seguir'}</button>
          </div>
          <button type="button" class="btn-more-home" data-id="${item.id}" style="background:none;border:none;font-size:20px;">⋮</button>
        </div>
        <div class="post-media-wrapper" style="width:100%;aspect-ratio:4/5;background:#000;overflow:hidden;border-radius:12px;">
          ${isVideo ? `<video src="${midia}" autoplay loop muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;display:block;"></video>` : `<img src="${midia}" alt="Publicação" style="width:100%;height:100%;object-fit:cover;display:block;">`}
        </div>
        <div class="post-actions-bar" style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
          <div class="post-actions-left" style="display:flex;gap:16px;">
            <button type="button" class="post-action-btn btn-like-home ${liked?'is-on':''}" data-reaction="like" data-id="${item.id}" aria-label="Curtir">❤️ <span>${c.like||''}</span></button>
            <button type="button" class="post-action-btn btn-comment-home" data-id="${item.id}" aria-label="Comentar">💬 <span data-count-comment="${item.id}">${c.comment||''}</span></button>
            <button type="button" class="post-action-btn btn-repost-home ${reposted?'is-on':''}" data-reaction="repost" data-id="${item.id}" aria-label="Repostar">🔁 <span>${c.repost||''}</span></button>
            <button type="button" class="post-action-btn btn-share-home" data-id="${item.id}" aria-label="Encaminhar">↗️</button>
          </div>
          <button type="button" class="post-action-btn btn-save-home ${saved?'is-on':''}" data-reaction="save" data-id="${item.id}" aria-label="Marcar">🔖</button>
        </div>
      </article>`;
    }).join('');

    feed.querySelectorAll('.post-media-wrapper video').forEach(v=> setupSmoothVideo(v, v.closest('.post-card')));
    feed.querySelectorAll('.btn-like-home').forEach(b=> b.addEventListener('click', ()=>{ const on = toggleReaction('like', b.dataset.id); bumpCount(b.dataset.id,'like', on?1:-1); b.classList.toggle('is-on', on); }));
    feed.querySelectorAll('.btn-save-home').forEach(b=> b.addEventListener('click', ()=>{ const on = toggleReaction('save', b.dataset.id); b.classList.toggle('is-on', on); }));
    feed.querySelectorAll('.btn-repost-home').forEach(b=> b.addEventListener('click', ()=>{ doRepost(b.dataset.id); b.classList.toggle('is-on', isReaction('repost', b.dataset.id)); }));
    feed.querySelectorAll('.btn-comment-home').forEach(b=> b.addEventListener('click', ()=> openComments(b.dataset.id)));
    feed.querySelectorAll('.btn-share-home').forEach(b=> b.addEventListener('click', ()=>{ const p = posts.find(x=>String(x.id)===String(b.dataset.id)); doShare(p); }));
    feed.querySelectorAll('.btn-more-home').forEach(b=> b.addEventListener('click', ()=>{ const p = posts.find(x=>String(x.id)===String(b.dataset.id)); openPostMenu(p); }));
    feed.querySelectorAll('.btn-follow-home').forEach(b=> b.addEventListener('click', ()=>{ const on = toggleReaction('follow', b.dataset.id); b.textContent = on ? 'Seguindo' : 'Seguir'; }));
  }
  render('for-you');
}

// ===== LIGA TUDO =====
document.addEventListener('DOMContentLoaded', ()=>{
  initOlho(); initLogin(); initCadastro(); initRecuperar(); initMensagens(); initChat(); initPasso1(); initPasso2(); initPasso3(); initPasso4();
})

