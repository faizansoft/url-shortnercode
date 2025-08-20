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
