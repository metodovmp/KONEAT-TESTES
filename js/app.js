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

