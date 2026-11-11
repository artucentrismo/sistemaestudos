import { createFsrsCard, previewFsrs, reviewFsrs } from './anki-fsrs.js';

const KEY = 'ciclo-anki-local-v1';
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID ? crypto.randomUUID() : 'anki-' + Date.now() + '-' + Math.random().toString(36).slice(2);
function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (value && Array.isArray(value.decks) && Array.isArray(value.notes) && Array.isArray(value.cards)) {
      value.logs ||= [];
      return value;
    }
  } catch {}
  return { decks: [], notes: [], cards: [], logs: [] };
}
function write(db) { localStorage.setItem(KEY, JSON.stringify(db)); }
function requireDeck(db, deckId) {
  const deck = db.decks.find(item => item.id === deckId);
  if (!deck) throw new Error('Baralho não encontrado neste aparelho.');
  return deck;
}
export async function listDecks() {
  return read().decks.slice().sort((a,b) => a.name.localeCompare(b.name, 'pt-BR'));
}
export async function createDeck(name, description = '') {
  const clean = String(name || '').trim();
  if (!clean) throw new Error('Dê um nome ao baralho.');
  const db = read();
  const deck = { id:id(), name:clean, description, is_default:false, created_at:now() };
  db.decks.push(deck); write(db); return deck;
}
export async function renameDeck(deckId, name) {
  const clean = String(name || '').trim();
  if (!clean) throw new Error('Dê um nome ao baralho.');
  const db=read(), deck=requireDeck(db,deckId); deck.name=clean; deck.updated_at=now(); write(db);
}
export async function deleteDeck(deckId) {
  const db=read(); requireDeck(db,deckId);
  const noteIds=new Set(db.notes.filter(n=>n.deck_id===deckId).map(n=>n.id));
  const cardIds=new Set(db.cards.filter(c=>noteIds.has(c.note_id)).map(c=>c.id));
  db.decks=db.decks.filter(d=>d.id!==deckId);
  db.notes=db.notes.filter(n=>!noteIds.has(n.id));
  db.cards=db.cards.filter(c=>!noteIds.has(c.note_id));
  db.logs=db.logs.filter(l=>!cardIds.has(l.card_id)); write(db);
}
export async function listNotes(deckId=null) {
  const db=read();
  return db.notes.filter(n=>!deckId||n.deck_id===deckId)
    .sort((a,b)=>b.created_at.localeCompare(a.created_at))
    .map(n=>({...n,cards:db.cards.filter(c=>c.note_id===n.id)}));
}
export async function addNote({deckId,front,back,tags=[],cardType='basic'}) {
  const db=read(); requireDeck(db,deckId);
  front=String(front||'').trim(); back=String(back||'').trim();
  if(!front) throw new Error('A frente do cartão é obrigatória.');
  if(cardType!=='cloze'&&!back) throw new Error('O verso do cartão é obrigatório.');
  const clozeIds=[...new Set([...front.matchAll(/\{\{c(\d+)::/g)].map(m=>Number(m[1])))].sort((a,b)=>a-b);
  if(cardType==='cloze'&&!clozeIds.length) throw new Error('Use uma lacuna no formato {{c1::resposta}}.');
  const note={id:id(),deck_id:deckId,fields:{Front:front,Back:back},tags:tags.map(t=>String(t).trim()).filter(Boolean),created_at:now(),updated_at:now()};
  let specs=cardType==='cloze'?clozeIds.map(ordinal=>({type:'cloze',ordinal})):
    cardType==='basic-reversed'?[{type:'basic',ordinal:0},{type:'reverse',ordinal:1}]:[{type:'basic',ordinal:0}];
  const cards=[];
  for(const spec of specs) {
    const cardId=id(), fsrs=await createFsrsCard(cardId);
    cards.push({id:cardId,note_id:note.id,template_ordinal:spec.ordinal,card_type:spec.type,due_at:fsrs.dueAt,fsrs_state:fsrs,suspended:false,buried_until:null,created_at:now()});
  }
  db.notes.push(note); db.cards.push(...cards); write(db); return note;
}
export async function updateNote(noteId,{front,back,tags=[]}) {
  const db=read(), note=db.notes.find(n=>n.id===noteId);
  if(!note) throw new Error('Nota não encontrada.');
  front=String(front||'').trim(); back=String(back||'').trim();
  if(!front) throw new Error('A frente do cartão é obrigatória.');
  const cards=db.cards.filter(c=>c.note_id===noteId);
  if(cards.some(c=>c.card_type==='cloze')&&!/\{\{c\d+::.+?\}\}/s.test(front)) throw new Error('Mantenha ao menos uma lacuna {{c1::resposta}} neste cartão Cloze.');
  if(cards.some(c=>c.card_type!=='cloze')&&!back) throw new Error('O verso do cartão é obrigatório.');
  note.fields={Front:front,Back:back}; note.tags=tags.map(t=>String(t).trim()).filter(Boolean); note.updated_at=now(); write(db);
}
export async function deleteNote(noteId) {
  const db=read(), cardIds=new Set(db.cards.filter(c=>c.note_id===noteId).map(c=>c.id));
  db.notes=db.notes.filter(n=>n.id!==noteId); db.cards=db.cards.filter(c=>c.note_id!==noteId); db.logs=db.logs.filter(l=>!cardIds.has(l.card_id)); write(db);
}
export async function reviewQueue(deckId=null) {
  const db=read(), notes=new Map(db.notes.filter(n=>!deckId||n.deck_id===deckId).map(n=>[n.id,n]));
  return db.cards.filter(c=>!c.suspended&&new Date(c.due_at).getTime()<=Date.now()&&notes.has(c.note_id))
    .sort((a,b)=>a.due_at.localeCompare(b.due_at)).map(c=>({...c,note:notes.get(c.note_id)}));
}
export async function previewCard(card) { return previewFsrs(card.fsrs_state); }
export async function gradeCard(card,grade) {
  const db=read(), current=db.cards.find(c=>c.id===card.id);
  if(!current) throw new Error('Cartão não encontrado neste aparelho.');
  const previous=current.fsrs_state, result=await reviewFsrs(previous,grade);
  current.fsrs_state=result.card; current.due_at=result.card.dueAt; current.updated_at=now();
  db.logs.push({id:id(),card_id:card.id,rating:({again:1,hard:2,good:3,easy:4})[grade],reviewed_at:now(),elapsed_days:result.revlog.elapsedDays??null,scheduled_days:result.revlog.scheduledDays??null,previous_state:previous,resulting_state:result.card,fsrs_revlog:result.revlog});
  write(db); return result.card;
}
export async function setCardSuspended(cardId,suspended) {
  const db=read(), card=db.cards.find(c=>c.id===cardId);
  if(!card) throw new Error('Cartão não encontrado.'); card.suspended=!!suspended; card.updated_at=now(); write(db);
}
export async function getStats(deckId=null) {
  const db=read(), noteIds=new Set(db.notes.filter(n=>!deckId||n.deck_id===deckId).map(n=>n.id));
  const cards=db.cards.filter(c=>noteIds.has(c.note_id));
  const cardIds=new Set(cards.map(c=>c.id));
  const cutoff=Date.now()-30*86400000;
  const logs=db.logs.filter(l=>cardIds.has(l.card_id)&&new Date(l.reviewed_at).getTime()>=cutoff);
  return {total:cards.length,suspended:cards.filter(c=>c.suspended).length,due:cards.filter(c=>!c.suspended&&new Date(c.due_at).getTime()<=Date.now()).length,reviews30d:logs.length,accuracy30d:logs.length?Math.round(logs.filter(l=>l.rating>=3).length/logs.length*100):null};
}
