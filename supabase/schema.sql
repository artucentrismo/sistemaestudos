-- Ciclo: schema inicial para contas individuais e Anki com FSRS.
-- Execute no SQL Editor do projeto Supabase. Nunca use a service_role key no navegador.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.anki_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.anki_note_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  fields jsonb not null default '["Front","Back"]'::jsonb,
  templates jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.anki_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid not null references public.anki_decks(id) on delete cascade,
  note_type_id uuid references public.anki_note_types(id) on delete set null,
  fields jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.anki_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.anki_notes(id) on delete cascade,
  template_ordinal integer not null default 0,
  card_type text not null default 'basic',
  due_at timestamptz not null default now(),
  fsrs_state jsonb not null default '{}'::jsonb,
  suspended boolean not null default false,
  buried_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (note_id, template_ordinal)
);

create table if not exists public.anki_review_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.anki_cards(id) on delete cascade,
  rating smallint not null check (rating between 1 and 4),
  reviewed_at timestamptz not null default now(),
  elapsed_days numeric,
  scheduled_days numeric,
  previous_state jsonb not null default '{}'::jsonb,
  resulting_state jsonb not null default '{}'::jsonb,
  fsrs_revlog jsonb not null default '{}'::jsonb
);

create index if not exists anki_decks_user_idx on public.anki_decks(user_id);
create index if not exists anki_notes_deck_idx on public.anki_notes(user_id, deck_id);
create index if not exists anki_cards_due_idx on public.anki_cards(user_id, due_at) where suspended = false;
create index if not exists anki_review_logs_card_idx on public.anki_review_logs(user_id, card_id, reviewed_at desc);


create index if not exists anki_note_types_user_fk_idx on public.anki_note_types(user_id);
create index if not exists anki_notes_deck_fk_idx on public.anki_notes(deck_id);
create index if not exists anki_notes_deck_owner_fk_idx on public.anki_notes(deck_id,user_id);
create index if not exists anki_notes_note_type_fk_idx on public.anki_notes(note_type_id);
create index if not exists anki_notes_note_type_owner_fk_idx on public.anki_notes(note_type_id,user_id);
create index if not exists anki_cards_note_owner_fk_idx on public.anki_cards(note_id,user_id);
create index if not exists anki_review_logs_card_fk_idx on public.anki_review_logs(card_id);
create index if not exists anki_review_logs_card_owner_fk_idx on public.anki_review_logs(card_id,user_id);

alter table public.profiles enable row level security;
alter table public.user_app_state enable row level security;
alter table public.anki_decks enable row level security;
alter table public.anki_note_types enable row level security;
alter table public.anki_notes enable row level security;
alter table public.anki_cards enable row level security;
alter table public.anki_review_logs enable row level security;

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

-- Criar automaticamente o perfil no cadastro. A função roda com privilégios do banco,
-- mas só grava o id do próprio usuário que acabou de ser autenticado.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Restrict API table grants: anonymous clients cannot query private user data.
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
