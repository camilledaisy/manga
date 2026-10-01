-- Manga Shelf database. Paste this whole file into Supabase → SQL Editor → Run, once.
-- Every table has row-level security: anyone signed in can read shared data,
-- but each person can only write their own rows. Private notes and private lists
-- are readable by their owner only.

-- ---------- tables ----------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  name text not null default '' check (char_length(name) <= 40),
  bio text not null default '' check (char_length(bio) <= 300),
  avatar text check (avatar is null or (avatar ~ '^data:image/(jpeg|png|webp);base64,' and char_length(avatar) <= 80000)),
  hue int not null default 220 check (hue between 0 and 359),
  favorites text[] not null default '{}' check (cardinality(favorites) <= 10),
  favorite_characters jsonb not null default '[]' check (jsonb_typeof(favorite_characters) = 'array' and pg_column_size(favorite_characters) < 8000),
  joined_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table public.library_entries (
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  manga_id text not null check (char_length(manga_id) <= 100),
  status text not null check (status in ('reading', 'planning', 'completed', 'paused', 'dropped')),
  chapter int not null default 0 check (chapter between 0 and 100000),
  volume int not null default 0 check (volume between 0 and 10000),
  rating int not null default 0 check (rating between 0 and 10),
  added_at bigint not null,
  updated_at bigint not null,
  started_at bigint,
  completed_at bigint,
  primary key (user_id, manga_id)
);

create table public.private_notes (
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  manga_id text not null check (char_length(manga_id) <= 100),
  notes text not null check (char_length(notes) <= 5000),
  primary key (user_id, manga_id)
);

create table public.reviews (
  id text primary key check (char_length(id) <= 64),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  manga_id text not null check (char_length(manga_id) <= 100),
  rating int not null default 0 check (rating between 0 and 10),
  body text not null check (char_length(body) between 1 and 5000),
  spoiler boolean not null default false,
  created_at bigint not null,
  edited_at bigint,
  unique (user_id, manga_id)
);

create table public.review_likes (
  review_id text not null references public.reviews on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  primary key (review_id, user_id)
);

create table public.review_comments (
  id text primary key check (char_length(id) <= 64),
  review_id text not null references public.reviews on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at bigint not null
);

create table public.follows (
  follower_id uuid not null default auth.uid() references public.profiles on delete cascade,
  followee_id uuid not null references public.profiles on delete cascade,
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create table public.lists (
  id text primary key check (char_length(id) <= 64),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 400),
  public boolean not null default true,
  manga_ids text[] not null default '{}' check (cardinality(manga_ids) <= 500),
  created_at bigint not null,
  updated_at bigint not null
);

create table public.activity (
  id text primary key check (char_length(id) <= 64),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  type text not null check (type in ('progress', 'status', 'rating', 'review', 'favorite', 'list')),
  manga_id text check (char_length(manga_id) <= 100),
  data jsonb not null default '{}' check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 2000),
  at bigint not null
);
create index activity_at on public.activity (at desc);

-- Metadata for manga that came from AniList search (ids like "al-12345"), so friends'
-- browsers can show them too. Insert-only: nobody can overwrite an existing entry.
create table public.manga_cache (
  id text primary key check (id ~ '^al-[0-9]{1,10}$'),
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 20000),
  added_by uuid default auth.uid() references public.profiles on delete set null
);

-- ---------- row-level security ----------
alter table public.profiles enable row level security;
alter table public.library_entries enable row level security;
alter table public.private_notes enable row level security;
alter table public.reviews enable row level security;
alter table public.review_likes enable row level security;
alter table public.review_comments enable row level security;
alter table public.follows enable row level security;
alter table public.lists enable row level security;
alter table public.activity enable row level security;
alter table public.manga_cache enable row level security;

