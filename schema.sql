-- ═══════════════════════════════════════════════════════════════════════════
-- BCSS Newspaper — Supabase schema
-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Table ───────────────────────────────────────────────────────────────────
create table if not exists public.issues (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 200),
  slug         text not null unique,
  description  text,
  published_at timestamptz,                 -- issue date; null = undated draft
  pdf_path     text not null,               -- e.g. 'pdfs/<uuid>.pdf'
  cover_path   text,                        -- e.g. 'covers/<uuid>.png'; nullable
  is_published boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists issues_published_idx
  on public.issues (is_published, published_at desc);

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.issues enable row level security;

-- SELECT: anonymous visitors may read PUBLISHED issues only. The
-- authenticated admin can read everything (needed for the dashboard).
--
-- Deliberately stricter than "SELECT for everyone": with a fully open SELECT,
-- unpublished rows (and their pdf_path) would be anonymously readable and
-- unpublishing would be cosmetic.
create policy "issues_select_published_or_admin"
  on public.issues for select
  using (is_published = true or auth.role() = 'authenticated');

-- Writes: authenticated users only. (Signup is disabled in Auth settings, so
-- in practice this is just the single admin account created in the dashboard.)
create policy "issues_insert_admin"
  on public.issues for insert to authenticated
  with check (true);

create policy "issues_update_admin"
  on public.issues for update to authenticated
  using (true) with check (true);

create policy "issues_delete_admin"
  on public.issues for delete to authenticated
  using (true);

-- OPTIONAL HARDENING — pin writes to one specific admin user.
-- Find the UID in Authentication → Users, then replace the three write
-- policies above, e.g.:
--
--   drop policy "issues_insert_admin" on public.issues;
--   create policy "issues_insert_admin" on public.issues for insert
--     to authenticated with check (auth.uid() = 'PASTE-ADMIN-UUID-HERE');
--   -- repeat for update/delete

-- ── Storage bucket ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'issues',
  'issues',
  true,                          -- public read bucket (see README caveat)
  52428800,                      -- 50 MB server-side cap
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- ── Storage RLS ─────────────────────────────────────────────────────────────
-- The bucket is `public`, so /object/public/ URLs serve files with no policy
-- check — that's what readers' <img>/<pdf> requests use. But the storage API
-- (object LISTING, authenticated download endpoints) does consult this SELECT
-- policy: restricting it to `authenticated` means anonymous visitors can fetch
-- a file only if they already know its exact UUID URL — they cannot enumerate
-- the bucket to discover drafts.
create policy "issues_storage_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'issues');

-- Writes only by the signed-in admin, and only under the pdfs/ or covers/
-- top-level folders.
create policy "issues_storage_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'issues'
    and (storage.foldername(name))[1] in ('pdfs', 'covers')
  );

create policy "issues_storage_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'issues')
  with check (
    bucket_id = 'issues'
    and (storage.foldername(name))[1] in ('pdfs', 'covers')
  );

create policy "issues_storage_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'issues');
