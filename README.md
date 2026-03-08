# SuperSpin — Faza 2

## Setup

### 1. Instaliraj dependencies
```bash
npm install
```

### 2. Supabase setup
- Idi na Supabase → SQL Editor
- Pokreni sadržaj fajla `supabase-schema.sql`
- Idi na Authentication → Providers → Twitter/X
- Unesi X API Key i Secret:
  - API Key: `NWxsc0Z0d3Nsc2JSVi1MdmRVWVA6MTpjaQ`
  - API Secret: (tvoj secret)
- Redirect URL koji trebaš dodati u X Developer Portal:
  `https://wgcpdjtzywxaseyjpiih.supabase.co/auth/v1/callback`

### 3. X Developer Portal setup
- Idi na developer.twitter.com → tvoja app
- U "User authentication settings" dodaj callback URL:
  `https://wgcpdjtzywxaseyjpiih.supabase.co/auth/v1/callback`

### 4. Pokreni lokalno
```bash
npm run dev
```
Otvori http://localhost:3000

### 5. Deploy na Cloudflare Pages
- Idi na Cloudflare Dashboard → Workers & Pages → Create → Pages
- Poveži GitHub repo ili uploadaj build
- Build command: `npm run build`
- Build output: `.next`
- Environment variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://wgcpdjtzywxaseyjpiih.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  NEXT_PUBLIC_SITE_URL=https://superspin.online
  ```

### 6. Nakon deploya
- Ažuriraj `.env.local`: `NEXT_PUBLIC_SITE_URL=https://superspin.online`
- U Supabase → Authentication → URL Configuration:
  - Site URL: `https://superspin.online`
  - Redirect URLs: `https://superspin.online/auth/callback`

## Struktura projekta
```
app/
  page.tsx              — Main page (Giveaway lista)
  layout.tsx            — Root layout
  globals.css           — Globalni stilovi
  giveaway/[id]/
    page.tsx            — Stranica giveawaya
  spinner/
    page.tsx            — Spinner (Faza 1 port)
  auth/callback/
    route.ts            — OAuth callback
components/
  Navbar.tsx            — Navigacija
  Footer.tsx            — Footer (Powered by / Created by)
  CreateGiveawayModal.tsx — Modal za kreiranje giveawaya
lib/
  supabase.ts           — Browser Supabase client
  supabase-server.ts    — Server Supabase client
  db.ts                 — Database helper funkcije
types/
  index.ts              — TypeScript tipovi
```

## Što dolazi kasnije
- @superspinonline X nalog → automatski video post
- X API v2 media upload integracija
