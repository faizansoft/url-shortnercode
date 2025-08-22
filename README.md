This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Cloudflare Pages (Next on Pages)

This project is configured to deploy on Cloudflare Pages using Next on Pages.

### Build locally

```bash
npm run cf:build
# optional local preview (requires Wrangler via npx):
npm run cf:preview
```

### Configure Cloudflare Pages

In Cloudflare Pages project settings:

1. Build command: `npm run cf:build`
2. Output directory: `.vercel/output/static`
3. Environment variables (Production and Preview):
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service role key

The API routes are set to run on the Edge runtime.

## Geolocation & Engagement (New)

- Geolocation: `src/lib/geo.ts` uses ipwho.is (no API key) with a 1h in-memory TTL cache. Called from `src/app/[code]/route.ts` to enrich clicks.
- Engagement: `src/app/api/engagement/route.ts` accepts POST beacons for session timing and funnel events.
- Analytics API `src/app/api/analytics/route.ts` now aggregates engagement: Avg Time on Page (sec), Bounce Rate (%), and Funnel counts.

### Supabase Schema (SQL)

Run these SQL statements in your Supabase project (SQL editor). They are additive and safe to run multiple times with IF NOT EXISTS.

```sql
-- Minimal clicks table (if you don't already have one)
create table if not exists public.clicks (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null,
  created_at timestamptz default now(),
  referrer text,
  ip text,
  ua text
);
create index if not exists idx_clicks_link_id on public.clicks(link_id);

-- Geo enrichment table
create table if not exists public.click_geo (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null,
  ip text,
  country text,
  region text,
  city text,
  latitude double precision,
  longitude double precision,
  org text,
  asn text,
  created_at timestamptz default now()
);
create index if not exists idx_click_geo_link_id on public.click_geo(link_id);
create index if not exists idx_click_geo_ip on public.click_geo(ip);

-- Engagement sessions (for Avg Time on Page and Bounce Rate)
create table if not exists public.engagement_sessions (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null,
  session_id text not null,
  started_at timestamptz,
  ended_at timestamptz,
  duration_ms bigint,
  bounced boolean default false,
  inserted_at timestamptz default now(),
  unique (link_id, session_id)
);
create index if not exists idx_engagement_sessions_link_id on public.engagement_sessions(link_id);

-- Funnel events (conversion funnel)
create table if not exists public.funnel_events (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null,
  session_id text not null,
  step text not null,
  ts timestamptz default now()
);
create index if not exists idx_funnel_events_link_id on public.funnel_events(link_id);
create index if not exists idx_funnel_events_step on public.funnel_events(step);
```

### Client beacons (example)

Send engagement beacons from any page where you want to measure engagement:

```ts
// Example: send a session summary on unload
async function sendSessionSummary(link_code: string, session_id: string, startedAt: number) {
  const duration_ms = Date.now() - startedAt;
  const bounced = duration_ms < 5000; // customize threshold
  navigator.sendBeacon(
    '/api/engagement',
    new Blob([
      JSON.stringify({ type: 'session', link_code, session_id, duration_ms, bounced, started_at: new Date(startedAt).toISOString(), ended_at: new Date().toISOString() })
    ], { type: 'application/json' })
  );
}

// Example: record a funnel step
async function recordFunnelStep(link_code: string, session_id: string, step: string) {
  await fetch('/api/engagement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'event', link_code, session_id, step })
  });
}
```

You can also implement an interstitial page to better track time-on-page before redirecting (optional).

## Pages Themes (Customization)

Pages now support a customizable theme (colors, gradient, fonts, radius, layout) stored per page in a `theme` JSONB column.

### Database migration

Run the provided migration to add the column (idempotent):

```sql
alter table if exists public.pages
  add column if not exists theme jsonb;

update public.pages set theme = '{}'::jsonb where theme is null;
```

The migration file is in `scripts/20250822_add_theme_column.sql`.

Example ways to apply:

- psql:
  ```bash
  psql "$SUPABASE_DB_URL" -f scripts/20250822_add_theme_column.sql
  ```
- Supabase SQL editor: paste the SQL content and run.

### Editor UI

In `Dashboard > Pages > Edit`, use the Theme panel to:

- Presets: quickly apply curated themes
- Colors: primary, secondary, surface, foreground
- Gradient: angle and multi-stop editor (add/remove stops)
- Fonts: choose System, Inter, Poppins, Outfit, Merriweather, Space Grotesk, Lora
- Font size and weight
- Layout: radius, max width, alignment

Click "Save Theme" to persist.

### Public rendering and Google Fonts

Public pages (`src/app/p/[slug]/page.tsx`) read the `theme` and apply CSS variables for palette, gradient, fonts, radius, and layout. When a Google Font is selected, the page injects the appropriate `<link>` to Google Fonts at runtime to load the font family.

No extra config is required; ensure outbound access is allowed so the font CSS can be fetched from `fonts.googleapis.com`.