create policy "profiles: signed-in users read" on public.profiles for select to authenticated using (true);
create policy "profiles: create own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles: update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "library: signed-in users read" on public.library_entries for select to authenticated using (true);
create policy "library: write own" on public.library_entries for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "notes: owner only" on public.private_notes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "reviews: signed-in users read" on public.reviews for select to authenticated using (true);
create policy "reviews: write own" on public.reviews for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "likes: signed-in users read" on public.review_likes for select to authenticated using (true);
create policy "likes: add own" on public.review_likes for insert to authenticated with check (user_id = auth.uid());
create policy "likes: remove own" on public.review_likes for delete to authenticated using (user_id = auth.uid());

create policy "comments: signed-in users read" on public.review_comments for select to authenticated using (true);
create policy "comments: add own" on public.review_comments for insert to authenticated with check (user_id = auth.uid());
create policy "comments: remove own" on public.review_comments for delete to authenticated using (user_id = auth.uid());

create policy "follows: signed-in users read" on public.follows for select to authenticated using (true);
create policy "follows: add own" on public.follows for insert to authenticated with check (follower_id = auth.uid());
create policy "follows: remove own" on public.follows for delete to authenticated using (follower_id = auth.uid());

create policy "lists: read public or own" on public.lists for select to authenticated using (public or user_id = auth.uid());
create policy "lists: write own" on public.lists for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "activity: signed-in users read" on public.activity for select to authenticated using (true);
create policy "activity: write own" on public.activity for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "manga cache: signed-in users read" on public.manga_cache for select to authenticated using (true);
create policy "manga cache: add" on public.manga_cache for insert to authenticated with check (added_by = auth.uid());

-- ---------- signup ----------
-- Creates the profile from the username chosen on the signup form.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, name, hue)
  values (new.id, lower(new.raw_user_meta_data ->> 'username'),
          left(coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), new.raw_user_meta_data ->> 'username'), 40),
          floor(random() * 360)::int);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Lets the signup form check a username before creating the account.
create function public.username_available(wanted text) returns boolean
language sql security definer set search_path = public stable as $$
  select not exists (select 1 from public.profiles p where p.username = lower(wanted));
$$;
revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- ---------- direct messages ----------
create table public.messages (
  id text primary key check (char_length(id) <= 64),
  sender_id uuid not null default auth.uid() references public.profiles on delete cascade,
  recipient_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at bigint not null,
  read_at bigint,
  check (sender_id <> recipient_id)
);
create index messages_recipient on public.messages (recipient_id, created_at);
create index messages_sender on public.messages (sender_id, created_at);
alter table public.messages enable row level security;
-- Only the two people in a conversation can read it; you can only send as yourself.
-- No update policy: read receipts go through mark_read() so nobody can edit a message.
create policy "messages: participants read" on public.messages for select to authenticated using (auth.uid() in (sender_id, recipient_id));
create policy "messages: send as yourself" on public.messages for insert to authenticated with check (sender_id = auth.uid() and read_at is null);
create policy "messages: sender deletes" on public.messages for delete to authenticated using (sender_id = auth.uid());

create function public.mark_read(other uuid) returns void
language sql security definer set search_path = public as $$
  update public.messages set read_at = (extract(epoch from now()) * 1000)::bigint
  where recipient_id = auth.uid() and sender_id = other and read_at is null;
$$;
revoke execute on function public.mark_read(uuid) from public;
grant execute on function public.mark_read(uuid) to authenticated;

-- ---------- AI assistant: daily limit per person ----------
-- The assistant runs on your Anthropic API key, and anyone can sign up, so each person
-- gets a fixed number of questions per day. Change 30 to taste.
create table public.assistant_usage (
  user_id uuid not null references public.profiles on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);
alter table public.assistant_usage enable row level security;   -- no policies: only the function below touches it

create function public.use_assistant_quota() returns boolean
language sql security definer set search_path = public as $$
  insert into public.assistant_usage as u (user_id, day, count) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set count = u.count + 1
  returning count <= 30;
$$;
revoke execute on function public.use_assistant_quota() from public;
grant execute on function public.use_assistant_quota() to authenticated;
