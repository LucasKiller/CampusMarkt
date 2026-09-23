# Feature Design: 007-favorites (Private Favorites)

## 1. Architectural Context & Decisions

CampusMarkt adheres to a modular monolith architecture (AD-006) with decoupled domain packages (`@campusmarkt/domain`, `@campusmarkt/types`, `@campusmarkt/validation`), a Supabase/PostgreSQL backend (`marketplace` and `marketplace_api` schemas), and a Next.js App Router web application (`apps/web`).

### Key Decisions
- **AD-003**: Marketplace rules live outside page components in transport-neutral application/domain packages.
- **AD-006**: Self-hosted Supabase stack on a single budget VPS; keep database queries bounded and efficient.
- **AD-012**: Decoupled client-side hydration via `GET /api/marketplace/favorites/ids` micro-endpoint and asynchronous leaf client components, preserving 100% public edge-caching (`s-maxage=30`) for the discovery feed and search RPCs without authorization-dependent cache fragmentation.

---

## 2. Domain Model & Invariants

```
+-------------------------------------------------------------+
|                          Account                            |
|                        (auth.users)                         |
+-------------------------------------------------------------+
                              | 1
                              |
                              | 0..*
+-------------------------------------------------------------+
|                          Favorite                           |
|                    (marketplace.favorites)                  |
|-------------------------------------------------------------|
| - user_id: UUID (PK, FK -> auth.users)                      |
| - listing_id: UUID (PK, FK -> marketplace.listings)        |
| - created_at: TIMESTAMPTZ (DEFAULT now())                   |
+-------------------------------------------------------------+
                              | 0..*
                              |
                              | 1
+-------------------------------------------------------------+
|                          Listing                            |
|                   (marketplace.listings)                    |
|-------------------------------------------------------------|
| - id: UUID                                                  |
| - seller_id: UUID                                           |
| - status: listing_status ('active'|'reserved'|'sold'|...)   |
+-------------------------------------------------------------+
```

### Invariants:
1. **Self-Favorite Prohibition**: `user_id <> listing.seller_id`. A user cannot save their own listing. Attempting to do so fails at the database RPC and service boundary.
2. **Natural 1:1 Uniqueness**: Composite primary key `(user_id, listing_id)` makes duplicate saves impossible.
3. **Availability Neutrality**: Favoriting does not reserve, hold, or lock a listing.
4. **Owner-Only Privacy**: Only the owning `user_id` can query, insert, or delete their favorites. No public counts or cross-user visibility.

---

## 3. Database Layer & Migrations

### 3.1 Migration: `20260923210000_marketplace_favorites.sql`

```sql
create table if not exists marketplace.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references marketplace.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- Index for ordering a user's favorites by save date
create index if not exists idx_marketplace_favorites_user_created 
  on marketplace.favorites(user_id, created_at desc);

-- Index for reverse lookup on listing deletions/status
create index if not exists idx_marketplace_favorites_listing 
  on marketplace.favorites(listing_id);

-- Enable Row-Level Security
alter table marketplace.favorites enable row level security;

-- RLS Policies: strictly owner-scoped
create policy "Users can view own favorites"
  on marketplace.favorites for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own favorites"
  on marketplace.favorites for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own favorites"
  on marketplace.favorites for delete
  to authenticated
  using (auth.uid() = user_id);
```

### 3.2 Migration: `20260923211000_marketplace_favorites_rpcs.sql`

