import { createFsrsCard, previewFsrs, reviewFsrs } from './anki-fsrs.js';

const KEY = 'ciclo-anki-local-v1';
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID ? crypto.randomUUID() : 'anki-' + Date.now() + '-' + Math.random().toString(36).slice(2);
function normalizeDecks(db) {
  let changed = false;
  db.decks.forEach(deck => {
    deck.parent_id ||= null;
    if (deck.name.includes('::') && !deck.parent_id) {
      const parts = deck.name.split('::').map(x => x.trim()).filter(Boolean);
      if (parts.length > 1) {
        let parentId = null;
        for (const part of parts.slice(0, -1)) {
          let parent = db.decks.find(d => d.name === part && (d.parent_id || null) === parentId && d.id !== deck.id);
          if (!parent) {
            parent = { id:id(), name:part, parent_id:parentId, description:'', is_default:false, created_at:deck.created_at || now() };
            db.decks.push(parent);
          }
          parentId = parent.id;
        }
        deck.name = parts[parts.length - 1];
        deck.parent_id = parentId;
        changed = true;
      }
    }
  });
  if (changed) localStorage.setItem(KEY, JSON.stringify(db));
}
function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (value && Array.isArray(value.decks) && Array.isArray(value.notes) && Array.isArray(value.cards)) {
      value.logs ||= [];
      normalizeDecks(value);
      return value;
    }
  } catch {}
  return { decks: [], notes: [], cards: [], logs: [] };
}
function descendantIds(db, deckId) {
  if (!deckId) return null;
  const ids = new Set([deckId]);
  let changed = true;
  while (changed) {
    changed = false;
    db.decks.forEach(deck => {
      if (deck.parent_id && ids.has(deck.parent_id) && !ids.has(deck.id)) {
        ids.add(deck.id); changed = true;
      }
    });
  }
  return ids;
}
function deckPath(deck, decks) {
  const parts = [deck.name]; let parent = decks.find(d => d.id === deck.parent_id); let guard = 0;
  while (parent && guard++ < decks.length) { parts.unshift(parent.name); parent = decks.find(d => d.id === parent.parent_id); }
  return parts.join('::');
}
function write(db) { localStorage.setItem(KEY, JSON.stringify(db)); }
function requireDeck(db, deckId) {
  const deck = db.decks.find(item => item.id === deckId);
  if (!deck) throw new Error('Baralho não encontrado neste aparelho.');
  return deck;
}
export async function listDecks() {
  const decks = read().decks;
  return decks.slice().sort((a,b) => deckPath(a,decks).localeCompare(deckPath(b,decks), 'pt-BR'));
}
export async function createDeck(name, description = '', parentId = null) {
  const clean = String(name || '').trim();
  if (!clean || clean.includes('::')) throw new Error('Informe apenas o nome deste baralho, sem ::.');
  const db = read();
  if (parentId) requireDeck(db, parentId);
  if (db.decks.some(d => d.name.toLocaleLowerCase('pt-BR') === clean.toLocaleLowerCase('pt-BR') && (d.parent_id || null) === parentId)) throw new Error('Já existe um baralho com esse nome neste nível.');
  const deck = { id:id(), name:clean, parent_id:parentId || null, description, is_default:false, created_at:now() };
  db.decks.push(deck); write(db); return deck;
}
export async function renameDeck(deckId, name) {
  const clean = String(name || '').trim();
  if (!clean || clean.includes('::')) throw new Error('Informe apenas o nome deste baralho, sem ::.');
  const db=read(), deck=requireDeck(db,deckId);
  if (db.decks.some(d => d.id !== deckId && d.name.toLocaleLowerCase('pt-BR') === clean.toLocaleLowerCase('pt-BR') && (d.parent_id || null) === (deck.parent_id || null))) throw new Error('Já existe um baralho com esse nome neste nível.');
  deck.name=clean; deck.updated_at=now(); write(db);
}
export async function deleteDeck(deckId) {
  const db=read(); requireDeck(db,deckId);
  const deckIds=descendantIds(db,deckId);
  const noteIds=new Set(db.notes.filter(n=>deckIds.has(n.deck_id)).map(n=>n.id));
  const cardIds=new Set(db.cards.filter(c=>noteIds.has(c.note_id)).map(c=>c.id));
  db.decks=db.decks.filter(d=>!deckIds.has(d.id));
  db.notes=db.notes.filter(n=>!noteIds.has(n.id));
  db.cards=db.cards.filter(c=>!noteIds.has(c.note_id));
  db.logs=db.logs.filter(l=>!cardIds.has(l.card_id)); write(db);
}
export async function listNotes(deckId=null) {
  const db=read(), deckIds=descendantIds(db,deckId);
  return db.notes.filter(n=>!deckIds||deckIds.has(n.deck_id))
    .sort((a,b)=>b.created_at.localeCompare(a.created_at))
    .map(n=>({...n,cards:db.cards.filter(c=>c.note_id===n.id)}));
}
export async function addNote({deckId,front,back,tags=[],cardType='basic',media=[],occlusion=null}) {
  const db=read(); requireDeck(db,deckId);
  front=String(front||'').trim(); back=String(back||'').trim();
  if(!front) throw new Error('A frente do cartão é obrigatória.');
  if(cardType!=='cloze'&&!back) throw new Error('O verso do cartão é obrigatório.');
  const clozeIds=[...new Set([...front.matchAll(/\{\{c(\d+)::/g)].map(m=>Number(m[1])))].sort((a,b)=>a-b);
  if(cardType==='cloze'&&!clozeIds.length) throw new Error('Use uma lacuna no formato {{c1::resposta}}.');
  if(cardType==='image-occlusion'&&(!occlusion||!Array.isArray(occlusion.masks)||!occlusion.masks.length)) throw new Error('Desenhe ao menos uma área para ocultar.');
  const note={id:id(),deck_id:deckId,fields:{Front:front,Back:back},media:Array.isArray(media)?media:[],occlusion:cardType==='image-occlusion'?occlusion:null,tags:tags.map(t=>String(t).trim()).filter(Boolean),created_at:now(),updated_at:now()};
  let specs=cardType==='image-occlusion'?occlusion.masks.map((mask,ordinal)=>({type:'image-occlusion',ordinal} )):
    cardType==='cloze'?clozeIds.map(ordinal=>({type:'cloze',ordinal})):
    cardType==='basic-reversed'?[{type:'basic',ordinal:0},{type:'reverse',ordinal:1}]:[{type:'basic',ordinal:0}];
  const cards=[];
  for(const spec of specs) {
    const cardId=id(), fsrs=await createFsrsCard(cardId);
    cards.push({id:cardId,note_id:note.id,template_ordinal:spec.ordinal,card_type:spec.type,due_at:fsrs.dueAt,fsrs_state:fsrs,suspended:false,buried_until:null,created_at:now()});
  }
  db.notes.push(note); db.cards.push(...cards); write(db); return note;
}
export async function updateNote(noteId,{front,back,tags=[],deckId,media}) {
  const db=read(), note=db.notes.find(n=>n.id===noteId);
  if(!note) throw new Error('Nota não encontrada.');
  front=String(front||'').trim(); back=String(back||'').trim();
  if(!front) throw new Error('A frente do cartão é obrigatória.');
  const cards=db.cards.filter(c=>c.note_id===noteId);
  if(cards.some(c=>c.card_type==='cloze')&&!/\{\{c\d+::.+?\}\}/s.test(front)) throw new Error('Mantenha ao menos uma lacuna {{c1::resposta}} neste cartão Cloze.');
  if(cards.some(c=>c.card_type!=='cloze')&&!back) throw new Error('O verso do cartão é obrigatório.');
  if (deckId && deckId !== note.deck_id) { requireDeck(db, deckId); note.deck_id = deckId; }
  note.fields={Front:front,Back:back}; if(Array.isArray(media))note.media=media; note.tags=tags.map(t=>String(t).trim()).filter(Boolean); note.updated_at=now(); write(db);
}
export async function deleteNote(noteId) {
  const db=read(), cardIds=new Set(db.cards.filter(c=>c.note_id===noteId).map(c=>c.id));
  db.notes=db.notes.filter(n=>n.id!==noteId); db.cards=db.cards.filter(c=>c.note_id!==noteId); db.logs=db.logs.filter(l=>!cardIds.has(l.card_id)); write(db);
}
export async function reviewQueue(deckId=null) {
  const db=read(), deckIds=descendantIds(db,deckId), notes=new Map(db.notes.filter(n=>!deckIds||deckIds.has(n.deck_id)).map(n=>[n.id,n]));
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
  const db=read(), deckIds=descendantIds(db,deckId), noteIds=new Set(db.notes.filter(n=>!deckIds||deckIds.has(n.deck_id)).map(n=>n.id));
  const cards=db.cards.filter(c=>noteIds.has(c.note_id));
  const cardIds=new Set(cards.map(c=>c.id));
  const cutoff=Date.now()-30*86400000;
  const logs=db.logs.filter(l=>cardIds.has(l.card_id)&&new Date(l.reviewed_at).getTime()>=cutoff);
  return {total:cards.length,suspended:cards.filter(c=>c.suspended).length,due:cards.filter(c=>!c.suspended&&new Date(c.due_at).getTime()<=Date.now()).length,reviews30d:logs.length,accuracy30d:logs.length?Math.round(logs.filter(l=>l.rating>=3).length/logs.length*100):null};
}
