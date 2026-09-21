-- ============ EXTENSIONS ============
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";

-- ============ PROFILES ============
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 2 and 60),
  avatar_url text,
  cover_url text,
  bio text check (char_length(bio) <= 160),
  pronouns text,
  dob date,
  location text,
  website text,
  social_links jsonb default '{}'::jsonb,
  theme text default 'system' check (theme in ('light','dark','system')),
  language text default 'en',
  onboarded boolean default false,
  verified boolean default false,
  role text default 'user' check (role in ('user','moderator','admin')),
  last_seen timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on profiles (username);
create index on profiles using gin (display_name gin_trgm_ops);

-- ============ USER SETTINGS ============
create table user_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  notification_prefs jsonb default '{}'::jsonb,
  privacy jsonb default '{
    "post_visibility":"public",
    "who_can_message":"everyone",
    "who_can_find":"everyone",
    "show_activity":true,
    "read_receipts":true
  }'::jsonb,
  playback_prefs jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- ============ FRIENDSHIPS ============
create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references profiles(id) on delete cascade,
  addressee_id uuid references profiles(id) on delete cascade,
  status text not null check (status in ('pending','accepted','blocked')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (requester_id, addressee_id)
);
create index on friendships (requester_id, status);
create index on friendships (addressee_id, status);

-- ============ FOLLOWS ============
create table follows (
  follower_id uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- ============ BLOCKS ============
create table blocks (
  blocker_id uuid references profiles(id) on delete cascade,
  blocked_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

-- ============ POSTS ============
create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) on delete cascade,
  content text check (char_length(content) <= 10000),
  visibility text default 'public' check (visibility in ('public','friends','private','custom')),
  audience jsonb default '[]'::jsonb,
  media jsonb default '[]'::jsonb,
  spotify_uri text,
  youtube_id text,
  poll jsonb,
  feeling text,
  location text,
  tagged_users uuid[] default '{}',
  shared_from uuid references posts(id) on delete set null,
  group_id uuid,
  page_id uuid,
  comments_disabled boolean default false,
  pinned boolean default false,
  hidden boolean default false,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on posts (author_id, created_at desc);
create index on posts (created_at desc) where visibility = 'public';
create index on posts using gin (content gin_trgm_ops);

-- ============ POST REACTIONS ============
create table post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  type text not null check (type in ('like','love','haha','wow','sad','angry')),
  created_at timestamptz default now(),
  unique (post_id, user_id)
);
create index on post_reactions (post_id, type);

-- ============ COMMENTS ============
create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  author_id uuid references profiles(id) on delete cascade,
  parent_id uuid references comments(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  media jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
create index on comments (post_id, created_at);
create index on comments (parent_id);

create table comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid references comments(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  type text not null,
  created_at timestamptz default now(),
  unique (comment_id, user_id)
);

-- ============ SAVES ============
create table saves (
  user_id uuid references profiles(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

-- ============ CONVERSATIONS & MESSAGES ============
create table conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('dm','group')),
  name text,
  avatar_url text,
  created_by uuid references profiles(id) on delete set null,
  last_message_at timestamptz default now(),
  disappearing text default 'off' check (disappearing in ('off','24h','7d','90d')),
  created_at timestamptz default now()
);
create index on conversations (last_message_at desc);

create table conversation_members (
  conversation_id uuid references conversations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz default now(),
  last_read_at timestamptz default now(),
  muted boolean default false,
  archived boolean default false,
  pinned boolean default false,
  deleted_at timestamptz,
  primary key (conversation_id, user_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete set null,
  type text not null default 'text' check (type in
    ('text','image','video','file','voice','sticker','location','system','poll')),
  content text,
  media jsonb,
  reply_to_id uuid references messages(id) on delete set null,
  forwarded_from uuid references messages(id) on delete set null,
  edited_at timestamptz,
  deleted_at timestamptz,
  recalled_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now()
);
create index on messages (conversation_id, created_at desc);
create index on messages (sender_id);

create table message_hidden (
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  hidden_at timestamptz default now(),
  primary key (message_id, user_id)
);

create table message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique (message_id, user_id)
);

-- ============ NOTIFICATIONS ============
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text not null,
  actor_id uuid references profiles(id) on delete set null,
  ref_type text,
  ref_id uuid,
  payload jsonb default '{}'::jsonb,
  read boolean default false,
  created_at timestamptz default now()
);
create index on notifications (user_id, read, created_at desc);

-- ============ TRIGGERS ============
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username',
             'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'full_name',
             new.raw_user_meta_data->>'name',
             'New User'),
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into user_settings (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

create or replace function bump_conversation_last_message()
returns trigger language plpgsql as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end $$;

create trigger trg_bump_conv
after insert on messages
for each row execute function bump_conversation_last_message();

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_posts_updated before update on posts
for each row execute function set_updated_at();

create trigger trg_profiles_updated before update on profiles
for each row execute function set_updated_at();
