const questions=[
 {id:'gender',icon:'💗',title:'Baby gender',desc:'Girl or boy'},
 {id:'arrival',icon:'📅',title:'Baby arrival date',desc:'Predict the big day'},
 {id:'lookalike',icon:'👨‍👩‍👧',title:'Baby lookalike',desc:'Mom, Dad or both'},
 {id:'boy-name',icon:'👦',title:'Boy name suggestions',desc:'Let guests suggest names'},
 {id:'girl-name',icon:'👧',title:'Girl name suggestions',desc:'Let guests suggest names'},
 {id:'wishes',icon:'💌',title:'Tips & wishes',desc:'Messages for the parents'},
];
let games=JSON.parse(localStorage.getItem('gnb_games')||'[]');
const qs=document.querySelector('#question-list');
questions.forEach((q,i)=>{qs.insertAdjacentHTML('beforeend',`<label class="question"><input type="checkbox" data-q="${q.id}" ${i<5?'checked':''}><span class="question-icon">${q.icon}</span><span class="question-copy"><strong>${q.title}</strong><small>${q.desc}</small></span></label>`)});
function renderGames(){const cards=document.querySelector('#game-cards'); if(!games.length){cards.innerHTML=`<div class="game-card"><div class="mini-art">👶</div><h3>No games yet</h3><p>Create your first personalized prediction game.</p><button class="secondary" data-view-target="create">Create game</button></div>`;return;} cards.innerHTML=games.map(g=>`<div class="game-card"><div class="mini-art">👶</div><h3>${escapeHtml(g.parentName)}'s Baby</h3><p>${g.questions.length} prediction categories · ${g.status}</p><span class="status">● ${g.status}</span></div>`).join('');}
function renderTable(){const el=document.querySelector('#games-table');if(!games.length){el.innerHTML='<div class="empty-state"><div>🌸</div><h3>No games created yet</h3><p>Your games will appear here.</p></div>';return;}el.innerHTML='<div class="table-row table-head"><span>Game</span><span>Questions</span><span>Status</span><span>Share</span></div>'+games.map(g=>`<div class="table-row"><strong>${escapeHtml(g.parentName)}'s Baby</strong><span>${g.questions.length}</span><span>Draft</span><span>Coming soon</span></div>`).join('');}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function showView(id){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));document.querySelectorAll('.nav-item').forEach(v=>v.classList.remove('active'));document.querySelector('#'+id).classList.add('active-view');const nav=document.querySelector(`.nav-item[data-view="${id}"]`);if(nav)nav.classList.add('active');const titles={dashboard:'Your dashboard',create:'Create your game',games:'My games',results:'Prediction results'};document.querySelector('#page-title').textContent=titles[id]||'GoodNews Baby';window.scrollTo({top:0,behavior:'smooth'});}
document.addEventListener('click',e=>{const btn=e.target.closest('[data-view],[data-view-target]');if(btn)showView(btn.dataset.view||btn.dataset.viewTarget);});
document.querySelector('#parent-name').addEventListener('input',e=>{document.querySelector('#preview-title').textContent=(e.target.value||'Your')+"'s Baby";});
document.querySelector('#create-game-btn').addEventListener('click',()=>{const selected=[...document.querySelectorAll('#question-list input:checked')].map(x=>x.dataset.q);if(!selected.length){alert('Please select at least one prediction.');return;}const game={id:crypto.randomUUID?crypto.randomUUID():Date.now().toString(),parentName:document.querySelector('#parent-name').value.trim()||'My Family',babyName:document.querySelector('#baby-name').value.trim(),dueDate:document.querySelector('#due-date').value,questions:selected,status:'Draft',createdAt:new Date().toISOString()};games.unshift(game);localStorage.setItem('gnb_games',JSON.stringify(games));renderGames();renderTable();showView('games');});
renderGames();renderTable();
