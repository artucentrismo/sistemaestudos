import {
  listDecks, createDeck, renameDeck, deleteDeck, listNotes, addNote,
  updateNote, deleteNote, reviewQueue, previewCard, gradeCard,
  setCardSuspended, getStats
} from './anki-service.js';

let selectedDeck = '';
let notesCache = [];
let reviewCards = [];
let reviewIndex = 0;
let revealed = false;
let busy = false;
let searchText = '';\nlet decksCache = [];
let noteMode = 'basic';
const root = () => document.getElementById('anki-v2');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
};
const cloze = (s, target, show) => esc(s).replace(/\{\{c(\d+)::(.*?)(?:::(.*?))?\}\}/gs, (_m, id, answer, hint) =>
  Number(id) === Number(target)
    ? (show ? '<b class="anki-cloze-answer">'+answer+'</b>' : '<b class="anki-cloze-gap">['+(hint || '…')+']</b>')
    : '<b class="anki-cloze-answer">'+answer+'</b>');
function setMessage(text, error=false) {
  const el = document.getElementById('anki-message');
  if (el) { el.textContent = text; el.className = error ? 'anki-error' : 'anki-message'; }
}
async function loadData() {
  const decks = await listDecks();\n  decksCache = decks;
  if (!selectedDeck && decks.length) selectedDeck = decks[0].id;
  const stats = await getStats(selectedDeck || null);
  notesCache = await listNotes(selectedDeck || null);
  return { decks, stats };
}
function shell(decks, stats) {
  const options = decks.map(d => '<option value="'+esc(d.id)+'" '+(d.id===selectedDeck?'selected':'')+'>'+esc(d.name)+'</option>').join('');
  const visible = notesCache.filter(n => {
    const text = (n.fields?.Front||'')+' '+(n.fields?.Back||'')+' '+(n.tags||[]).join(' ');
    return text.toLowerCase().includes(searchText.toLowerCase());
  });
  const due = stats.due;
  return `
    <div class="anki-topline"><span>REPETIÇÃO ESPAÇADA · FSRS-7</span><span>Conta privada</span></div>
    <div class="anki-stats">
      <div><small>Cartões</small><b>${stats.total}</b></div>
      <div><small>Para revisar</small><b>${due}</b></div>
      <div><small>Revisões (30d)</small><b>${stats.reviews30d}</b></div>
      <div><small>Acerto (30d)</small><b>${stats.accuracy30d===null?'—':stats.accuracy30d+'%'}</b></div>
    </div>
    <div class="anki-actions">
      <button class="anki-primary" id="anki-review" ${due?'':'disabled'}>Revisar agora · ${due}</button>
      <button id="anki-new">+ Adicionar</button>
      <button id="anki-deck-new">+ Baralho</button><button id="anki-deck-manage">Gerenciar</button>
    </div>
    <div class="anki-toolbar">
      <select id="anki-deck"><option value="">Todos os baralhos</option>${options}</select>
      <input id="anki-search" placeholder="Buscar cartões e tags" value="${esc(searchText)}">
    </div>
    <div class="anki-section-head"><b>Cartões</b><span>${visible.length} notas</span></div>
    <div class="anki-list">${visible.map(n => {
      const card = n.cards?.[0];
      const dueLabel = card ? (new Date(card.due_at) <= new Date() ? 'Para revisar' : 'Agendado '+dateLabel(card.due_at)) : 'Sem cartão';
      return `<article class="anki-note">
        <div class="anki-note-copy"><b>${esc(n.fields?.Front||'Sem frente')}</b><small>${esc((n.tags||[]).join(' · ')||'Sem tags')} · ${dueLabel}</small></div>
        <button data-action="edit" data-id="${esc(n.id)}" title="Editar">✎</button>
        <button data-action="suspend" data-card="${esc(card?.id||'')}" data-suspended="${card?.suspended?'1':'0'}" title="Suspender">${card?.suspended?'▶':'Ⅱ'}</button>
        <button data-action="delete" data-id="${esc(n.id)}" title="Excluir">×</button>
      </article>`;
    }).join('') || '<p class="anki-muted">Nenhuma nota neste baralho. Adicione seu primeiro cartão.</p>'}</div>
    <div class="anki-footer-actions">
      <button id="anki-export">Exportar TSV</button><button id="anki-import">Importar TSV</button>
      <button id="anki-local-import">Migrar cards antigos deste aparelho</button>
    </div>
    <p id="anki-message" aria-live="polite"></p>
    <div id="anki-form-wrap"></div>
  `;
}
function formHtml(note=null) {
  const front = note?.fields?.Front || '';
  const back = note?.fields?.Back || '';
  const tags = (note?.tags||[]).join(' ');
  return `
    <div class="anki-form">
      <div class="anki-section-head"><b>${note?'Editar nota':'Nova nota'}</b><button id="anki-form-close">Fechar</button></div>
      <label>Tipo de cartão<select id="anki-type" ${note?'disabled':''}><option value="basic">Básico</option><option value="basic-reversed" ${note?.cards?.some(c=>c.card_type==='reverse')?'selected':''}>Básico (e reverso)</option><option value="cloze" ${note?.cards?.[0]?.card_type==='cloze'?'selected':''}>Omissão (Cloze)</option></select></label>
      <label>Frente / Texto<textarea id="anki-front" rows="4" placeholder="Pergunta ou texto com {{c1::lacuna}}">${esc(front)}</textarea></label>
      <label>Verso<textarea id="anki-back" rows="4" placeholder="Resposta ou explicação">${esc(back)}</textarea></label>
      <label>Tags (separadas por espaço)<input id="anki-tags" value="${esc(tags)}" placeholder="biologia enem citologia"></label>
      <button class="anki-primary" id="anki-save-note">${note?'Salvar alterações':'Adicionar cartão'}</button>
    </div>`;
}
async function render() {
  const el = root();
  if (!el || busy) return;
  busy = true;
  el.innerHTML = '<p class="anki-muted">Carregando seu Anki…</p>';
  try {
    const { decks, stats } = await loadData();
    if (!decks.length) {
      el.innerHTML = '<div class="anki-empty"><h2>Seu primeiro baralho</h2><p>Crie um baralho para organizar seus estudos por matéria, prova ou assunto.</p><button class="anki-primary" id="anki-first-deck">Criar meu primeiro baralho</button></div>';
      document.getElementById('anki-first-deck').onclick = newDeck;
    } else {
      el.innerHTML = shell(decks, stats);
      bind(decks);
    }
  } catch (error) {
    el.innerHTML = '<div class="anki-empty"><h2>Não foi possível carregar o Anki</h2><p>'+esc(error.message)+'</p><p>Confira se você está conectado à sua conta.</p><button id="anki-retry">Tentar novamente</button></div>';
    document.getElementById('anki-retry').onclick = render;
  } finally { busy = false; }
}
function bind(decks) {
  document.getElementById('anki-deck').onchange = async e => { selectedDeck=e.target.value; await render(); };
  document.getElementById('anki-search').oninput = e => { searchText=e.target.value; const pos=e.target.selectionStart; render().then(()=>{const x=document.getElementById('anki-search');x?.focus();x?.setSelectionRange(pos,pos);}); };
  document.getElementById('anki-new').onclick = () => showForm();
  document.getElementById('anki-deck-new').onclick = newDeck;
  document.getElementById('anki-deck-manage').onclick = manageDeck;
  document.getElementById('anki-review').onclick = startReview;
  document.getElementById('anki-export').onclick = exportTsv;
  document.getElementById('anki-import').onclick = importTsv;
  document.getElementById('anki-local-import').onclick = importLegacy;
  root().querySelectorAll('[data-action]').forEach(btn => btn.onclick = () => action(btn));
}
async function newDeck() {
  const name = prompt('Nome do baralho (ex.: Biologia::Citologia):');
  if (!name) return;
  try { const deck=await createDeck(name); selectedDeck=deck.id; await render(); }
  catch (e) { setMessage(e.message,true); }
}
async function manageDeck() {
  const deck = decksCache.find(d => d.id === selectedDeck);
  if (!deck) return setMessage('Selecione um baralho para gerenciar.', true);
  const action = prompt('Digite R para renomear ou E para excluir este baralho:', 'R');
  if (!action) return;
  try {
    if (action.toLowerCase() === 'r') {
      const name = prompt('Novo nome do baralho:', deck.name);
      if (!name?.trim()) return;
      await renameDeck(deck.id, name);
    } else if (action.toLowerCase() === 'e') {
      if (!confirm('Excluir o baralho "'+deck.name+'" e todos os cartões dele? Esta ação não pode ser desfeita.')) return;
      await deleteDeck(deck.id);
      selectedDeck = '';
    }
    await render();
  } catch (e) { setMessage(e.message, true); }
}
function showForm(note=null) {
  const wrap=document.getElementById('anki-form-wrap');
  if (!wrap) return;
  wrap.innerHTML=formHtml(note);
  document.getElementById('anki-form-close').onclick=()=>wrap.innerHTML='';
  document.getElementById('anki-save-note').onclick=async()=>{
    const front=document.getElementById('anki-front').value;
    const back=document.getElementById('anki-back').value;
    const tags=document.getElementById('anki-tags').value.split(/\s+/).filter(Boolean);
    const type=document.getElementById('anki-type').value;
    try {
      if (note) await updateNote(note.id,{front,back,tags});
      else await addNote({deckId:selectedDeck,front,back,tags,cardType:type});
      await render();
    } catch(e) { setMessage(e.message,true); }
  };
}
async function action(btn) {
  const kind=btn.dataset.action;
  try {
    if(kind==='edit') {
      const note=notesCache.find(n=>n.id===btn.dataset.id);
      if(note) showForm(note);
    } else if(kind==='delete') {
      if(confirm('Excluir esta nota e seus cartões?')) { await deleteNote(btn.dataset.id); await render(); }
    } else if(kind==='suspend' && btn.dataset.card) {
      await setCardSuspended(btn.dataset.card,btn.dataset.suspended!=='1');
      await render();
    }
  } catch(e) { setMessage(e.message,true); }
}
async function startReview() {
  try {
    reviewCards=await reviewQueue(selectedDeck||null);
    reviewIndex=0; revealed=false;
    if(!reviewCards.length) return setMessage('Nenhum cartão vencido para revisar.');
    renderReview();
  } catch(e) { setMessage(e.message,true); }
}
function renderReview() {
  const el=root(), card=reviewCards[reviewIndex];
  if(!card) { el.innerHTML='<div class="anki-empty"><h2>Revisão concluída!</h2><p>Você revisou todos os cartões desta sessão.</p><button class="anki-primary" id="anki-review-done">Voltar aos baralhos</button></div>'; document.getElementById('anki-review-done').onclick=render; return; }
  const front=card.note.fields?.Front||'', back=card.note.fields?.Back||'';
  const question = card.card_type === 'reverse' ? back : front;
  const answer = card.card_type === 'reverse' ? front : back;
  el.innerHTML=\`
    <div class="anki-review-head"><button id="anki-review-exit">‹ Sair da revisão</button><span>\${reviewIndex+1} / \${reviewCards.length}</span></div>
    <div class="anki-review-card"><small>\${esc(card.note.tags?.join(' · ')||'Revisão')}</small><div class="anki-question">\${card.card_type==='cloze'?cloze(front,card.template_ordinal,revealed):esc(question).replace(/\\n/g,'<br>')}</div>
    \${revealed?'<hr><div class="anki-answer">'+(card.card_type==='cloze'?cloze(front,card.template_ordinal,true):esc(answer).replace(/\\n/g,'<br>'))+'</div>':''}</div>
    \${revealed?'<div class="anki-grade-grid" id="anki-grades"><p>Como foi lembrar?</p></div>':'<button class="anki-primary" id="anki-reveal">Mostrar resposta</button>'}
    <p id="anki-message" aria-live="polite"></p>\`;
  document.getElementById('anki-review-exit').onclick=render;
  if(!revealed) document.getElementById('anki-reveal').onclick=async()=>{revealed=true;renderReview();await showGradeIntervals(card);};
}
async function showGradeIntervals(card) {
  try {
    const previews=await previewCard(card);
    const labels={again:'Errei',hard:'Difícil',good:'Bom',easy:'Fácil'};
    const box=document.getElementById('anki-grades');
    if(!box)return;
    box.innerHTML='<p>Como foi lembrar?</p>'+previews.map(p=>'<button data-grade="'+p.label+'"><b>'+labels[p.label]+'</b><small>'+dateLabel(p.card.dueAt)+'</small></button>').join('');
    box.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>applyGrade(card,b.dataset.grade));
  } catch(e) { setMessage(e.message,true); }
}
async function applyGrade(card,grade) {
  try {
    await gradeCard(card,grade);
    reviewIndex++;revealed=false;
    renderReview();
  } catch(e) { setMessage(e.message,true); }
}
function exportTsv() {
  const rows=notesCache.map(n=>[n.fields?.Front||'',n.fields?.Back||'',(n.tags||[]).join(' ')]);
  const text=rows.map(r=>r.map(v=>String(v).replace(/\t/g,' ').replace(/\r?\n/g,'<br>')).join('\t')).join('\n');
  const blob=new Blob([text],{type:'text/tab-separated-values;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ciclo-anki.tsv';a.click();URL.revokeObjectURL(a.href);
}
function importTsv() {
  const input=document.createElement('input');input.type='file';input.accept='.tsv,.txt,.csv';
  input.onchange=async()=>{
    const file=input.files?.[0];if(!file)return;
    const text=await file.text();let count=0;
    for(const line of text.split(/\r?\n/)) {
      if(!line.trim()||line.startsWith('#'))continue;
      const parts=line.split(line.includes('\t')?'\t':';');
      if(!parts[0]?.trim()||!parts[1]?.trim())continue;
      await addNote({deckId:selectedDeck,front:parts[0].replace(/<br\s*\/?>/g,'\n'),back:parts[1].replace(/<br\s*\/?>/g,'\n'),tags:(parts[2]||'').split(/\s+/).filter(Boolean)});
      count++;
    }
    await render();setMessage(count+' notas importadas.');
  };
  input.click();
}
async function importLegacy() {
  const legacy=window.S?.cards||[];
  if(!legacy.length)return setMessage('Não há cards antigos neste aparelho.');
  if(!confirm('Importar '+legacy.length+' cards locais para o baralho selecionado? Os originais serão preservados.'))return;
  try {
    for(const card of legacy) {
      await addNote({deckId:selectedDeck,front:card.f||'',back:card.v||'',tags:[card.m||'geral']});
    }
    await render();setMessage(legacy.length+' cards antigos migrados. Os originais locais foram mantidos.');
  } catch(e) { setMessage(e.message,true); }
}
function install() {
  const original=window.render;
  if(typeof original!=='function')return;
  window.render=function(...args) {
    const out=original.apply(this,args);
    if(window.tab==='cards') queueMicrotask(render);
    return out;
  };
  if(window.tab==='cards')render();
}
install();
