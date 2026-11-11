-- Remove direct table privileges from anonymous clients.
-- Authenticated users still need SQL privileges, while RLS limits every row
-- to the current auth.uid().
revoke all on table
  public.profiles,
  public.user_app_state,
  public.anki_decks,
  public.anki_note_types,
  public.anki_notes,
  public.anki_cards,
  public.anki_review_logs
from anon;

grant select, insert, update, delete on table
  public.profiles,
  public.user_app_state,
  public.anki_decks,
  public.anki_note_types,
  public.anki_notes,
  public.anki_cards,
  public.anki_review_logs
to authenticated;

alter default privileges in schema public
  revoke all on tables from anon;
