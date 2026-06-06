# Shahjalal Wholesale — Inventory & Order Management

An inventory and order‑management web app (PWA) for a **UK wholesale warehouse**.
It manages the product catalogue and stock levels, keeps track of shops, runs
the full order lifecycle — orders are created as *pending*, then confirmed (which
deducts stock) — and generates PDF invoices, with a dashboard for stock and
revenue.

Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**,
**Tailwind v4 / shadcn‑ui**, and **Supabase** (Postgres + Auth + Storage + SQL
functions).

> **The app lives in [`my-app/`](./my-app).**

## 🔎 Live demo

### **[wholesaleinventorywebappdemo.vercel.app](https://wholesaleinventorywebappdemo.vercel.app/)**

No login required. The demo runs entirely in your browser with realistic sample
data (London shops, GBP pricing). Add items, place and confirm orders, export
invoices — your changes stay in your browser, and a **Reset demo** button
restores the original data at any time. It uses **no backend**, so it’s free to
host and cannot affect any real data.

> The real app (used by the client) is the same codebase deployed separately
> with a Supabase backend and email/password login. Demo mode is toggled by a
> single environment variable and is completely isolated from the real app.

## How it works

1. **Stock the catalogue** — categories and inventory items (price, quantity,
   expiry date, photo).
2. **Add your shops** — the businesses you sell to, with contact details and
   opening hours.
3. **Take an order** — browse products by category, build a basket for a
   shop, and adjust quantities and per‑line discounts. Submitting creates a
   **pending** order (no stock moved yet).
4. **Confirm or edit** — confirming validates stock, **deducts it**, and marks
   the order **completed**; pending orders can still be edited or cancelled.
5. **Invoice** — export a PDF invoice for the shop.
6. **Track** — the dashboard shows revenue (from completed orders), low‑stock
   alerts, shop count, and recent activity.

> **Why two steps?** Keeping orders *pending* until confirmed means stock isn’t
> drawn down for baskets still being negotiated or that might be cancelled — and
> revenue only counts once an order is actually fulfilled.

## Features

- **Dashboard** — inventory totals, stock levels, low‑stock alerts, shop
  count, revenue, and recent orders.
- **Inventory** — full CRUD with categories, expiry dates, search/filter, and
  image upload (client‑side compression to WebP).
- **Categories & shops** — CRUD with safe‑delete guards (you can’t delete a
  category that still has items, or a shop that has orders).
- **Products & ordering** — browse the catalogue, build a cart with per‑line
  discounts, and create an order. Orders start **pending**; **confirming** one
  validates and deducts stock and marks it **completed**. Pending orders can be
  edited or cancelled.
- **Invoices** — generate a PDF invoice for any order.
- **PWA** — installable, with a service worker and offline‑friendly shell.
- **Demo mode** — a backend‑free, no‑login sandbox seeded with sample data.

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| UI | React 19, Tailwind CSS v4, shadcn‑ui (Radix), lucide‑react |
| Backend | Supabase — Postgres, Auth (`@supabase/ssr`), Storage, SQL functions |
| PDF / images | jsPDF + jspdf‑autotable, browser‑image‑compression, sharp |
| Testing | Vitest (143 tests) |
| Hosting | Vercel |

## Engineering highlights

- **Dual‑backend architecture (data‑adapter pattern).** The same UI runs against
  a real Supabase/Postgres backend *or* a fully in‑browser store, switched by one
  environment flag — via a clean seam (typed Server Actions for reads,
  `lib/data` write facades, a `useSyncExternalStore` hook) with **zero UI
  changes**. The demo ships with no credentials, so it’s provably isolated from
  real data.
- **Transactional, race‑safe order lifecycle in Postgres.** Orders move
  pending → confirmed through `SECURITY DEFINER` SQL functions that validate and
  deduct stock **under row locks (`SELECT … FOR UPDATE`) to prevent
  overselling**, with server‑side aggregates for revenue and stats.
- **Modern Next.js App Router data flow.** Server Components fetch through a
  single, typed Server‑Actions data layer; mutations re‑render server state —
  **end‑to‑end TypeScript** with shared domain types.
