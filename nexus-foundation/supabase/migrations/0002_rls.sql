alter table profiles enable row level security;
alter table user_settings enable row level security;
alter table friendships enable row level security;
alter table follows enable row level security;
alter table blocks enable row level security;
alter table posts enable row level security;
alter table post_reactions enable row level security;
alter table comments enable row level security;
alter table comment_reactions enable row level security;
alter table saves enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;
alter table message_hidden enable row level security;
alter table message_reactions enable row level security;
alter table notifications enable row level security;

-- Profiles: everyone can read; user can update own.
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- User settings: own only.
create policy "settings_all_own" on user_settings for all using (auth.uid() = user_id);

-- Friendships: participants read/write.
create policy "friendship_select" on friendships for select
  using (auth.uid() in (requester_id, addressee_id));
create policy "friendship_insert" on friendships for insert
  with check (auth.uid() = requester_id);
create policy "friendship_update" on friendships for update
  using (auth.uid() in (requester_id, addressee_id));
create policy "friendship_delete" on friendships for delete
  using (auth.uid() in (requester_id, addressee_id));

-- Posts: read public/own/friends; hide soft-deleted rows from everyone.
create policy "posts_select" on posts for select using (
  deleted_at is null and (
    visibility = 'public'
    or author_id = auth.uid()
    or (visibility = 'friends' and exists (
        select 1 from friendships f
        where f.status='accepted' and (
          (f.requester_id = auth.uid() and f.addressee_id = author_id) or
          (f.addressee_id = auth.uid() and f.requester_id = author_id))))
  )
);
create policy "posts_insert_own" on posts for insert with check (auth.uid() = author_id);
create policy "posts_update_own" on posts for update using (auth.uid() = author_id);
create policy "posts_delete_own" on posts for delete using (auth.uid() = author_id);

-- Reactions / comments / saves: public read, own write.
create policy "reactions_read" on post_reactions for select using (true);
create policy "reactions_write" on post_reactions for all using (auth.uid() = user_id);
create policy "comments_read" on comments for select using (deleted_at is null);
create policy "comments_write" on comments for insert with check (auth.uid() = author_id);
create policy "comments_update_own" on comments for update using (auth.uid() = author_id);
create policy "comments_delete_own" on comments for delete using (auth.uid() = author_id);
create policy "saves_own" on saves for all using (auth.uid() = user_id);

-- Conversations & messages: members only.
create policy "conv_select" on conversations for select using (
  exists (select 1 from conversation_members m
          where m.conversation_id = id and m.user_id = auth.uid())
);
create policy "conv_insert" on conversations for insert with check (auth.uid() = created_by);
create policy "conv_update" on conversations for update using (
  exists (select 1 from conversation_members m
          where m.conversation_id = id and m.user_id = auth.uid())
);
create policy "cm_select" on conversation_members for select using (
  user_id = auth.uid() or exists (
    select 1 from conversation_members m
    where m.conversation_id = conversation_id and m.user_id = auth.uid())
);
create policy "cm_all_own" on conversation_members for all using (user_id = auth.uid());

create policy "msg_select" on messages for select using (
  exists (select 1 from conversation_members m
          where m.conversation_id = messages.conversation_id
            and m.user_id = auth.uid()
            and m.deleted_at is null)
  and not exists (select 1 from message_hidden h
                  where h.message_id = messages.id and h.user_id = auth.uid())
);
create policy "msg_insert" on messages for insert with check (
  auth.uid() = sender_id and exists (
    select 1 from conversation_members m
    where m.conversation_id = messages.conversation_id and m.user_id = auth.uid())
);
create policy "msg_update_own" on messages for update using (auth.uid() = sender_id);
create policy "msg_delete_own" on messages for delete using (auth.uid() = sender_id);

create policy "msg_hidden_own" on message_hidden for all using (auth.uid() = user_id);
create policy "msg_reactions_read" on message_reactions for select using (true);
create policy "msg_reactions_write" on message_reactions for all using (auth.uid() = user_id);

-- Notifications: own only.
create policy "notif_own" on notifications for all using (auth.uid() = user_id);

-- Recall a message (60-minute window), keeping the row for audit.
create or replace function recall_message(p_message_id uuid)
returns void language plpgsql security definer as $$
declare v_sender uuid; v_created timestamptz;
begin
  select sender_id, created_at into v_sender, v_created
    from messages where id = p_message_id;

  if v_sender <> auth.uid() then raise exception 'Not authorized'; end if;
  if v_created < now() - interval '60 minutes' then
    raise exception 'Recall window expired';
  end if;

  update messages
     set recalled_at = now(), content = null, media = null
   where id = p_message_id;
end $$;
