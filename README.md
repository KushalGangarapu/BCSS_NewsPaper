# BCSS Newspaper

The official student newspaper of **Burnaby Central Secondary School** —
a fast, mobile-friendly editorial site where the paper's issues are published
as PDFs and read right in the browser.

**Next.js 16** (App Router · Turbopack) · **TypeScript** · **Tailwind CSS v4** ·
**Supabase** (Auth + Postgres + Storage) · **PDF.js** · **Vercel**

---

## Features

- **In-browser PDF reader** — no downloads required. Page turning via buttons,
  arrow keys, or page-jump; fit-width / zoom controls; renders at full
  device-pixel-ratio sharpness.
- **Issue archive** — every published issue, automatically grouped by school
  year (September → August).
- **Auto-generated covers** — the admin never designs a thumbnail; page 1 of
  the PDF is rasterized into a cover on upload (custom image optional).
- **One-editor admin** — `/admin` dashboard to upload, publish, unpublish,
  edit, and delete issues. Signup is disabled; a single account exists.
- **50 MB PDFs on a 4.5 MB platform** — uploads go browser → Supabase Storage
  directly, bypassing Vercel's request-body limit entirely. The API then
  re-validates the *stored bytes* (magic bytes, size, path shape) before
  writing any database row.
- **Hardened by default** — Postgres Row Level Security on every table and
  bucket policy, generic login errors, strict CSP headers, and drafts that are
  genuinely invisible to anonymous readers.
- **Fully responsive** — mobile-first layout that works on phones, tablets,
  laptops, and desktops.

## Quick start

**Prerequisites:** [Node.js 20.9+](https://nodejs.org) and npm.

```bash
git clone https://github.com/KushalGangarapu/BCSS-Newspaper.git
cd BCSS-Newspaper
npm install
```

Copy `.env.example` → `.env.local` and fill in your Supabase values (next
section), then:

```bash
npm run dev                  # http://localhost:3000
```

The site renders a friendly "setup required" notice until the Supabase env
vars are filled in — so cloning always works, even before configuration.

## Supabase setup (one time, ~10 minutes)

1. Create a free project at [supabase.com](https://supabase.com)
   (**New project** → any name, pick a region, save the DB password).
2. **SQL Editor → New query** → paste all of [`schema.sql`](./schema.sql) →
   **Run**. Creates the `issues` table, the `issues` storage bucket, and every
   security policy.
3. **Authentication → Users → Add user** — the editor's email + a strong
   password, with **Auto Confirm User** checked.
4. **Authentication → Sign In / Providers** — turn **off** "Allow new users to
   sign up". The editor account is now the only one that can ever exist.
5. **Project Settings → API Keys** — copy the **Project URL** and the
   **publishable/anon** key into `.env.local` (and later into Vercel).

## Environment variables

| Variable | Used by | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | ✅ |
| `NEXT_PUBLIC_SITE_URL` | metadata/sitemap only | Optional |
| `SUPABASE_SERVICE_ROLE_KEY` | server only — reserved; current code intentionally unused | Optional |

> The anon key is safe to expose — RLS protects the data. The service-role key
> bypasses RLS, so it must **never** be prefixed with `NEXT_PUBLIC_`.

## Deploy (Vercel)

1. Import this repo at [vercel.com](https://vercel.com) — Next.js is
   auto-detected, no build settings needed.
2. Add the env vars above in **Project → Settings → Environment Variables**.
3. Deploy, then set `NEXT_PUBLIC_SITE_URL` to your production domain and
   redeploy once (for correct sitemap/OG URLs).

## Editor's guide

1. Visit `/admin` (or the **Staff login** footer link) and sign in.
2. **New issue** → title (slug auto-fills — it becomes the URL), optional
   date + description, choose the PDF (≤ 50 MB).
3. Cover defaults to **Generate from page 1** — or upload a PNG/JPG/WebP
   (≤ 10 MB), or none.
4. Check **Publish immediately**, or publish later from the dashboard.
   Edit, unpublish, or delete anytime — deleting removes the files too.
5. Site text (Instagram handle, submit-page copy) lives in
   **[`src/lib/site.ts`](./src/lib/site.ts)** — the one file meant to be
   edited; it's commented throughout.

## Security model

- **RLS everywhere:** anon readers see `is_published = true` only — drafts are
  invisible at the database layer, not just hidden in the UI. Writes require
  `authenticated`. `schema.sql` includes a commented example for pinning
  writes to a single user UUID.
- **Storage:** public-read bucket (public URLs serve files directly), but
  writes *and bucket listing* are authenticated-only — anonymous visitors can't
  enumerate the bucket; a draft is reachable only by its unguessable UUID URL.
  Filenames are random UUIDs under `pdfs/` + `covers/` folders.
- **Server re-validation:** route handlers fetch each uploaded object
  (`HEAD` for size, `Range: bytes=0-15` for magic bytes) and reject bad files
  with 422 — and clean up the orphan.
- **Real auth boundary:** the admin layout and every API handler independently
  verify the session; `proxy.ts` redirects are UX, not the guard.
- **Headers:** strict CSP (jsdelivr for PDF.js, Supabase for API/media),
  `X-Frame-Options`, `nosniff`, `Referrer-Policy`.

**Known caveat:** the bucket is public, so an unpublished PDF is reachable via
its unguessable UUID URL. Don't upload anything sensitive before it's meant to
be public. (A private bucket + signed URLs was rejected: it breaks plain
`<img>` covers and adds complexity.)

## Project layout

```
schema.sql                  — run once in the Supabase SQL editor
src/lib/site.ts             — ★ edit this for Instagram handle + site copy
src/lib/files.ts            — size caps, magic-byte sniffing, storage paths
src/lib/storage-verify.ts   — server-side re-validation of stored bytes
src/lib/pdfjs.ts            — lazy pinned CDN loader for PDF.js
src/lib/supabase/           — browser / server / session clients
src/proxy.ts                — session refresh + /admin redirect
src/app/api/admin/issues/   — POST / PATCH / DELETE
src/app/admin/              — login + (panel) dashboard + issue form
src/app/issues/[slug]/      — public issue page + PDF reader
src/components/             — masthead, header/footer, reader, admin widgets
```
