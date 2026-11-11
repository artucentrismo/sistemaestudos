import { getSupabase, getCurrentUser } from './supabase-client.js';
import { createFsrsCard, previewFsrs, reviewFsrs } from './anki-fsrs.js';

async function context() {
  const [supabase, user] = await Promise.all([getSupabase(), getCurrentUser()]);
  if (!user) throw new Error('Entre na sua conta para usar o Anki sincronizado.');
  return { supabase, user };
}
export async function listDecks() {
  const { supabase, user } = await context();
  const { data, error } = await supabase.from('anki_decks')
    .select('id,name,description,is_default,created_at')
    .eq('user_id', user.id).order('name');
  if (error) throw error;
  return data || [];
}
export async function createDeck(name, description = '') {
  const { supabase, user } = await context();
  const clean = name.trim();
  if (!clean) throw new Error('Dê um nome ao baralho.');
  const { data, error } = await supabase.from('anki_decks')
    .insert({ user_id: user.id, name: clean, description }).select().single();
  if (error) throw error;
  return data;
}
export async function renameDeck(id, name) {
  const { supabase, user } = await context();
  const { error } = await supabase.from('anki_decks')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}
export async function deleteDeck(id) {
  const { supabase, user } = await context();
  const { error } = await supabase.from('anki_decks').delete()
    .eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}
