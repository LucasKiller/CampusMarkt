-- Feature 009: Send message, mark read, and user conversations RPCs

-- 1. Send Message RPC
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
  v_user_id uuid;
  v_conv record;
  v_message_id uuid;
  v_created_at timestamptz;
  v_trimmed text;
begin
  v_user_id := auth.uid();
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

  v_created_at := transaction_timestamp();

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

revoke all on function marketplace_api.send_message(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.send_message(uuid, text)
  to authenticated, service_role;


-- 2. Mark Conversation Read RPC
create or replace function marketplace_api.mark_conversation_read(
  p_conversation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_conv record;
  v_marked_count integer;
  v_read_at timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_conversation_id is null then
    raise exception 'INVALID_INPUT' using errcode = 'P0004';
  end if;

  select * into v_conv from marketplace.conversations where id = p_conversation_id;
  if not found then
    raise exception 'CONVERSATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_conv.buyer_id <> v_user_id and v_conv.seller_id <> v_user_id then
    raise exception 'FORBIDDEN' using errcode = 'P0005';
  end if;

  v_read_at := transaction_timestamp();

  with updated as (
    update marketplace.messages
       set read_at = v_read_at
     where conversation_id = p_conversation_id
       and sender_id <> v_user_id
       and read_at is null
    returning id
  )
  select count(*) into v_marked_count from updated;

  return jsonb_build_object(
    'conversationId', p_conversation_id,
    'markedCount', v_marked_count,
    'readAt', v_read_at
  );
end;
$$;

revoke all on function marketplace_api.mark_conversation_read(uuid)
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.mark_conversation_read(uuid)
  to authenticated, service_role;


-- 3. Get User Conversations Inbox Projection RPC
create or replace function marketplace_api.get_user_conversations()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_result jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  with conv_data as (
    select
      c.id,
      c.listing_id,
      c.buyer_id,
      c.seller_id,
      c.last_message_at,
      c.created_at,
      c.updated_at,
      case when c.buyer_id = v_user_id then c.seller_id else c.buyer_id end as partner_id,
      coalesce((
        select count(*)::int
          from marketplace.messages m
         where m.conversation_id = c.id
           and m.sender_id <> v_user_id
           and m.read_at is null
      ), 0) as unread_count,
      jsonb_build_object(
        'id', l.id,
        'title', l.title,
        'priceCents', l.price_cents,
        'listingType', l.listing_type,
        'status', l.status,
        'coverImage', (
          select lm.storage_path
            from marketplace.listing_media lm
           where lm.listing_id = l.id
           order by lm.position asc
           limit 1
        )
      ) as listing_info,
      (
        select jsonb_build_object(
          'id', lm.id,
          'content', lm.content,
          'senderId', lm.sender_id,
          'createdAt', lm.created_at,
          'readAt', lm.read_at
        )
        from marketplace.messages lm
        where lm.conversation_id = c.id
        order by lm.created_at desc, lm.id desc
        limit 1
      ) as last_msg_info
    from marketplace.conversations c
    join marketplace.listings l on l.id = c.listing_id
    where c.buyer_id = v_user_id or c.seller_id = v_user_id
    order by c.last_message_at desc
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', cd.id,
        'listingId', cd.listing_id,
        'buyerId', cd.buyer_id,
        'sellerId', cd.seller_id,
        'lastMessageAt', cd.last_message_at,
        'createdAt', cd.created_at,
        'updatedAt', cd.updated_at,
        'unreadCount', cd.unread_count,
        'listing', cd.listing_info,
        'partner', jsonb_build_object(
          'id', cd.partner_id,
          'displayName', coalesce(p.display_name, 'CampusMarkt User'),
          'avatarUrl', case
            when p.avatar_object_key is null or a.public_id is null then null
            else '/media/avatars/' || a.public_id::text || '/' || p.avatar_version::text
          end,
          'universityBadge', case
            when uv.status = 'verified' and uv.expires_at > transaction_timestamp()
            then jsonb_build_object(
              'universityId', uv.university_id,
              'badgeLabel', case
                when uv.university_id = 'tu-braunschweig' then 'TU Braunschweig'
                when uv.university_id = 'ostfalia' then 'Ostfalia HAW'
                when uv.university_id = 'hbk-bs' then 'HBK Braunschweig'
                else uv.university_id
              end
            )
            else null
          end
        ),
        'lastMessage', cd.last_msg_info
      )
    ),
    '[]'::jsonb
  ) into v_result
  from conv_data cd
  left join identity.accounts a on a.auth_user_id = cd.partner_id
  left join identity.profiles p on p.auth_user_id = cd.partner_id
  left join identity.university_verifications uv on uv.auth_user_id = cd.partner_id;

  return v_result;
end;
$$;

revoke all on function marketplace_api.get_user_conversations()
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.get_user_conversations()
  to authenticated, service_role;