- **Security in depth.** Supabase Auth with cookie‑based SSR sessions refreshed
  in middleware, **plus Row‑Level Security on every table** — not just app‑layer
  checks.

## Architecture

### Folder map

```
my-app/
├─ app/                      # Next.js App Router
│  ├─ (app)/                 # authenticated area (dashboard, inventory, …)
│  ├─ login/                 # login page + form
│  └─ auth/callback/         # Supabase auth callback
├─ components/               # client components (UI + feature screens)
├─ lib/
│  ├─ actions/               # server actions = the data layer (Supabase)
│  ├─ supabase/              # client/server/middleware Supabase factories
│  ├─ data/                  # demo-aware write facades (real vs demo)
│  ├─ demo/                  # demo mode: flag, seed, store, hook
│  └─ generate-order-pdf.ts  # invoice PDF
├─ supabase/migrations/      # SQL schema + functions
└─ middleware.ts             # auth gate (+ demo bypass)
```

### Request lifecycle (real mode)

1. `middleware.ts` refreshes the Supabase session and redirects to `/login` if
   there’s no user.
2. The route’s **Server Component** calls **server actions** in `lib/actions/*`,
   which query Postgres via a request‑scoped Supabase client.
3. Data is passed as props to a **client component** for all interactivity.
4. A mutation calls a write action, then `router.refresh()` re‑runs the Server
   Component so the UI reflects the new state.

So the server actions in `lib/actions/*` are the single data layer — every read
and write funnels through them. That’s the seam demo mode plugs into.

### Data model & the order lifecycle

Tables: `categories`, `inventory_items`, `shops`, `orders`,
`order_line_items`, protected by Row‑Level Security. Orders use a deliberate
**two‑step lifecycle**, implemented as atomic Postgres functions:

- **`place_order`** → creates a **pending** order; stock is *not* touched yet.
- **`confirm_order`** → re‑checks stock, raises a clear error if short,
  **deducts stock**, and marks the order **completed**.
- **`update_pending_order`** / cancel → edit or remove a pending order.
- Stats (`get_order_stats`, `get_order_counts_by_shop`) count **completed**
  orders only — which is why revenue only moves when an order is confirmed.

### Demo mode design

The whole feature is gated by one flag, **`NEXT_PUBLIC_DEMO_MODE`**. When off,
nothing below runs and the app behaves exactly as above. When on:

- **Auth is skipped** (`middleware.ts` returns early; `/login` redirects to `/`).
- **Reads return seed data** — each read action short‑circuits to `buildSeed()`
  *before* creating any Supabase client, so it works with no backend.
- **The browser is the source of truth** — `lib/demo/store.ts` is a
  localStorage‑backed store that mirrors the SQL functions exactly (same
  pending→confirm→completed lifecycle, stock math, and delete guards).
- **Components read live data** through `useDemoData()` (a thin
  `useSyncExternalStore` wrapper) and **write through `lib/data/*` facades**
  that dispatch to the store in demo mode and the real action otherwise.

**Why:** the demo deploys as a separate Vercel project with the flag on and *no*
Supabase keys — so it physically cannot touch real data, costs nothing to run,
and never lapses. One codebase runs on a real Postgres backend *or* a
self‑contained in‑browser store behind identical interfaces.

**Trade‑off:** images uploaded *during* the demo use a temporary object URL and
may revert to a placeholder after a hard refresh; everything else persists
per‑browser until **Reset demo**.

## Running locally

```bash
cd my-app
npm install
```

**Demo mode (no backend):**

```bash
# macOS/Linux
NEXT_PUBLIC_DEMO_MODE=true npm run dev
# Windows PowerShell
$env:NEXT_PUBLIC_DEMO_MODE="true"; npm run dev
```

**Real mode (Supabase):** run the SQL in `my-app/supabase/migrations/` in order,
create `my-app/.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, add a user in Supabase Auth, then `npm run dev`.

## Testing

```bash
cd my-app
npm run test
```

## Author

Built by **Philip Anaafi Asumadu** — [GitHub](https://github.com/MrAsumadu)

Originally a client project for a wholesale business; demo mode and this
documentation were added to make it a self‑contained portfolio piece.
