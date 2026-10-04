-- Read private messages through the exposed API schema without exposing the
-- marketplace table itself. The caller's JWT supplies auth.uid().
create function marketplace_api.get_messages(
  p_conversation_id uuid,
  p_before text default null,
  p_after text default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_cursor_at timestamptz;
  v_cursor_id uuid;
  v_cursor text;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_conversation_id is null or p_limit is null or p_limit < 1 or p_limit > 101
     or (p_before is not null and p_after is not null) then
    raise exception 'INVALID_INPUT' using errcode = 'P0004';
  end if;

  if not exists (
    select 1 from marketplace.conversations c
    where c.id = p_conversation_id
      and (c.buyer_id = v_user_id or c.seller_id = v_user_id)
  ) then
    raise exception 'CONVERSATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_cursor := coalesce(p_before, p_after);
  if v_cursor is not null then
    if v_cursor ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      v_cursor_id := v_cursor::uuid;
      select m.created_at into v_cursor_at
      from marketplace.messages m
      where m.id = v_cursor_id and m.conversation_id = p_conversation_id;
      if not found then
        raise exception 'INVALID_INPUT' using errcode = 'P0004';
      end if;
    else
      v_cursor_at := v_cursor::timestamptz;
    end if;
  end if;

  if p_after is not null then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'conversationId', m.conversation_id,
          'senderId', m.sender_id,
          'content', m.content,
          'createdAt', m.created_at,
          'readAt', m.read_at
        ) order by m.created_at asc, m.id asc
      ), '[]'::jsonb
    ) into v_result
    from (
      select id, conversation_id, sender_id, content, created_at, read_at
      from marketplace.messages
      where conversation_id = p_conversation_id
        and (
          (v_cursor_id is null and (created_at > v_cursor_at))
          or (v_cursor_id is not null and (created_at, id) > (v_cursor_at, v_cursor_id))
        )
      order by created_at asc, id asc
      limit p_limit
    ) m;
  else
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'conversationId', m.conversation_id,
          'senderId', m.sender_id,
          'content', m.content,
          'createdAt', m.created_at,
          'readAt', m.read_at
        ) order by m.created_at desc, m.id desc
      ), '[]'::jsonb
    ) into v_result
    from (
      select id, conversation_id, sender_id, content, created_at, read_at
      from marketplace.messages
      where conversation_id = p_conversation_id
        and (
          p_before is null
          or (v_cursor_id is null and created_at < v_cursor_at)
          or (v_cursor_id is not null and (created_at, id) < (v_cursor_at, v_cursor_id))
        )
      order by created_at desc, id desc
      limit p_limit
    ) m;
  end if;

  return v_result;
exception
  when invalid_datetime_format or datetime_field_overflow then
    raise exception 'INVALID_INPUT' using errcode = 'P0004';
end;
$$;

revoke all on function marketplace_api.get_messages(uuid, text, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.get_messages(uuid, text, text, integer)
  to authenticated;

-- The web service is request-scoped, so its in-memory counter cannot protect
-- separate requests or replicas. Enforce the existing 30/minute rule in the
-- same transaction that inserts the message.
create index if not exists idx_messages_sender_recent
  on marketplace.messages (sender_id, created_at desc);

create or replace function marketplace_api.send_message(
  p_conversation_id uuid,
  p_content text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_conv record;
  v_message_id uuid;
  v_created_at timestamptz;
  v_trimmed text;
  v_recent_count integer;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_conversation_id is null or p_content is null then
    raise exception 'INVALID_INPUT' using errcode = 'P0004';
  end if;

  v_trimmed := trim(p_content);
  if char_length(v_trimmed) = 0 or char_length(p_content) > 2000 then
    raise exception 'INVALID_MESSAGE_CONTENT' using errcode = 'P0004';
  end if;

  select * into v_conv from marketplace.conversations where id = p_conversation_id;
  if not found then
    raise exception 'CONVERSATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_conv.buyer_id <> v_user_id and v_conv.seller_id <> v_user_id then
    raise exception 'FORBIDDEN' using errcode = 'P0005';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );
  v_created_at := clock_timestamp();
  select count(*) into v_recent_count
  from marketplace.messages
  where sender_id = v_user_id
    and created_at > v_created_at - interval '1 minute';
  if v_recent_count >= 30 then
    raise exception 'RATE_LIMIT_EXCEEDED' using errcode = 'P0006';
  end if;

  insert into marketplace.messages (
    conversation_id, sender_id, content, created_at
  ) values (
    p_conversation_id, v_user_id, v_trimmed, v_created_at
  ) returning id into v_message_id;

  update marketplace.conversations
     set last_message_at = v_created_at, updated_at = v_created_at
   where id = p_conversation_id;

  return jsonb_build_object(
    'messageId', v_message_id,
    'id', v_message_id,
    'conversationId', p_conversation_id,
    'senderId', v_user_id,
    'content', v_trimmed,
    'createdAt', v_created_at,
    'readAt', null
  );
end;
$$;