export async function listNotes(deckId) {
  const { supabase, user } = await context();
  let q = supabase.from('anki_notes')
    .select('id,deck_id,fields,tags,created_at,updated_at')
    .eq('user_id', user.id).order('created_at', { ascending: false });
  if (deckId) q = q.eq('deck_id', deckId);
  const { data, error } = await q;
  if (error) throw error;
  const notes = data || [];
  if (!notes.length) return [];
  const ids = notes.map(n => n.id);
  const { data: cards, error: cardError } = await supabase.from('anki_cards')
    .select('id,note_id,card_type,due_at,fsrs_state,suspended,buried_until')
    .eq('user_id', user.id).in('note_id', ids);
  if (cardError) throw cardError;
  return notes.map(note => ({ ...note, cards: (cards || []).filter(c => c.note_id === note.id) }));
}
export async function addNote({ deckId, front, back, tags = [], cardType = 'basic' }) {
  const { supabase, user } = await context();
  if (!deckId) throw new Error('Escolha um baralho.');
  if (!front.trim()) throw new Error('A frente do cartão é obrigatória.');
  if (cardType !== 'cloze' && !back.trim()) throw new Error('O verso do cartão é obrigatório.');
  if (cardType === 'cloze' && !/\{\{c\d+::.+?\}\}/s.test(front))
    throw new Error('Use uma lacuna no formato {{c1::resposta}}.');
  const { data: note, error } = await supabase.from('anki_notes').insert({
    user_id: user.id, deck_id: deckId, fields: { Front: front.trim(), Back: back.trim() },
    tags: tags.map(t => t.trim()).filter(Boolean)
  }).select().single();
  if (error) throw error;
  const cardId = crypto.randomUUID();
  const fsrs = await createFsrsCard(cardId);
  const { error: cardError } = await supabase.from('anki_cards').insert({
    id: cardId, user_id: user.id, note_id: note.id, card_type: cardType,
    due_at: fsrs.dueAt, fsrs_state: fsrs
  });
  if (cardError) {
    await supabase.from('anki_notes').delete().eq('id', note.id).eq('user_id', user.id);
    throw cardError;
  }
  return note;
}
export async function updateNote(noteId, { front, back, tags = [], cardType = 'basic' }) {
  const { supabase, user } = await context();
  if (!front.trim()) throw new Error('A frente do cartão é obrigatória.');
  if (cardType === 'cloze' && !/\\{\\{c\\d+::.+?\\}\\}/s.test(front))
    throw new Error('Use uma lacuna no formato {{c1::resposta}}.');
  if (cardType !== 'cloze' && !back.trim()) throw new Error('O verso do cartão é obrigatório.');
  const { error } = await supabase.from('anki_notes').update({
    fields: { Front: front.trim(), Back: back.trim() },
    tags: tags.map(t => t.trim()).filter(Boolean), updated_at: new Date().toISOString()
  }).eq('id', noteId).eq('user_id', user.id);
  if (error) throw error;
  const { error: cardError } = await supabase.from('anki_cards').update({
    card_type: cardType, updated_at: new Date().toISOString()
  }).eq('note_id', noteId).eq('user_id', user.id);
  if (cardError) throw cardError;
}
export async function deleteNote(noteId) {
  const { supabase, user } = await context();
  const { error } = await supabase.from('anki_notes').delete()
    .eq('id', noteId).eq('user_id', user.id);
  if (error) throw error;
}
export async function reviewQueue(deckId = null) {
  const { supabase, user } = await context();
  let q = supabase.from('anki_cards')
    .select('id,note_id,card_type,due_at,fsrs_state,suspended,buried_until')
    .eq('user_id', user.id).eq('suspended', false)
    .lte('due_at', new Date().toISOString()).order('due_at');
  const { data: cards, error } = await q;
  if (error) throw error;
  let due = cards || [];
  if (deckId && due.length) {
    const ids = [...new Set(due.map(c => c.note_id))];
    const { data: notes, error: noteError } = await supabase.from('anki_notes')
      .select('id,deck_id').eq('user_id', user.id).in('id', ids).eq('deck_id', deckId);
    if (noteError) throw noteError;
    const valid = new Set((notes || []).map(n => n.id));
    due = due.filter(c => valid.has(c.note_id));
  }
  if (!due.length) return [];
  const ids = [...new Set(due.map(c => c.note_id))];
  const { data: notes, error: noteError } = await supabase.from('anki_notes')
    .select('id,deck_id,fields,tags').eq('user_id', user.id).in('id', ids);
  if (noteError) throw noteError;
  const byId = new Map((notes || []).map(n => [n.id, n]));
  return due.map(c => ({ ...c, note: byId.get(c.note_id) })).filter(c => c.note);
}
export async function previewCard(card) {
  return previewFsrs(card.fsrs_state);
}
export async function gradeCard(card, grade) {
  const { supabase, user } = await context();
  const previous = card.fsrs_state;
  const result = await reviewFsrs(previous, grade);
  const rating = ({ again: 1, hard: 2, good: 3, easy: 4 })[grade];
  const { error: updateError } = await supabase.from('anki_cards').update({
    fsrs_state: result.card, due_at: result.card.dueAt,
    updated_at: new Date().toISOString()
  }).eq('id', card.id).eq('user_id', user.id);
  if (updateError) throw updateError;
  const { error: logError } = await supabase.from('anki_review_logs').insert({
    user_id: user.id, card_id: card.id, rating,
    reviewed_at: new Date().toISOString(),
    elapsed_days: result.revlog.elapsedDays ?? null,
    scheduled_days: result.revlog.scheduledDays ?? null,
    previous_state: previous, resulting_state: result.card, fsrs_revlog: result.revlog
  });
  if (logError) throw logError;
  return result.card;
}
export async function setCardSuspended(cardId, suspended) {
  const { supabase, user } = await context();
  const { error } = await supabase.from('anki_cards').update({
    suspended, updated_at: new Date().toISOString()
  }).eq('id', cardId).eq('user_id', user.id);
  if (error) throw error;
}
export async function getStats(deckId = null) {
  const { supabase, user } = await context();
  const [{ data: cards, error: cardError }, { data: logs, error: logError }] = await Promise.all([
    supabase.from('anki_cards').select('id,note_id,due_at,fsrs_state,suspended')
      .eq('user_id', user.id),
    supabase.from('anki_review_logs').select('id,rating,reviewed_at')
      .eq('user_id', user.id).gte('reviewed_at', new Date(Date.now() - 30*86400000).toISOString())
  ]);
  if (cardError) throw cardError;
  if (logError) throw logError;
  let selectedCards = cards || [];
  let selectedLogs = logs || [];
  if (deckId) {
    const { data: notes, error } = await supabase.from('anki_notes')
      .select('id').eq('user_id', user.id).eq('deck_id', deckId);
    if (error) throw error;
    const ids = new Set((notes || []).map(n => n.id));
    selectedCards = selectedCards.filter(c => ids.has(c.note_id));
    const cardIds = new Set(selectedCards.map(c => c.id));
    const { data: deckLogs, error: logErr } = await supabase.from('anki_review_logs')
      .select('id,rating,reviewed_at,card_id').eq('user_id', user.id)
      .gte('reviewed_at', new Date(Date.now() - 30*86400000).toISOString());
    if (logErr) throw logErr;
    selectedLogs = (deckLogs || []).filter(l => cardIds.has(l.card_id));
  }
  const now = Date.now();
  return {
    total: selectedCards.length,
    suspended: selectedCards.filter(c => c.suspended).length,
    due: selectedCards.filter(c => !c.suspended && new Date(c.due_at).getTime() <= now).length,
    reviews30d: selectedLogs.length,
    accuracy30d: selectedLogs.length ? Math.round(selectedLogs.filter(l => l.rating >= 3).length / selectedLogs.length * 100) : null
  };
}
