-- Adds a `branding` JSONB column to pages for Bitly-style image branding
-- Includes logo, cover, background image settings, brand and accent colors

alter table if exists pages
  add column if not exists branding jsonb;

-- Backfill existing rows with an empty object to simplify runtime merging
update pages set branding = '{}'::jsonb where branding is null;

-- Example shape (documentation only):
-- {
--   "logoUrl": null,
--   "coverUrl": null,
--   "brandColor": "#2563eb",
--   "accentColor": "#22c55e",
--   "hero": { "height": 360, "align": "left" },
--   "bg": {
--     "type": "none",
--     "imageUrl": null,
--     "repeat": "no-repeat",
--     "size": "cover",
--     "position": "center",
--     "overlay": { "color": "#000000", "opacity": 0.4 }
--   }
-- }
