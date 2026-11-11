-- Prevent records belonging to one account from referencing another
-- account's decks, note types, notes, or cards.
begin;
alter table public.anki_decks
  add constraint anki_decks_id_user_unique unique (id, user_id);
alter table public.anki_note_types
  add constraint anki_note_types_id_user_unique unique (id, user_id);
alter table public.anki_notes
  add constraint anki_notes_id_user_unique unique (id, user_id);
alter table public.anki_cards
  add constraint anki_cards_id_user_unique unique (id, user_id);
alter table public.anki_notes
  add constraint anki_notes_deck_owner_fk foreign key (deck_id, user_id)
  references public.anki_decks (id, user_id) on delete cascade;
alter table public.anki_notes
  add constraint anki_notes_note_type_owner_fk foreign key (note_type_id, user_id)
  references public.anki_note_types (id, user_id) on delete set null (note_type_id);
alter table public.anki_cards
  add constraint anki_cards_note_owner_fk foreign key (note_id, user_id)
  references public.anki_notes (id, user_id) on delete cascade;
alter table public.anki_review_logs
  add constraint anki_review_logs_card_owner_fk foreign key (card_id, user_id)
  references public.anki_cards (id, user_id) on delete cascade;
commit;
