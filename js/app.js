// ===== KONEAT - app.js PARTE 1/3 =====

// --- IndexedDB: mesmo banco do criar.html ---
function openDB(){ return new Promise((res,rej)=>{ const r=indexedDB.open('koneat_db',1); r.onupgradeneeded=()=>{ if(!r.result.objectStoreNames.contains('media')) r.result.createObjectStore('media'); }; r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
function saveMedia(id,file){ return openDB().then(db=> new Promise((res,rej)=>{ const tx=db.transaction('media','readwrite'); tx.objectStore('media').put(file,id); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); })); }
function getMediaUrl(id){ if(!id) return Promise.resolve(''); return openDB().then(db=> new Promise((res)=>{ try{ const tx=db.transaction('media','readonly'); const req=tx.objectStore('media').get(id); req.onsuccess=()=>{ if(!req.result) return res(''); res(URL.createObjectURL(req.result)); }; req.onerror=()=>res(''); }catch(e){ res(''); } })); }
function deleteMedia(id){ if(!id) return Promise.resolve(); return openDB().then(db=> new Promise((res)=>{ try{ const tx=db.transaction('media','readwrite'); tx.objectStore('media').delete(id); tx.oncomplete=()=>res(); tx.onerror=()=>res(); }catch(e){ res(); } })); }
async function resolveMidia(item){ if(item.mediaId){ const u=await getMediaUrl(item.mediaId); if(u) return u; } return item.midia || item.url || ''; }

// ===== REFINO - REGRA DO PERFIL =====
// POST, VÍDEO, VIRAL ficam no perfil. Só STORY não fica.
function normalizarTipo(t){
  const s = String(t || 'FEED').toLowerCase().trim();
  if(s.includes('story')) return 'STORY';
  if(s.includes('video') || s.includes('viral') || s.includes('reel')) return 'VIRAL';
  return 'FEED'; // POST, post, feed, foto, imagem -> FEED
}
function ficaNoPerfil(p){
  const tipo = normalizarTipo(p.tipo || p.type);
  return tipo !== 'STORY';
}

function getPosts(){
  let posts = JSON.parse(localStorage.getItem('koneat_posts')||'[]');
  let old1 = JSON.parse(localStorage.getItem('koneat_user_posts')||'[]');
  let old2 = JSON.parse(localStorage.getItem('koneat_virais_feed')||'[]');
  let todos = [...old1, ...old2];
  let mudou = false;
  // Normaliza os que já existem - se veio como video/post, vira VIRAL/FEED certo
  posts.forEach(p=>{
    const nt = normalizarTipo(p.tipo || p.type);
    if(p.tipo !== nt){ p.tipo = nt; mudou = true; }
  });
  todos.forEach(p=>{
    if(!p || (!p.url && !p.midia && !p.mediaId)) return;
    if(posts.some(x=>String(x.id)===String(p.id))) return;
    const tipo = normalizarTipo(p.tipo || p.type);
    posts.unshift({
      id: p.id || ('post_'+Date.now()+Math.random()),
      mediaId: p.mediaId || '',
      url: p.url || '',
      midia: p.midia || p.url || '',
      mediaType: p.mediaType || (String(p.type||'').toLowerCase()==='video' ? 'video' : 'image'),
      tipo: tipo,
      type: p.type || '',
      author: p.author || localStorage.getItem('koneat_username') || 'koneat_user',
      caption: p.caption || p.legenda || '',
      createdAt: p.createdAt || p.data || Date.now(),
      expiresAt: p.expiresAt || null
    });
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

// ===== OLHO DA SENHA =====
function initOlho(){
  const pw = document.getElementById('passwordField');
  const btn = document.getElementById('togglePassBtn');
  const eye = document.getElementById('eyeIcon');
  if(!pw||!btn||!eye) return;
  const open = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
  const closed = `<line x1="1" y1="1" x2="23" y2="23"></line><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>`;
  let manual = false;
  pw.addEventListener('input', ()=>{
    if(pw.value.length>0 && !manual){ pw.setAttribute('type','password'); eye.innerHTML=closed; }
    else if(pw.value.length===0){ manual=false; pw.setAttribute('type','text'); eye.innerHTML=open; }
  });
  btn.addEventListener('click', ()=>{
    manual=true;
    const isPw = pw.getAttribute('type')==='password';
    pw.setAttribute('type', isPw?'text':'password');
    eye.innerHTML = isPw?open:closed;
  });
}

// ===== LOGIN =====
function initLogin(){
  const form = document.getElementById('loginForm');
  if(!form) return;
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const email = document.getElementById('emailField').value.trim();
    const pw = document.getElementById('passwordField').value;
    if(!email||!pw){ alert('Preencha o e-mail e a senha.'); return; }
    localStorage.setItem('koneat_email', email);
    window.location.href='passo1.html';
  });
  const g = document.getElementById('btnGoogle');
  if(g) g.addEventListener('click', ()=> window.location.href='passo1.html');
  const su = document.getElementById('btnSignUp');
  if(su) su.addEventListener('click', ()=> window.location.href='cadastro.html');
  const fg = document.getElementById('btnForgot');
  if(fg) fg.addEventListener('click', ()=> window.location.href='recuperar.html');
}

// ===== CADASTRO =====
function initCadastro(){
  const form = document.getElementById('signupForm');
  if(!form) return;
  const userF = document.getElementById('usernameField');
  if(userF) userF.addEventListener('input', e=>{ e.target.value=e.target.value.toLowerCase().replace(/[^a-z0-9._]/g,''); });
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const u = userF.value.trim();
    const email = document.getElementById('emailField').value.trim();
    const pw = document.getElementById('passwordField').value;
    if(!u||!email||!pw){ alert('Preencha todos os campos.'); return; }
    localStorage.setItem('koneat_username', u);
    localStorage.setItem('koneat_user_tag', '@'+u);
    localStorage.setItem('koneat_name', u);
    localStorage.setItem('koneat_email', email);
    window.location.href='passo1.html';
  });
  const back = document.getElementById('btnLoginRedirect');
  if(back) back.addEventListener('click', ()=> window.location.href='index.html');
}

// ===== RECUPERAR =====
function initRecuperar(){
  const form = document.getElementById('recoveryForm');
  if(!form) return;
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const email = document.getElementById('emailField').value.trim();
    if(!email){ alert('Digite o e-mail da conta.'); return; }
    alert('Código de recuperação enviado para '+email);
    window.location.href='index.html';
  });
  const back = document.getElementById('btnLoginRedirect');
  if(back) back.addEventListener('click', ()=> window.location.href='index.html');
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