```sql
-- 1. Toggle favorite RPC
create or replace function marketplace_api.toggle_favorite(
  p_listing_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_user_id uuid;
  v_seller_id uuid;
  v_listing_status marketplace.listing_status;
  v_exists boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  -- Verify listing exists and is not archived
  select seller_id, status
    into v_seller_id, v_listing_status
    from marketplace.listings
   where id = p_listing_id;

  if not found or v_listing_status = 'archived' then
    raise exception 'LISTING_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Invariant: cannot favorite own listing
  if v_seller_id = v_user_id then
    raise exception 'CANNOT_FAVORITE_OWN_LISTING' using errcode = 'P0003';
  end if;

  -- Check current favorite state
  select exists(
    select 1 from marketplace.favorites
     where user_id = v_user_id and listing_id = p_listing_id
  ) into v_exists;

  if v_exists then
    delete from marketplace.favorites
     where user_id = v_user_id and listing_id = p_listing_id;
    return jsonb_build_object('isFavorited', false, 'listingId', p_listing_id);
  else
    insert into marketplace.favorites (user_id, listing_id, created_at)
    values (v_user_id, p_listing_id, now())
    on conflict do nothing;
    return jsonb_build_object('isFavorited', true, 'listingId', p_listing_id);
  end if;
end;
$$;

-- 2. Get user favorite IDs (for client hydration, AD-012)
create or replace function marketplace_api.get_user_favorite_ids()
returns text[]
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_user_id uuid;
  v_ids text[];
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return array[]::text[];
  end if;

  select coalesce(array_agg(f.listing_id::text order by f.created_at desc), array[]::text[])
    into v_ids
    from marketplace.favorites f
    join marketplace.listings l on l.id = f.listing_id
   where f.user_id = v_user_id
     and l.status <> 'archived';

  return v_ids;
end;
$$;

-- 3. Get user favorites dashboard listings
create or replace function marketplace_api.get_user_favorites(
  p_cursor_created_at timestamptz default null,
  p_cursor_listing_id uuid default null,
  p_limit int default 20
)
returns table (
  listing_id uuid,
  listing_type marketplace.listing_type,
  title text,
  price_cents integer,
  category marketplace.listing_category,
  pickup_area marketplace.pickup_area,
  condition marketplace.item_condition,
  status marketplace.listing_status,
  created_at timestamptz,
  cover_image text,
  seller_id uuid,
  seller_display_name text,
  seller_avatar_url text,
  seller_verified boolean,
  seller_institution text,
  favorited_at timestamptz
)
language plpgsql
security definer
set search_path = public, marketplace, identity, auth
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  return query
  select
    l.id as listing_id,
    l.listing_type,
    l.title,
    l.price_cents,
    l.category,
    l.pickup_area,
    l.condition,
    l.status,
    l.created_at,
    (
      select lm.storage_path
        from marketplace.listing_media lm
       where lm.listing_id = l.id
       order by lm.display_order asc
       limit 1
    ) as cover_image,
    p.user_id as seller_id,
    p.display_name as seller_display_name,
    p.avatar_path as seller_avatar_url,
    case
      when uv.user_id is not null
       and uv.expires_at > now()
      then true
      else false
    end as seller_verified,
    case
      when uv.user_id is not null
       and uv.expires_at > now()
      then uv.institution
      else null
    end as seller_institution,
    f.created_at as favorited_at
  from marketplace.favorites f
  join marketplace.listings l on l.id = f.listing_id
  join identity.profiles p on p.user_id = l.seller_id
  left join identity.university_verifications uv on uv.user_id = l.seller_id
  where f.user_id = v_user_id
    and l.status <> 'archived'
    and (
      p_cursor_created_at is null
      or (f.created_at, f.listing_id) < (p_cursor_created_at, p_cursor_listing_id)
    )
  order by f.created_at desc, f.listing_id desc
  limit least(coalesce(p_limit, 20), 50);
end;
$$;
```

---

## 4. Application & API Layer

### 4.1 TypeScript Types (`packages/types/src/listings/favorites.ts`)
- `FavoriteToggleResponse`: `{ isFavorited: boolean; listingId: string; }`
- `FavoriteFeedItem`: Extends `PublicFeedItem` with `favoritedAt: string` and allows statuses `active | reserved | sold`.
- `FavoritesListResponse`: `{ items: FavoriteFeedItem[]; nextCursor: string | null; }`

### 4.2 Application Service (`MarketplaceFavoritesService`)
- Enforces rate limiting: 30 toggle actions per minute per user via `consumeRateLimits`.
- Self-favorite validation guard.
- Emits structured telemetry: `favorite.toggled`, `favorite.removed`.

### 4.3 HTTP Routes (`apps/web/src/app/api/marketplace/favorites/`)
- `POST /api/marketplace/favorites/[id]`: Toggle favorite for the target listing ID. Returns `{ ok: true, data: { isFavorited, listingId } }`.
- `GET /api/marketplace/favorites/ids`: Authenticated route returning string array of user's active favorite listing IDs.
- `GET /api/marketplace/favorites`: Returns user's saved items with cursor-based pagination.

---

## 5. UI Components & Client Architecture

```
                                  [App Layout]
                                       |
                           +-----------+-----------+
                           |                       |
                     [Feed / Search]         [/favorites]
                           |                       |
                 +---------+---------+    [FavoritesDashboard]
                 |                   |             |
           [ListingCard]       [ListingCard]  [ListingCard]
                 |                   |             |
           [FavoriteButton]   [FavoriteButton][FavoriteButton]
                 ^                   ^             ^
                 |                   |             |
         +-------------------------------------------------+
         |             FavoritesContext / Store            |
         |  - favoriteIds: Set<string>                     |
         |  - toggleFavorite(listingId): Promise<boolean>  |
         |  - BroadcastChannel('cm_favorites') sync       |
         +-------------------------------------------------+
```

- **`FavoriteButton` (Client Island)**:
  - Accessible button with `aria-pressed`, `aria-label`, and SVG heart icon (filled when true, outlined when false).
  - Optimistic state update with instant UI response (<50ms).
  - Unauthenticated visitors clicking the button are navigated to `/login?next=...`.
  - Leaf Client Component island, keeping parent `ListingCard` and `ListingDetails` as React Server Components.
- **Favorites Dashboard (`/favorites`)**:
  - Grid of saved listings with quick-remove action and undo toast.
  - Visual status chips: "RESERVIERT" (amber) and "VERKAUFT" (neutral) on items that are no longer active.
  - Empty state with CTA linking to `/feed`.

---

## 6. Security, Privacy & Constraints

- **Zero Public Leakage**: The database RPCs and API endpoints never return listing favorite counts to third parties.
- **No PII Exposure**: Responses only include public display names, avatars, and verified trust badges; no private emails or internal hashes.
- **Cascades & Data Minimization**: Account deletion purges all favorites automatically via foreign key cascade (`ON DELETE CASCADE`).
- **Resource Protection**: Maximum 30 toggle mutations per minute per user prevents spam/DoS on the budget VPS.
