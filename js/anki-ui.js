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
let searchText = '';
let searchOpen = false;
let decksCache = [];
let deckPanelMode = '';
const root = () => document.getElementById('anki-v2');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel = (iso) => new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
const cloze = (s, target, show) => esc(s).replace(/\{\{c(\d+)::(.*?)(?:::(.*?))?\}\}/gs, (_m, id, answer, hint) =>
  Number(id) === Number(target) ? (show ? '<b class="anki-cloze-answer">'+answer+'</b>' : '<b class="anki-cloze-gap">['+(hint || '…')+']</b>') : '<b class="anki-cloze-answer">'+answer+'</b>');
function setMessage(text, error=false) {
  const el = document.getElementById('anki-message');
  if (el) { el.textContent = text; el.className = error ? 'anki-error' : 'anki-message'; }
}
function deckDepth(deck, decks) {
  let depth=0, parent=decks.find(d=>d.id===deck.parent_id), guard=0;
  while(parent && guard++<decks.length) { depth++; parent=decks.find(d=>d.id===parent.parent_id); }
  return depth;
}
function deckPath(deck, decks) {
  const parts=[deck.name]; let parent=decks.find(d=>d.id===deck.parent_id), guard=0;
  while(parent && guard++<decks.length) { parts.unshift(parent.name); parent=decks.find(d=>d.id===parent.parent_id); }
  return parts.join('::');
}
function deckOptions(decks, includeAll=true, excludeId='') {
  return (includeAll?'<option value="">Todos os baralhos</option>':'')+decks.filter(d=>d.id!==excludeId).map(d=>{
    const prefix='　'.repeat(deckDepth(d,decks));
    return '<option value="'+esc(d.id)+'" '+(d.id===selectedDeck?'selected':'')+'>'+prefix+esc(d.name)+'</option>';
  }).join('');
}
async function loadData() {
  const decks=await listDecks(); decksCache=decks;
  if(selectedDeck && !decks.some(d=>d.id===selectedDeck)) selectedDeck='';
  const stats=await getStats(selectedDeck||null);
  notesCache=await listNotes(selectedDeck||null);
  return {decks,stats};
}
function deckTreeHtml(decks) {
  if(!decks.length)return '';
  return '<div class="anki-deck-tree"><div class="anki-tree-heading">SUA BIBLIOTECA <span>'+decks.length+' baralhos</span></div>'+
    '<button class="anki-tree-item '+(!selectedDeck?'active':'')+'" data-deck-select=""> <span class="anki-tree-icon">▦</span><span class="anki-tree-name">Todos os baralhos</span><span class="anki-tree-arrow">›</span></button>'+
    decks.map(d=>'<button class="anki-tree-item '+(selectedDeck===d.id?'active':'')+'" data-deck-select="'+esc(d.id)+'" style="padding-left:'+(12+deckDepth(d,decks)*17)+'px"><span class="anki-tree-icon">'+(deckDepth(d,decks)?'↳':'▤')+'</span><span class="anki-tree-name">'+esc(d.name)+'</span><span class="anki-tree-arrow">›</span></button>').join('')+'</div>';
}
function noteItemsHtml() {
  const query=searchText.trim().toLocaleLowerCase('pt-BR');
  const visible=notesCache.filter(n=>{
    const deck=decksCache.find(d=>d.id===n.deck_id);
    const haystack=[n.fields?.Front||'',n.fields?.Back||'',(n.tags||[]).join(' '),deck?deckPath(deck,decksCache).replace(/::/g,' '):''].join(' ').toLocaleLowerCase('pt-BR');
    return !query||haystack.includes(query);
  });
  return '<div class="anki-list">'+(visible.map(n=>{
    const cards=n.cards||[], card=cards[0];
    const dueLabel=card?(cards.length>1?cards.length+' cartões · ':'')+(new Date(card.due_at)<=new Date()?'Para revisar':'Agendado '+dateLabel(card.due_at)):'Sem cartão';
    const deck=decksCache.find(d=>d.id===n.deck_id);
    return '<article class="anki-note"><div class="anki-note-copy"><b>'+esc(n.fields?.Front||'Sem frente')+'</b><small>'+esc(deck?deckPath(deck,decksCache).replace(/::/g,' / '):'Baralho')+' · '+esc((n.tags||[]).join(' · ')||'Sem tags')+' · '+dueLabel+'</small></div>'+
      '<button data-action="edit" data-id="'+esc(n.id)+'" title="Editar nota" aria-label="Editar nota">✎</button>'+
      (card?'<button data-action="suspend" data-card="'+esc(card.id)+'" data-suspended="'+(card.suspended?'1':'0')+'" title="Suspender cartão" aria-label="Suspender cartão">'+(card.suspended?'▶':'Ⅱ')+'</button>':'')+
      '<button data-action="delete" data-id="'+esc(n.id)+'" title="Excluir nota" aria-label="Excluir nota">×</button></article>';
  }).join('')||'<div class="anki-empty-inline"><b>Nenhuma nota por aqui</b><span>Crie uma nota ou ajuste sua pesquisa.</span></div>')+'</div>';
}
function noteListHtml() {
  const query=searchText.trim();
  return '<div class="anki-section-head"><b>Notas e cartões</b><div class="anki-section-tools"><span id="anki-note-count">'+(query?'Resultados da pesquisa':'Pesquisa fechada')+'</span><button id="anki-search-toggle" class="anki-search-toggle" aria-label="Pesquisar notas e cartões" title="Pesquisar notas e cartões">⌕</button></div></div>'+
    (searchOpen?'<div class="anki-search-row"><input id="anki-search" type="search" placeholder="Pesquisar pergunta, resposta, matéria ou tag..." value="'+esc(searchText)+'" aria-label="Pesquisar notas e cartões"><button id="anki-search-close" aria-label="Fechar pesquisa">×</button></div>':'')+
    (searchOpen&&query?'<div id="anki-note-results">'+noteItemsHtml()+'</div>':(searchOpen?'<p class="anki-search-hint">Digite para localizar uma nota ou cartão. A lista só aparece quando você pesquisar.</p>':''));
}
function deckPanelHtml() {
  if(!deckPanelMode)return '';
  if(deckPanelMode==='new') return '<section class="anki-form anki-deck-form"><div class="anki-form-title"><div><small>ORGANIZAÇÃO</small><h3>Novo baralho</h3></div><button class="anki-icon-button" id="anki-deck-close" aria-label="Fechar">×</button></div>'+
    '<label>Nome do baralho<input id="anki-deck-name" maxlength="70" placeholder="Ex.: Citologia" autocomplete="off"></label>'+
    '<label>Adicionar dentro de<select id="anki-deck-parent"><option value="">Criar como baralho principal</option>'+decksCache.map(d=>'<option value="'+esc(d.id)+'" '+(d.id===selectedDeck?'selected':'')+'>'+('　'.repeat(deckDepth(d,decksCache)))+esc(d.name)+'</option>').join('')+'</select></label>'+
    '<p class="anki-muted">Você pode criar quantos níveis de subbaralhos quiser.</p><button class="anki-primary" id="anki-deck-save">Criar baralho</button></section>';
  const deck=decksCache.find(d=>d.id===selectedDeck);
  if(!deck)return '<section class="anki-form anki-deck-form"><p>Selecione um baralho na biblioteca para gerenciá-lo.</p><button class="anki-secondary" id="anki-deck-close">Fechar</button></section>';
  const children=decksCache.filter(d=>d.parent_id===deck.id).length;
  return '<section class="anki-form anki-deck-form"><div class="anki-form-title"><div><small>GERENCIAR</small><h3>Configurações do baralho</h3></div><button class="anki-icon-button" id="anki-deck-close" aria-label="Fechar">×</button></div>'+
    '<label>Nome<input id="anki-deck-rename" maxlength="70" value="'+esc(deck.name)+'"></label><button class="anki-primary" id="anki-deck-rename-save">Salvar nome</button>'+
    '<div class="anki-danger-zone"><b>Excluir este baralho</b><p>Serão excluídos também '+children+' subbaralhos, suas notas, cartões e histórico de revisão. Esta ação não pode ser desfeita.</p><button class="anki-danger-button" id="anki-deck-delete">Excluir baralho e conteúdo</button></div></section>';
}
function shell(decks, stats) {
  return '<div class="anki-topline"><span>REPETIÇÃO ESPAÇADA · FSRS-7</span><span><i class="anki-local-dot"></i> Neste aparelho</span></div>'+
    '<div class="anki-welcome"><div><span class="anki-eyebrow">SEU ESPAÇO DE MEMÓRIA</span><h2>Anki</h2><p>Aprenda um pouco hoje. Lembre por muito mais tempo.</p></div><div class="anki-welcome-icon">✳</div></div>'+
    '<div class="anki-stats"><div><small>Cartões</small><b>'+stats.total+'</b></div><div><small>Para revisar</small><b>'+stats.due+'</b></div><div><small>Revisões · 30 dias</small><b>'+stats.reviews30d+'</b></div><div><small>Acertos · 30 dias</small><b>'+(stats.accuracy30d===null?'—':stats.accuracy30d+'%')+'</b></div></div>'+
    '<div class="anki-actions"><button class="anki-primary" id="anki-review" '+(stats.due?'':'disabled')+'>Revisar agora <span>· '+stats.due+'</span></button><button id="anki-new">＋ Nova nota</button><button id="anki-deck-new">＋ Baralho</button></div>'+
    deckTreeHtml(decks)+deckPanelHtml()+
    '<div class="anki-toolbar"><button id="anki-deck-manage" '+(selectedDeck?'':'disabled')+'>⚙ Gerenciar selecionado</button></div>'+
    '<div id="anki-form-wrap"></div>'+
    '<div id="anki-note-list">'+noteListHtml()+'</div>'+
    '<div class="anki-footer-actions"><button id="anki-export">Exportar TSV</button><button id="anki-import">Importar TSV</button><button id="anki-local-import">Importar cartões antigos</button></div>'+
    '<p id="anki-message" aria-live="polite"></p>';
}
function formHtml(note=null) {
  const front=note?.fields?.Front||'', back=note?.fields?.Back||'', tags=(note?.tags||[]).join(' ');
  const type=note?(note.cards?.some(c=>c.card_type==='cloze')?'cloze':note.cards?.some(c=>c.card_type==='reverse')?'basic-reversed':'basic'):'basic';
  return '<section class="anki-form anki-note-editor"><div class="anki-form-title"><div><small>EDITOR DE NOTAS</small><h3>'+(note?'Editar nota':'Criar nota')+'</h3></div><button id="anki-form-close" class="anki-icon-button" aria-label="Fechar">×</button></div>'+
    '<label>Baralho<select id="anki-note-deck">'+decksCache.map(d=>'<option value="'+esc(d.id)+'" '+(d.id===(note?.deck_id||selectedDeck)?'selected':'')+'>'+('　'.repeat(deckDepth(d,decksCache)))+esc(d.name)+'</option>').join('')+'</select></label>'+
    '<label>Tipo de nota<select id="anki-type" '+(note?'disabled':'')+'><option value="basic" '+(type==='basic'?'selected':'')+'>Básico · pergunta e resposta</option><option value="basic-reversed" '+(type==='basic-reversed'?'selected':'')+'>Básico e cartão reverso</option><option value="cloze" '+(type==='cloze'?'selected':'')+'>Omissão · Cloze</option></select></label>'+
    '<div class="anki-field-card anki-front-field"><div class="anki-field-heading"><span class="anki-field-number">01</span><div><b>Frente</b><small>Pergunta, conceito ou texto de estudo</small></div></div><textarea id="anki-front" rows="6" spellcheck="true" placeholder="Escreva aqui o que você quer lembrar...">'+esc(front)+'</textarea><div class="anki-field-footer"><button type="button" id="anki-insert-cloze">＋ Inserir lacuna Cloze</button><span id="anki-front-count">0 caracteres</span></div></div>'+
    '<div class="anki-field-card anki-back-field"><div class="anki-field-heading"><span class="anki-field-number">02</span><div><b>Verso</b><small>Resposta, explicação ou exemplo</small></div></div><textarea id="anki-back" rows="5" spellcheck="true" placeholder="Escreva a resposta ou uma explicação clara...">'+esc(back)+'</textarea><div class="anki-field-footer"><span>Prefira respostas curtas e específicas.</span><span id="anki-back-count">0 caracteres</span></div></div>'+
    '<label>Tags<input id="anki-tags" value="'+esc(tags)+'" placeholder="biologia enem citologia"></label>'+
    '<button class="anki-primary" id="anki-save-note">'+(note?'Salvar alterações':'Adicionar à biblioteca')+'</button><p class="anki-muted">Dica: use uma ideia principal por nota para facilitar a memorização.</p></section>';
}
async function render() {
  const el=root(); if(!el||busy)return;
  busy=true; el.innerHTML='<div class="anki-loading"><span></span>Organizando sua biblioteca…</div>';
  try {
    const {decks,stats}=await loadData();
    if(!decks.length) {
      el.innerHTML='<div class="anki-empty"><div class="anki-empty-symbol">✳</div><h2>Vamos criar sua biblioteca?</h2><p>Comece com um baralho para cada matéria e organize os assuntos em subbaralhos.</p><section class="anki-form"><label>Nome do primeiro baralho<input id="anki-first-deck-name" placeholder="Ex.: Biologia" maxlength="70"></label><button class="anki-primary" id="anki-first-deck">Criar meu primeiro baralho</button></section></div>';
      document.getElementById('anki-first-deck').onclick=async()=>{const name=document.getElementById('anki-first-deck-name').value.trim();if(!name)return;try{const deck=await createDeck(name);selectedDeck=deck.id;await render();}catch(e){const p=el.querySelector('p');if(p)p.textContent=e.message;}};
    } else { el.innerHTML=shell(decks,stats); bind(decks); }
  } catch(error) {
    el.innerHTML='<div class="anki-empty"><h2>Não foi possível carregar o Anki</h2><p>'+esc(error.message)+'</p><button id="anki-retry" class="anki-secondary">Tentar novamente</button></div>';
    document.getElementById('anki-retry').onclick=render;
  } finally { busy=false; }
}
function bind(decks) {
  document.getElementById('anki-deck-new').onclick=()=>showDeckForm('new');
  document.getElementById('anki-deck-manage').onclick=()=>showDeckForm('manage');
  document.getElementById('anki-new').onclick=()=>showForm();
  document.getElementById('anki-review').onclick=startReview;
  document.getElementById('anki-export').onclick=exportTsv;
  document.getElementById('anki-import').onclick=importTsv;
  document.getElementById('anki-local-import').onclick=importLegacy;
  bindSearch();
  root().querySelectorAll('[data-deck-select]').forEach(btn=>btn.onclick=async()=>{selectedDeck=btn.dataset.deckSelect;deckPanelMode='';await render();});
  bindNoteActions();
  bindDeckPanel();
}
function bindNoteActions() { root().querySelectorAll('[data-action]').forEach(btn=>btn.onclick=()=>action(btn)); }
function bindSearch() {
  const toggle=document.getElementById('anki-search-toggle');
  if(toggle)toggle.onclick=()=>{searchOpen=!searchOpen;const list=document.getElementById('anki-note-list');if(list){list.innerHTML=noteListHtml();bindSearch();bindNoteActions();}if(searchOpen)document.getElementById('anki-search')?.focus();};
  const close=document.getElementById('anki-search-close');
  if(close)close.onclick=()=>{searchOpen=false;searchText='';const list=document.getElementById('anki-note-list');if(list){list.innerHTML=noteListHtml();bindSearch();bindNoteActions();}};
  const input=document.getElementById('anki-search');
  if(input)input.oninput=()=>{searchText=input.value;const list=document.getElementById('anki-note-list');if(list){list.innerHTML=noteListHtml();bindSearch();bindNoteActions();const next=document.getElementById('anki-search');if(next){next.focus();next.setSelectionRange(searchText.length,searchText.length);}}};
}
async function showDeckForm(mode) { deckPanelMode=mode; await render(); document.getElementById(mode==='new'?'anki-deck-name':'anki-deck-rename')?.focus(); }
function bindDeckPanel() {
  const close=document.getElementById('anki-deck-close'); if(close)close.onclick=()=>{deckPanelMode='';render();};
  const save=document.getElementById('anki-deck-save');
  if(save)save.onclick=async()=>{
    const name=document.getElementById('anki-deck-name').value.trim(), parent=document.getElementById('anki-deck-parent').value||null;
    if(!name)return setMessage('Digite um nome para o baralho.',true);
    save.disabled=true;
    try { const deck=await createDeck(name,'',parent);selectedDeck=deck.id;deckPanelMode='';await render();setMessage('Baralho criado.'); }
    catch(e){setMessage(e.message,true);save.disabled=false;}
  };
  const rename=document.getElementById('anki-deck-rename-save');
  if(rename)rename.onclick=async()=>{
    const name=document.getElementById('anki-deck-rename').value.trim();
    try{await renameDeck(selectedDeck,name);deckPanelMode='';await render();setMessage('Nome atualizado.');}
    catch(e){setMessage(e.message,true);}
  };
  const del=document.getElementById('anki-deck-delete');
  if(del)del.onclick=async()=>{
    const deck=decksCache.find(d=>d.id===selectedDeck);if(!deck)return;
    if(!confirm('Excluir "'+deckPath(deck,decksCache).replace(/::/g,' / ')+'" e todos os seus subbaralhos, notas e revisões?'))return;
    try{await deleteDeck(selectedDeck);selectedDeck='';deckPanelMode='';await render();setMessage('Baralho e conteúdo excluídos.');}
    catch(e){setMessage(e.message,true);}
  };
}
function showForm(note=null) {
  const wrap=document.getElementById('anki-form-wrap'); if(!wrap)return;
  wrap.innerHTML=formHtml(note);
  const close=document.getElementById('anki-form-close');close.onclick=()=>wrap.innerHTML='';
  const front=document.getElementById('anki-front'),back=document.getElementById('anki-back');
  const count=(field,id)=>{const el=document.getElementById(id);if(el)el.textContent=field.value.length+' caracteres';};
  front.oninput=()=>count(front,'anki-front-count');back.oninput=()=>count(back,'anki-back-count');
  count(front,'anki-front-count');count(back,'anki-back-count');
  document.getElementById('anki-insert-cloze').onclick=()=>{
    const start=front.selectionStart,end=front.selectionEnd,selected=front.value.slice(start,end)||'resposta';
    front.setRangeText('{{c1::'+selected+'}}',start,end,'end');front.focus();count(front,'anki-front-count');
  };
  document.getElementById('anki-save-note').onclick=async()=>{
    const save=document.getElementById('anki-save-note');
    const values={front:front.value,back:back.value,tags:document.getElementById('anki-tags').value.split(/\s+/).filter(Boolean),deckId:document.getElementById('anki-note-deck').value};
    const type=document.getElementById('anki-type').value;
    save.disabled=true;save.textContent='Salvando…';
    try {
      if(note)await updateNote(note.id,values);
      else await addNote({deckId:values.deckId,front:values.front,back:values.back,tags:values.tags,cardType:type});
      await render();setMessage('Nota salva com sucesso.');
    } catch(e){setMessage(e.message,true);save.disabled=false;save.textContent=note?'Salvar alterações':'Adicionar à biblioteca';}
  };
}
async function action(btn) {
  const kind=btn.dataset.action;
  try {
    if(kind==='edit'){const note=notesCache.find(n=>n.id===btn.dataset.id);if(note)showForm(note);}
    else if(kind==='delete'){if(confirm('Excluir esta nota e todos os cartões dela?')){await deleteNote(btn.dataset.id);await render();}}
    else if(kind==='suspend'&&btn.dataset.card){await setCardSuspended(btn.dataset.card,btn.dataset.suspended!=='1');await render();}
  } catch(e){setMessage(e.message,true);}
}
async function startReview() {
  try {
    reviewCards=await reviewQueue(selectedDeck||null);reviewIndex=0;revealed=false;
    if(!reviewCards.length)return setMessage('Nenhum cartão vencido neste baralho e seus subbaralhos.');
    renderReview();
  } catch(e){setMessage(e.message,true);}
}
function renderReview() {
  const el=root(),card=reviewCards[reviewIndex];
  if(!card){el.innerHTML='<div class="anki-empty"><div class="anki-empty-symbol">✓</div><h2>Revisão concluída!</h2><p>Você terminou os cartões desta sessão. Muito bem!</p><button class="anki-primary" id="anki-review-done">Voltar à biblioteca</button></div>';document.getElementById('anki-review-done').onclick=()=>{revealed=false;render();};return;}
  const front=card.note.fields?.Front||'',back=card.note.fields?.Back||'';
  const question=card.card_type==='reverse'?back:front,answer=card.card_type==='reverse'?front:back;
  const questionHtml=card.card_type==='cloze'?cloze(front,card.template_ordinal,revealed):esc(question).replace(/\n/g,'<br>');
  const answerHtml=card.card_type==='cloze'?cloze(front,card.template_ordinal,true):esc(answer).replace(/\n/g,'<br>');
  el.innerHTML='<div class="anki-review-head"><button id="anki-review-exit">← Sair</button><span>Cartão '+(reviewIndex+1)+' de '+reviewCards.length+'</span></div>'+
    '<div class="anki-review-progress"><i style="width:'+((reviewIndex)/reviewCards.length*100)+'%"></i></div>'+
    '<article class="anki-review-card"><small>'+esc(card.note.tags?.join(' · ')||'REVISÃO')+'</small><div class="anki-question">'+questionHtml+'</div>'+
    (revealed?'<div class="anki-answer-divider"></div><div class="anki-answer">'+answerHtml+'</div>':'<span class="anki-tap-hint">Tente responder antes de revelar</span>')+'</article>'+
    (revealed?'<div class="anki-grade-grid" id="anki-grades"><p>Como foi lembrar?</p></div>':'<button class="anki-primary" id="anki-reveal">Mostrar resposta</button>')+'<p id="anki-message" aria-live="polite"></p>';
  document.getElementById('anki-review-exit').onclick=()=>{revealed=false;render();};
  if(!revealed)document.getElementById('anki-reveal').onclick=async()=>{revealed=true;renderReview();await showGradeIntervals(card);};
}
async function showGradeIntervals(card) {
  try {
    const previews=await previewCard(card),labels={again:'Errei',hard:'Difícil',good:'Bom',easy:'Fácil'},box=document.getElementById('anki-grades');
    if(!box)return;
    box.innerHTML='<p>Como foi lembrar?</p>'+previews.map(p=>'<button data-grade="'+p.label+'"><b>'+labels[p.label]+'</b><small>'+dateLabel(p.card.dueAt)+'</small></button>').join('');
    box.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>applyGrade(card,b.dataset.grade));
  } catch(e){setMessage(e.message,true);}
}
async function applyGrade(card,grade) {
  try{await gradeCard(card,grade);reviewIndex++;revealed=false;renderReview();}
  catch(e){setMessage(e.message,true);}
}
function exportTsv() {
  const rows=notesCache.map(n=>[n.fields?.Front||'',n.fields?.Back||'',(n.tags||[]).join(' ')]),text=rows.map(r=>r.map(v=>String(v).replace(/\t/g,' ').replace(/\r?\n/g,'<br>')).join('\t')).join('\n');
  const blob=new Blob([text],{type:'text/tab-separated-values;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='ciclo-anki.tsv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function importTsv() {
  if(!selectedDeck)return setMessage('Selecione um baralho específico para importar as notas.',true);
  const input=document.createElement('input');input.type='file';input.accept='.tsv,.txt,.csv';
  input.onchange=async()=>{
    const file=input.files?.[0];if(!file)return;
    try{
      const text=await file.text();let count=0;
      for(const line of text.split(/\r?\n/)){
        if(!line.trim()||line.startsWith('#'))continue;
        const parts=line.split(line.includes('\t')?'\t':';');
        if(!parts[0]?.trim()||!parts[1]?.trim())continue;
        await addNote({deckId:selectedDeck,front:parts[0].replace(/<br\s*\/?>/g,'\n'),back:parts[1].replace(/<br\s*\/?>/g,'\n'),tags:(parts[2]||'').split(/\s+/).filter(Boolean)});count++;
      }
      await render();setMessage(count+' notas importadas.');
    }catch(e){setMessage(e.message,true);}
  };input.click();
}
async function importLegacy() {
  const legacy=window.S?.cards||[];
  if(!legacy.length)return setMessage('Não há cartões antigos neste aparelho.');
  if(!selectedDeck)return setMessage('Selecione um baralho para receber os cartões antigos.',true);
  if(!confirm('Importar '+legacy.length+' cartões locais para o baralho selecionado? Os originais serão preservados.'))return;
  try{for(const card of legacy)await addNote({deckId:selectedDeck,front:card.f||'',back:card.v||'',tags:[card.m||'geral']});await render();setMessage(legacy.length+' cartões migrados.');}
  catch(e){setMessage(e.message,true);}
}
function install() {
  const original=window.render;if(typeof original!=='function')return;
  window.render=function(...args){const out=original.apply(this,args);if(window.tab==='cards')queueMicrotask(render);return out;};
  if(window.tab==='cards')render();
}
window.addEventListener('anki:create-from-cycle',async event=>{
  const detail=event.detail||{};
  const subject=String(detail.subject||'').trim();
  const topics=(Array.isArray(detail.topics)?detail.topics:String(detail.topic||'').split(',')).map(part=>String(part).trim()).filter(Boolean);
  const topic=topics.join(', ');
  const area=String(detail.area||'').trim();
  if(!subject||!topic)return;
  try{
    let decks=await listDecks();
    let parent=decks.find(d=>!d.parent_id&&d.name.toLocaleLowerCase('pt-BR')===subject.toLocaleLowerCase('pt-BR'));
    if(!parent)parent=await createDeck(subject,'');
    decks=await listDecks();
    parent=decks.find(d=>d.id===parent.id&&!d.parent_id);
    if(!parent)throw new Error('Não foi possível confirmar o baralho principal da matéria.');
    const childName=topic;
    let child=decks.find(d=>d.parent_id===parent.id&&d.name.toLocaleLowerCase('pt-BR')===childName.toLocaleLowerCase('pt-BR'));
    if(!child)child=await createDeck(childName,'',parent.id);
    decks=await listDecks();
    child=decks.find(d=>d.id===child.id&&d.parent_id===parent.id);
    if(!child)throw new Error('O subbaralho do assunto não foi criado corretamente.');
    selectedDeck=child.id;
    await render();
    showForm();
    const front=document.getElementById('anki-front');
    const back=document.getElementById('anki-back');
    const tags=document.getElementById('anki-tags');
    if(front){front.value='';front.defaultValue='';front.placeholder='Cole aqui o enunciado completo da questão que você errou.';}
    if(back){back.value='';back.defaultValue='';}
    if(tags)tags.value=['erro-ciclo',...area.split(/[\\s·,/]+/).filter(Boolean)].join(' ');
    const count=document.getElementById('anki-front-count');
    if(count&&front)count.textContent='0 caracteres';
    setMessage('Subbaralho criado em '+subject+'. Cole o enunciado da questão na frente e escreva a explicação no verso.');
    front?.focus();
  }catch(error){setMessage(error.message,true);}
});
install();
window.ankiReady=true;
window.dispatchEvent(new Event('anki:ready'));
