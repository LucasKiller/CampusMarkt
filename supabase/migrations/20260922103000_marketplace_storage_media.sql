-- 1. Create and configure listing-media bucket
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'listing-media',
  'listing-media',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Public read access policy for listing-media
create policy "Public can view listing media"
  on storage.objects for select
  using ( bucket_id = 'listing-media' );

-- 3. Authenticated owner upload policy with designated path prefix
create policy "Authenticated users can upload listing media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-media'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or name like auth.uid()::text || '/%'
      or name like 'listings/' || auth.uid()::text || '/%'
    )
  );

-- 4. Authenticated owner update policy
create policy "Authenticated users can update own listing media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'listing-media'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or name like auth.uid()::text || '/%'
      or name like 'listings/' || auth.uid()::text || '/%'
    )
  )
  with check (
    bucket_id = 'listing-media'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or name like auth.uid()::text || '/%'
      or name like 'listings/' || auth.uid()::text || '/%'
    )
  );

-- 5. Authenticated owner delete policy
create policy "Authenticated users can delete own listing media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-media'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or name like auth.uid()::text || '/%'
      or name like 'listings/' || auth.uid()::text || '/%'
    )
  );
