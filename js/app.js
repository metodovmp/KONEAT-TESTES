// ===== KONEAT - app.js PARTE 1/3 =====
// Cola a PARTE 2 embaixo dessa, depois a PARTE 3

function getPosts(){
  let posts = JSON.parse(localStorage.getItem('koneat_posts')||'[]');
  // MIGRAÇÃO automática dos bancos antigos - não apaga seus posts antigos
  let old1 = JSON.parse(localStorage.getItem('koneat_user_posts')||'[]');
  let old2 = JSON.parse(localStorage.getItem('koneat_virais_feed')||'[]');
  let todos = [...old1, ...old2];
  let mudou = false;
  todos.forEach(p=>{
    if(!p || !p.url) return;
    if(posts.some(x=>String(x.id)===String(p.id))) return;
    let tipo = 'FEED';
    if(p.tipo) tipo = p.tipo;
    else if(p.type==='video') tipo = 'FEED';
    posts.unshift({
      id: p.id || ('post_'+Date.now()+Math.random()),
      url: p.url,
      mediaType: p.mediaType || (p.type==='video'?'video':'image'),
      tipo: tipo, // POST | STORY | VIRAL | FEED
      author: p.author || localStorage.getItem('koneat_username') || 'koneat_user',
      caption: p.caption || '',
      createdAt: p.createdAt || Date.now()
    });
    mudou = true;
  });
  if(mudou) localStorage.setItem('koneat_posts', JSON.stringify(posts));
  return posts;
}
function savePosts(p){ localStorage.setItem('koneat_posts', JSON.stringify(p)); }
function getUser(){ return localStorage.getItem('koneat_username')||'koneat_user'; }

// ===== OLHO DA SENHA - index + cadastro =====
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

// ===== LOGIN - index.html =====
function initLogin(){
  const form = document.getElementById('loginForm');
  if(!form) return;
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const email = document.getElementById('emailField').value.trim();
    const pw = document.getElementById('passwordField').value;
    if(!email||!pw){ alert('Preencha o e-mail e a senha.'); return; }
    localStorage.setItem('koneat_email', email);
    // Sem Supabase ainda - só local, Base44 troca depois
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
// Mensagens + Chat + Passo1 (Perfil)

// ===== MENSAGENS - mensagens.html =====
function initMensagens(){
  const header = document.getElementById('headerCurrentUsername');
  if(header){
    const u = getUser();
    header.textContent = '@' + u;
  }
  // Barrinha preta
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
  // Filtro de pesquisa
  const search = document.querySelector('.search-input-msg');
  if(search){
    search.addEventListener('input', ()=>{
      const q = search.value.toLowerCase();
      document.querySelectorAll('.chat-item').forEach(item=>{
        const txt = item.textContent.toLowerCase();
        item.style.display = txt.includes(q) ? 'flex' : 'none';
      });
    });
  }
  // Função global que o HTML chama no onclick - deixa igual
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

// ===== CHAT - chat.html =====
function initChat(){
  const box = document.getElementById('chatMessages');
  if(!box) return;
  const input = document.querySelector('.message-input');
  const sendBtn = document.querySelector('button[aria-label="Encaminhar"]');
  const KEY = 'koneat_chat_koneat';
  const msgs = JSON.parse(localStorage.getItem(KEY) || '[]');

  function render(){
    // Limpa o "Suas mensagens aparecerão aqui" se já tem mensagem
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
  // Botões sem função ainda - não quebra, só avisa
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

  // Menu 3 pontinhos
  const menuBtn = document.getElementById('menuBtn');
  const menu = document.getElementById('dropdownMenu');
  if(menuBtn && menu){
    menuBtn.addEventListener('click', e=>{
      e.stopPropagation();
      menu.style.display = menu.style.display==='block' ? 'none' : 'block';
    });
    document.addEventListener('click', ()=>{ menu.style.display='none'; });
  }

  function render(){
    const posts = getPosts().filter(p=>p.author===u || p.author==='koneat_user');
    const empty = document.getElementById('emptyState');
    const count = document.getElementById('postsCount');
    if(count) count.textContent = posts.length;
    if(posts.length===0){
      if(empty) empty.style.display = 'flex';
      grid.style.display = 'none';
      grid.innerHTML = '';
      return;
    }
    if(empty) empty.style.display = 'none';
    grid.style.display = 'grid';
    grid.innerHTML = posts.map(post=>{
      const isVideo = post.mediaType==='video';
      return `<div class="post-grid-item" data-id="${post.id}">
        <button type="button" class="btn-delete-post" data-del="${post.id}" title="Excluir">🗑️</button>
        ${isVideo ? `<video src="${post.url}"></video><div class="badge-video">▶</div>` : `<img src="${post.url}" alt="Post">`}
      </div>`;
    }).join('');
    grid.querySelectorAll('[data-del]').forEach(b=>{
      b.addEventListener('click', ()=>{
        if(!confirm('Deseja realmente excluir esta publicação?')) return;
        let all = getPosts().filter(p=>String(p.id)!==String(b.dataset.del));
        savePosts(all);
        render();
      });
    });
  }
  window.deletePost = function(id){
    if(!confirm('Deseja realmente excluir esta publicação?')) return;
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





