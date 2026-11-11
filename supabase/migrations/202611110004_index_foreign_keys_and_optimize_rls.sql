-- Cover foreign keys and keep RLS auth lookups init-plan friendly.
create index if not exists anki_note_types_user_fk_idx on public.anki_note_types(user_id);
create index if not exists anki_notes_deck_fk_idx on public.anki_notes(deck_id);
create index if not exists anki_notes_deck_owner_fk_idx on public.anki_notes(deck_id,user_id);
create index if not exists anki_notes_note_type_fk_idx on public.anki_notes(note_type_id);
create index if not exists anki_notes_note_type_owner_fk_idx on public.anki_notes(note_type_id,user_id);
create index if not exists anki_cards_note_owner_fk_idx on public.anki_cards(note_id,user_id);
create index if not exists anki_review_logs_card_fk_idx on public.anki_review_logs(card_id);
create index if not exists anki_review_logs_card_owner_fk_idx on public.anki_review_logs(card_id,user_id);

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using ((select auth.uid()) = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "app_state_owner_all" on public.user_app_state;
create policy "app_state_owner_all" on public.user_app_state for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "anki_decks_owner_all" on public.anki_decks;
create policy "anki_decks_owner_all" on public.anki_decks for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "anki_note_types_owner_all" on public.anki_note_types;
create policy "anki_note_types_owner_all" on public.anki_note_types for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "anki_notes_owner_all" on public.anki_notes;
create policy "anki_notes_owner_all" on public.anki_notes for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "anki_cards_owner_all" on public.anki_cards;
create policy "anki_cards_owner_all" on public.anki_cards for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "anki_review_logs_owner_all" on public.anki_review_logs;
create policy "anki_review_logs_owner_all" on public.anki_review_logs for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