// ===== PASSO 1 - PERFIL =====
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

  // MODAL - abre QUALQUER post do painel: POST, VÍDEO, VIRAL
  let modal = document.getElementById('koneatPostModal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'koneatPostModal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:9999;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `<div style="position:relative;max-width:520px;width:100%;"><button id="koneatModalClose" style="position:absolute;top:-10px;right:-10px;background:#fff;border:none;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;z-index:2;">✕</button><div id="koneatModalMidia"></div><p id="koneatModalAutor" style="color:#fff;text-align:center;margin-top:10px;"></p></div>`;
    document.body.appendChild(modal);
    modal.querySelector('#koneatModalClose').addEventListener('click', ()=> modal.style.display='none');
    modal.addEventListener('click', e=>{ if(e.target===modal) modal.style.display='none'; });
  }
  function abrirPost(post, midia){
    const box = document.getElementById('koneatModalMidia');
    const autor = document.getElementById('koneatModalAutor');
    if(post.mediaType==='video') box.innerHTML = `<video src="${midia}" controls autoplay loop style="width:100%;max-height:75vh;border-radius:12px;background:#000;"></video>`;
    else box.innerHTML = `<img src="${midia}" style="width:100%;max-height:75vh;object-fit:contain;border-radius:12px;">`;
    if(autor) autor.textContent = '@' + (post.author || u);
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
    if(abaAtual==='reposts') lista = todos.filter(p=>p.isRepost===true);
    if(abaAtual==='marcacoes') lista = todos.filter(p=>p.marcado===true);
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
        ${isVideo ? `<video src="${midia}" muted playsinline></video><div class="badge-video">▶</div>` : `<img src="${midia}" alt="Post">`}
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

function toggleState(key){
  const v = localStorage.getItem(key)==='true';
  localStorage.setItem(key, v ? 'false' : 'true');
  return !v;
}
function isOn(key){ return localStorage.getItem(key)==='true'; }

// ===== PASSO 2 - VIRAIS =====
async function initPasso2(){
  const container = document.getElementById('reelsContainer');
  if(!container) return;
  const header = document.getElementById('mainHeader');
  if(header){
    container.addEventListener('scroll', ()=>{
      if(container.scrollTop > 50) header.classList.add('hidden');
      else header.classList.remove('hidden');
    });
  }
  const mBtn = document.getElementById('menuDecisionsBtn');
  const mMenu = document.getElementById('dropdownDecisions');
  if(mBtn && mMenu){
    mBtn.addEventListener('click', e=>{ e.stopPropagation(); mMenu.classList.toggle('show'); });
    document.addEventListener('click', ()=> mMenu.classList.remove('show'));
  }
  const virais = getPosts().filter(p=>normalizarTipo(p.tipo||p.type)==='VIRAL' && p.mediaType==='video');
  if(virais.length===0){
    container.innerHTML = `<div class="empty-feed-wrapper">Os vídeos virais aparecerão aqui.<br>Poste um vídeo na aba VÍDEO do criar.</div>`;
    return;
  }
  const comMidia = await Promise.all(virais.map(async item=>({ item, midia: await resolveMidia(item) })));
  container.innerHTML = comMidia.map(({item, midia})=>{
    const liked = isOn(`koneat_like_${item.id}`);
    const reposted = isOn(`koneat_repost_${item.id}`);
    const saved = isOn(`koneat_save_${item.id}`);
    return `<article class="reel-card" data-video-id="${item.id}">
      <video class="reel-video-element" src="${midia}" autoplay loop muted playsinline preload="auto"></video>
      <button type="button" class="btn-toggle-sound" aria-label="Som">🔊</button>
      <div class="video-progress-bar-container"><div class="video-progress-bar-fill"></div></div>
      <div class="video-footer-info"><div class="creator-row">
        <div class="creator-avatar-circle">${(item.author||'K').charAt(0).toUpperCase()}</div>
        <span class="creator-name">${item.author||'koneat_user'}</span>
        <button type="button" class="btn-follow">Seguir</button>
      </div></div>
      <div class="video-actions-sidebar">
        <button type="button" class="action-item btn-like ${liked?'liked':''}" data-id="${item.id}">❤️</button>
        <button type="button" class="action-item btn-comment" data-id="${item.id}">💬</button>
        <button type="button" class="action-item btn-repost ${reposted?'reposted':''}" data-id="${item.id}">🔁</button>
        <button type="button" class="action-item btn-save ${saved?'saved':''}" data-id="${item.id}">🔖</button>
        <button type="button" class="action-item btn-share" data-id="${item.id}">↗️</button>
      </div>
    </article>`;
  }).join('');
  container.querySelectorAll('.reel-card').forEach(card=>{
    const video = card.querySelector('.reel-video-element');
    const fill = card.querySelector('.video-progress-bar-fill');
    const soundBtn = card.querySelector('.btn-toggle-sound');
    if(video){
      video.play().catch(()=>{});
      video.addEventListener('timeupdate', ()=>{ if(video.duration && fill) fill.style.width = (video.currentTime/video.duration*100)+'%'; });
      video.addEventListener('click', ()=>{ video.paused ? video.play() : video.pause(); });
    }
    if(soundBtn && video) soundBtn.addEventListener('click', e=>{ e.stopPropagation(); video.muted = !video.muted; soundBtn.textContent = video.muted ? '🔇' : '🔊'; });
  });
  container.querySelectorAll('.btn-like').forEach(b=> b.addEventListener('click', ()=>{ const on = toggleState(`koneat_like_${b.dataset.id}`); b.classList.toggle('liked', on); }));
  container.querySelectorAll('.btn-repost').forEach(b=> b.addEventListener('click', ()=>{ const on = toggleState(`koneat_repost_${b.dataset.id}`); b.classList.toggle('reposted', on); }));
  container.querySelectorAll('.btn-save').forEach(b=> b.addEventListener('click', ()=>{ const on = toggleState(`koneat_save_${b.dataset.id}`); b.classList.toggle('saved', on); }));
  container.querySelectorAll('.btn-comment').forEach(b=> b.addEventListener('click', ()=> alert('Comentários em breve')));
  container.querySelectorAll('.btn-share').forEach(b=> b.addEventListener('click', ()=>{ if(navigator.share) navigator.share({title:'Koneat', url: location.href}); else alert('Link copiado!'); }));
  container.querySelectorAll('.btn-follow').forEach(b=> b.addEventListener('click', ()=>{ b.textContent = b.textContent==='Seguir' ? 'Seguindo' : 'Seguir'; }));
}

// ===== PASSO 3 - CRIAR - 3 ABAS: POST / STORY / VÍDEO =====
function initPasso3(){
  const galleryInput = document.getElementById('galleryInput');
  if(!galleryInput) return;
  const cameraInput = document.getElementById('cameraInput');
  const emptyState = document.getElementById('emptyState');
  const imagePreview = document.getElementById('imagePreview');
  const videoPreview = document.getElementById('videoPreview');
  const advanceBtn = document.getElementById('advanceButton');
  let selectedFile = null;
  let currentUrl = null;
  let currentTipo = 'FEED';
  const open = id => document.getElementById(id);
  if(open('openGallery')) open('openGallery').addEventListener('click', ()=> galleryInput.click());
  if(open('openGalleryIcon')) open('openGalleryIcon').addEventListener('click', ()=> galleryInput.click());
  if(open('openCamera')) open('openCamera').addEventListener('click', ()=> cameraInput && cameraInput.click());
  function show(file){
    if(!file) return;
    selectedFile = file;
    if(currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = URL.createObjectURL(file);
    if(emptyState) emptyState.style.display='none';
    if(imagePreview) imagePreview.style.display='none';
    if(videoPreview) videoPreview.style.display='none';
    if(file.type.startsWith('video/')){
      if(videoPreview){ videoPreview.src=currentUrl; videoPreview.style.display='block'; }
    } else {
      if(videoPreview){ videoPreview.pause(); videoPreview.removeAttribute('src'); }
      if(imagePreview){ imagePreview.src=currentUrl; imagePreview.style.display='block'; }
    }
  }
  galleryInput.addEventListener('change', e=> show(e.target.files[0]));
  if(cameraInput) cameraInput.addEventListener('change', e=> show(e.target.files[0]));
  document.querySelectorAll('.create-tab').forEach(tab=>{
    tab.addEventListener('click', ()=>{
      document.querySelectorAll('.create-tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      // Usa a mesma regra da Parte 1 - lê data-type OU texto
      const t = (tab.dataset.type || tab.textContent || '').toLowerCase();
      if(t.includes('story')) currentTipo='STORY';
      else if(t.includes('video') || t.includes('viral')) currentTipo='VIRAL';
      else currentTipo='FEED'; // POST
    });
  });
  if(advanceBtn) advanceBtn.addEventListener('click', async ()=>{
    if(!selectedFile){ galleryInput.click(); return; }
    if(currentTipo==='VIRAL' && selectedFile.size > 50*1024*1024){ alert('Vídeo viral muito grande. Use até 50MB.'); return; }
    if(currentTipo==='FEED' && selectedFile.size > 100*1024*1024){ alert('Arquivo muito grande. Use até 100MB.'); return; }
    const mediaId = 'media_'+Date.now();
    try{ await saveMedia(mediaId, selectedFile); }catch(e){}
    const posts = getPosts();
    posts.unshift({
      id: 'post_'+Date.now(),
      mediaId: mediaId,
      url: '',
      midia: '',
      mediaType: selectedFile.type.startsWith('video/') ? 'video' : 'image',
      tipo: currentTipo,
      author: getUser(),
      caption: '',
      createdAt: Date.now(),
      expiresAt: currentTipo==='STORY' ? Date.now()+24*60*60*1000 : null
    });
    savePosts(posts);
    window.location.href = currentTipo==='VIRAL' ? './passo2.html' : './passo4.html';
  });
}

// ===== PASSO 4 - HOME =====
async function initPasso4(){
  const feed = document.getElementById('postsDynamicFeed');
  if(!feed) return;
  const tabs = document.querySelectorAll('.subnav-tab');
  const ind = document.getElementById('subnavIndicator');
  function moveInd(tab){
    if(!ind || !tab) return;
    ind.style.width = tab.offsetWidth+'px';
    ind.style.left = tab.offsetLeft+'px';
  }
  tabs.forEach(t=> t.addEventListener('click', ()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    t.classList.add('active'); moveInd(t); render(t.dataset.target);
  }));
  window.addEventListener('load', ()=> moveInd(document.querySelector('.subnav-tab.active')));
  setTimeout(()=> moveInd(document.querySelector('.subnav-tab.active')), 100);
  const storiesBar = document.querySelector('.stories-bar');
  if(storiesBar){
    const stories = getPosts().filter(p=>normalizarTipo(p.tipo||p.type)==='STORY');
    for(const s of stories){
      const midia = await resolveMidia(s);
      const div = document.createElement('div');
      div.className='story-item';
      div.innerHTML = `<div class="story-avatar" style="padding:0;overflow:hidden;border:2px solid #000;"><img src="${midia}" style="width:100%;height:100%;object-fit:cover;"></div><span class="story-username">${s.author||'você'}</span>`;
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
      const liked = isOn(`koneat_like_${item.id}`);
      return `<article class="post-card" data-post-id="${item.id}">
        <div class="post-header"><div class="post-author-info"><div class="author-avatar">${(item.author||'K').charAt(0).toUpperCase()}</div><span class="author-name">${item.author||'koneat_user'}</span></div><button type="button" class="btn-follow-home">Seguir</button></div>
        <div class="post-media-wrapper">${isVideo ? `<video src="${midia}" autoplay loop muted playsinline></video>` : `<img src="${midia}" alt="Publicação">`}</div>
        <div class="post-actions-bar"><div class="post-actions-left">
          <button type="button" class="post-action-btn btn-like-home" data-id="${item.id}" style="${liked?'color:#e74c3c':''}">❤️</button>
          <button type="button" class="post-action-btn">💬</button>
          <button type="button" class="post-action-btn">↗️</button>
        </div><button type="button" class="post-action-btn btn-save-home" data-id="${item.id}">🔖</button></div>
      </article>`;
    }).join('');
    feed.querySelectorAll('.btn-like-home').forEach(b=> b.addEventListener('click', ()=>{ const on = toggleState(`koneat_like_${b.dataset.id}`); b.style.color = on ? '#e74c3c' : '#000'; }));
    feed.querySelectorAll('.btn-save-home').forEach(b=> b.addEventListener('click', ()=>{ toggleState(`koneat_save_${b.dataset.id}`); alert('Salvo!'); }));
    feed.querySelectorAll('.btn-follow-home').forEach(b=> b.addEventListener('click', ()=>{ b.textContent = b.textContent==='Seguir' ? 'Seguindo' : 'Seguir'; }));
  }
  render('for-you');
}

// ===== LIGA TUDO =====
document.addEventListener('DOMContentLoaded', ()=>{
  initOlho();
  initLogin();
  initCadastro();
  initRecuperar();
  initMensagens();
  initChat();
  initPasso1();
  initPasso2();
  initPasso3();
  initPasso4();
});
