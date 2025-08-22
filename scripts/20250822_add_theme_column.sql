-- Add theme column to pages table
-- Safe to run multiple times
alter table if exists public.pages
  add column if not exists theme jsonb;

-- Optional: set default empty object for nulls
update public.pages set theme = '{}'::jsonb where theme is null;

-- Index (optional) if you plan to filter by theme keys often
-- create index if not exists idx_pages_theme on public.pages using gin (theme);
