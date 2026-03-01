# Backend CRUD Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace mock data with Supabase-backed persistence for categories, inventory, shops, and orders.

**Architecture:** Server Actions call Supabase server client for all CRUD. Pages become server components that fetch data, passing it to client components as props. Order placement uses a Postgres function for atomic inventory deduction.

**Tech Stack:** Supabase (Postgres), @supabase/ssr, Next.js Server Actions, Vitest

---

### Task 1: Set up Vitest

**Files:**
- Create: `my-app/vitest.config.ts`
- Modify: `my-app/package.json`

**Step 1: Install vitest**

Run: `cd my-app && npm install -D vitest`

**Step 2: Create vitest config**

```ts
// my-app/vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

**Step 3: Add test script to package.json**

Add to `"scripts"`: `"test": "vitest run", "test:watch": "vitest"`

**Step 4: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest test framework"
```

---

### Task 2: SQL migration file

**Files:**
- Create: `my-app/supabase/migrations/001_schema.sql`

**Step 1: Write the migration**

```sql
-- my-app/supabase/migrations/001_schema.sql

-- Categories
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image text not null default '/placeholder-item.svg',
  created_at timestamptz not null default now()
);

-- Inventory Items
create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image text not null default '/placeholder-item.svg',
  price numeric(10,2) not null check (price >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  expiration_date date,
  category_id uuid not null references categories(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- Shops
create table shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner text not null,
  location text not null,
  phone text not null,
  opening_time time not null,
  closing_time time not null,
  created_at timestamptz not null default now()
);

-- Orders (immutable - no update/delete)
create table orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete restrict,
  total numeric(10,2) not null check (total >= 0),
  created_at timestamptz not null default now()
);

-- Order Line Items
create table order_line_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  item_id uuid not null references inventory_items(id) on delete restrict,
  item_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0)
);

-- RLS
alter table categories enable row level security;
alter table inventory_items enable row level security;
alter table shops enable row level security;
alter table orders enable row level security;
alter table order_line_items enable row level security;

-- Categories, inventory, shops: full CRUD for authenticated
create policy "auth_all" on categories for all to authenticated using (true) with check (true);
create policy "auth_all" on inventory_items for all to authenticated using (true) with check (true);
create policy "auth_all" on shops for all to authenticated using (true) with check (true);

-- Orders: SELECT and INSERT only (immutable)
create policy "auth_select" on orders for select to authenticated using (true);
create policy "auth_insert" on orders for insert to authenticated with check (true);
create policy "auth_select" on order_line_items for select to authenticated using (true);
create policy "auth_insert" on order_line_items for insert to authenticated with check (true);

-- Postgres function: place_order
-- Atomically creates order, inserts line items, deducts inventory
create or replace function place_order(
  p_shop_id uuid,
  p_line_items jsonb
) returns uuid as $$
declare
  v_order_id uuid;
  v_total numeric(10,2) := 0;
  v_item jsonb;
begin
  for v_item in select * from jsonb_array_elements(p_line_items) loop
    v_total := v_total + (v_item->>'quantity')::int * (v_item->>'unit_price')::numeric;
  end loop;

  insert into orders (shop_id, total) values (p_shop_id, v_total)
    returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_line_items) loop
    insert into order_line_items (order_id, item_id, item_name, quantity, unit_price)
    values (
      v_order_id,
      (v_item->>'item_id')::uuid,
      v_item->>'item_name',
      (v_item->>'quantity')::int,
      (v_item->>'unit_price')::numeric
    );

    update inventory_items
      set quantity = quantity - (v_item->>'quantity')::int
      where id = (v_item->>'item_id')::uuid;
  end loop;

  return v_order_id;
end;
$$ language plpgsql security definer;
```

**Step 2: Run this SQL in Supabase dashboard**

Go to Supabase dashboard → SQL Editor → paste and run the entire file.

**Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema migration"
```

---

### Task 3: Update types to match database schema

**Files:**
- Modify: `my-app/lib/types.ts`

**Step 1: Write failing test**

```ts
// my-app/lib/__tests__/types.test.ts
import { describe, it, expectTypeOf } from "vitest";
import type { Category, InventoryItem, Shop, Order, OrderLineItem } from "../types";

describe("types", () => {
  it("Category has uuid id and created_at", () => {
    expectTypeOf<Category>().toHaveProperty("id");
    expectTypeOf<Category>().toHaveProperty("created_at");
  });

  it("InventoryItem uses category_id snake_case", () => {
    expectTypeOf<InventoryItem>().toHaveProperty("category_id");
    expectTypeOf<InventoryItem>().toHaveProperty("expiration_date");
  });

  it("Order uses shop_id and created_at instead of date", () => {
    expectTypeOf<Order>().toHaveProperty("shop_id");
    expectTypeOf<Order>().toHaveProperty("created_at");
  });

  it("OrderLineItem uses item_id and unit_price snake_case", () => {
    expectTypeOf<OrderLineItem>().toHaveProperty("item_id");
    expectTypeOf<OrderLineItem>().toHaveProperty("item_name");
    expectTypeOf<OrderLineItem>().toHaveProperty("unit_price");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd my-app && npx vitest run lib/__tests__/types.test.ts`
Expected: FAIL — properties don't exist yet (camelCase currently)

**Step 3: Update types to match Postgres column names**

```ts
// my-app/lib/types.ts
export interface Category {
  id: string;
  name: string;
  image: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  expiration_date: string | null;
  category_id: string;
  created_at: string;
}

export interface Shop {
  id: string;
  name: string;
  owner: string;
  location: string;
  phone: string;
  opening_time: string;
  closing_time: string;
  created_at: string;
}

export interface OrderLineItem {
  id: string;
  order_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: string;
  shop_id: string;
  total: number;
  created_at: string;
  line_items?: OrderLineItem[];
}
```

**Step 4: Run test to verify it passes**

Run: `cd my-app && npx vitest run lib/__tests__/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/types.ts lib/__tests__/types.test.ts
git commit -m "feat: update types to match database schema"
```

---

### Task 4: Categories server actions

**Files:**
- Create: `my-app/lib/actions/categories.ts`
- Create: `my-app/lib/actions/__tests__/categories.test.ts`

**Step 1: Write failing tests**

```ts
// my-app/lib/actions/__tests__/categories.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the supabase server client
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  });
  mockSelect.mockReturnValue({ order: mockOrder });
  mockOrder.mockResolvedValue({ data: [], error: null });
  mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
  mockSingle.mockResolvedValue({ data: { id: "test-id", name: "Test", image: "/placeholder-item.svg", created_at: "2026-01-01" }, error: null });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockDelete.mockReturnValue({ eq: mockEq });
  mockEq.mockResolvedValue({ error: null });
});

describe("categories actions", () => {
  it("getCategories calls supabase and returns data", async () => {
    const { getCategories } = await import("../categories");
    const result = await getCategories();
    expect(mockFrom).toHaveBeenCalledWith("categories");
    expect(result).toEqual([]);
  });

  it("createCategory inserts and revalidates", async () => {
    const { createCategory } = await import("../categories");
    const result = await createCategory({ name: "Test" });
    expect(mockFrom).toHaveBeenCalledWith("categories");
    expect(result.error).toBeNull();
  });

  it("updateCategory updates by id", async () => {
    const { updateCategory } = await import("../categories");
    await updateCategory("test-id", { name: "Updated" });
    expect(mockFrom).toHaveBeenCalledWith("categories");
    expect(mockEq).toHaveBeenCalledWith("id", "test-id");
  });

  it("deleteCategory deletes by id", async () => {
    const { deleteCategory } = await import("../categories");
    await deleteCategory("test-id");
    expect(mockFrom).toHaveBeenCalledWith("categories");
    expect(mockEq).toHaveBeenCalledWith("id", "test-id");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd my-app && npx vitest run lib/actions/__tests__/categories.test.ts`
Expected: FAIL — module not found

**Step 3: Implement categories actions**

```ts
// my-app/lib/actions/categories.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function createCategory(fields: { name: string; image?: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: fields.name, image: fields.image ?? "/placeholder-item.svg" })
    .select()
    .single();

  revalidatePath("/categories");
  revalidatePath("/");
  return { data, error };
}

export async function updateCategory(id: string, fields: { name?: string; image?: string }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update(fields)
    .eq("id", id);

  revalidatePath("/categories");
  revalidatePath("/");
  return { error };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  revalidatePath("/categories");
  revalidatePath("/");
  return { error };
}
```

**Step 4: Run test to verify it passes**

Run: `cd my-app && npx vitest run lib/actions/__tests__/categories.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/actions/categories.ts lib/actions/__tests__/categories.test.ts
git commit -m "feat: add categories server actions with tests"
```

---

### Task 5: Inventory server actions

**Files:**
- Create: `my-app/lib/actions/inventory.ts`
- Create: `my-app/lib/actions/__tests__/inventory.test.ts`

**Step 1: Write failing tests**

Same pattern as categories. Test getInventoryItems, createItem, updateItem, deleteItem. Test that getInventoryItems calls `.order("name")` and returns data.

**Step 2: Run test to verify it fails**

**Step 3: Implement inventory actions**

```ts
// my-app/lib/actions/inventory.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { InventoryItem } from "@/lib/types";

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function createItem(fields: {
  name: string;
  price: number;
  quantity: number;
  category_id: string;
  expiration_date?: string | null;
  image?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      name: fields.name,
      price: fields.price,
      quantity: fields.quantity,
      category_id: fields.category_id,
      expiration_date: fields.expiration_date ?? null,
      image: fields.image ?? "/placeholder-item.svg",
    })
    .select()
    .single();

  revalidatePath("/inventory");
  revalidatePath("/");
  return { data, error };
}

export async function updateItem(id: string, fields: Partial<{
  name: string;
  price: number;
  quantity: number;
  category_id: string;
  expiration_date: string | null;
  image: string;
}>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .update(fields)
    .eq("id", id);

  revalidatePath("/inventory");
  revalidatePath("/");
  return { error };
}

export async function deleteItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .delete()
    .eq("id", id);

  revalidatePath("/inventory");
  revalidatePath("/");
  return { error };
}
```

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add lib/actions/inventory.ts lib/actions/__tests__/inventory.test.ts
git commit -m "feat: add inventory server actions with tests"
```

---

### Task 6: Shops server actions

**Files:**
- Create: `my-app/lib/actions/shops.ts`
- Create: `my-app/lib/actions/__tests__/shops.test.ts`

Same pattern. Actions: getShops, getShop (by id), createShop, updateShop, deleteShop.

```ts
// my-app/lib/actions/shops.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Shop } from "@/lib/types";

export async function getShops(): Promise<Shop[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shops")
    .select("*")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function getShop(id: string): Promise<Shop | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shops")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function createShop(fields: {
  name: string;
  owner: string;
  location: string;
  phone: string;
  opening_time: string;
  closing_time: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shops")
    .insert(fields)
    .select()
    .single();

  revalidatePath("/shops");
  revalidatePath("/");
  return { data, error };
}

export async function updateShop(id: string, fields: Partial<{
  name: string;
  owner: string;
  location: string;
  phone: string;
  opening_time: string;
  closing_time: string;
}>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shops")
    .update(fields)
    .eq("id", id);

  revalidatePath("/shops");
  revalidatePath(`/shops/${id}`);
  revalidatePath("/");
  return { error };
}

export async function deleteShop(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shops")
    .delete()
    .eq("id", id);

  revalidatePath("/shops");
  revalidatePath("/");
  return { error };
}
```

**Commit after tests pass:**

```bash
git add lib/actions/shops.ts lib/actions/__tests__/shops.test.ts
git commit -m "feat: add shops server actions with tests"
```

---

### Task 7: Orders server actions

**Files:**
- Create: `my-app/lib/actions/orders.ts`
- Create: `my-app/lib/actions/__tests__/orders.test.ts`

**Key difference:** placeOrder calls the Postgres `place_order` function via `.rpc()`.

```ts
// my-app/lib/actions/orders.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";

export async function getOrders(): Promise<Order[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, line_items:order_line_items(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getShopOrders(shopId: string): Promise<Order[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, line_items:order_line_items(*)")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function placeOrder(shopId: string, lineItems: {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
}[]) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_shop_id: shopId,
    p_line_items: lineItems,
  });

  revalidatePath("/orders");
  revalidatePath("/inventory");
  revalidatePath(`/shops/${shopId}`);
  revalidatePath("/");
  return { data, error };
}
```

**Commit after tests pass:**

```bash
git add lib/actions/orders.ts lib/actions/__tests__/orders.test.ts
git commit -m "feat: add orders server actions with tests"
```

---

### Task 8: Convert categories page to use server data

**Files:**
- Modify: `my-app/app/(app)/categories/page.tsx` — make it a server component that fetches data
- Create: `my-app/components/categories/categories-client.tsx` — client component with all the UI logic
- Modify: `my-app/components/categories/category-form-modal.tsx` — call server actions on submit

**Step 1: Create categories-client.tsx**

Move all the client-side UI logic from the current page.tsx into this component. It receives `categories` and `itemCounts` as props instead of importing mock data.

The form modal's save button calls the `createCategory` or `updateCategory` server action. The delete confirmation calls `deleteCategory`. On error from deleteCategory (restrict violation), show a toast/alert: "Cannot delete category with items."

**Step 2: Update page.tsx to server component**

```tsx
// my-app/app/(app)/categories/page.tsx
import { getCategories } from "@/lib/actions/categories";
import { getInventoryItems } from "@/lib/actions/inventory";
import { CategoriesClient } from "@/components/categories/categories-client";

export default async function CategoriesPage() {
  const [categories, items] = await Promise.all([
    getCategories(),
    getInventoryItems(),
  ]);

  const itemCounts: Record<string, number> = {};
  for (const item of items) {
    itemCounts[item.category_id] = (itemCounts[item.category_id] ?? 0) + 1;
  }

  return <CategoriesClient categories={categories} itemCounts={itemCounts} />;
}
```

**Step 3: Verify by running `npm run build`**

**Step 4: Commit**

```bash
git add app/(app)/categories/ components/categories/
git commit -m "feat: connect categories page to supabase"
```

---

### Task 9: Convert inventory page to use server data

**Files:**
- Modify: `my-app/app/(app)/inventory/page.tsx` — server component
- Create: `my-app/components/inventory/inventory-client.tsx` — client component
- Modify: `my-app/components/inventory/item-form-modal.tsx` — call server actions
- Modify: `my-app/components/inventory/inventory-table.tsx` — pass callbacks for edit/delete

**Step 1: Same pattern as categories.**

Page fetches categories and inventory items. Client component receives both as props. Form modal calls createItem/updateItem. Delete calls deleteItem.

Form fields map: name, price, quantity, category_id (was categoryId), expiration_date (was expirationDate), image.

**Step 2: Commit**

```bash
git add app/(app)/inventory/ components/inventory/
git commit -m "feat: connect inventory page to supabase"
```

---

### Task 10: Convert shops page and shop detail to use server data

**Files:**
- Modify: `my-app/app/(app)/shops/page.tsx` — server component
- Create: `my-app/components/shops/shops-client.tsx` — client component
- Modify: `my-app/app/(app)/shops/[id]/page.tsx` — server component
- Create: `my-app/components/shops/shop-detail-client.tsx` — client component
- Modify: `my-app/components/shops/shop-form-modal.tsx` — call server actions

**Step 1: Shops list page**

```tsx
// my-app/app/(app)/shops/page.tsx
import { getShops } from "@/lib/actions/shops";
import { getOrders } from "@/lib/actions/orders";
import { ShopsClient } from "@/components/shops/shops-client";

export default async function ShopsPage() {
  const [shops, orders] = await Promise.all([getShops(), getOrders()]);

  const orderCounts: Record<string, number> = {};
  for (const order of orders) {
    orderCounts[order.shop_id] = (orderCounts[order.shop_id] ?? 0) + 1;
  }

  return <ShopsClient shops={shops} orderCounts={orderCounts} />;
}
```

**Step 2: Shop detail page**

```tsx
// my-app/app/(app)/shops/[id]/page.tsx
import { notFound } from "next/navigation";
import { getShop } from "@/lib/actions/shops";
import { getShopOrders } from "@/lib/actions/orders";
import { getInventoryItems } from "@/lib/actions/inventory";
import { getCategories } from "@/lib/actions/categories";
import { ShopDetailClient } from "@/components/shops/shop-detail-client";

export default async function ShopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shop = await getShop(id);
  if (!shop) notFound();

  const [orders, items, categories] = await Promise.all([
    getShopOrders(id),
    getInventoryItems(),
    getCategories(),
  ]);

  return <ShopDetailClient shop={shop} orders={orders} items={items} categories={categories} />;
}
```

**Step 3: Commit**

```bash
git add app/(app)/shops/ components/shops/
git commit -m "feat: connect shops pages to supabase"
```

---

### Task 11: Convert orders page and new-order-flow

**Files:**
- Modify: `my-app/app/(app)/orders/page.tsx` — server component
- Create: `my-app/components/orders/orders-client.tsx` — client component
- Modify: `my-app/components/orders/new-order-flow.tsx` — call placeOrder server action on confirm

**Step 1: Orders page**

```tsx
// my-app/app/(app)/orders/page.tsx
import { getOrders } from "@/lib/actions/orders";
import { getShops } from "@/lib/actions/shops";
import { OrdersClient } from "@/components/orders/orders-client";

export default async function OrdersPage() {
  const [orders, shops] = await Promise.all([getOrders(), getShops()]);
  return <OrdersClient orders={orders} shops={shops} />;
}
```

**Step 2: Update new-order-flow.tsx**

Replace mock data imports with props. Add `shopId` prop. On confirm, call `placeOrder(shopId, cartItems)` instead of just setting confirmed state. Handle error (show alert if stock insufficient). On success, show confirmation and call `router.refresh()`.

Key changes to cart item mapping for placeOrder:
```ts
const lineItems = cart.map(c => ({
  item_id: c.itemId,
  item_name: c.itemName,
  quantity: c.quantity,
  unit_price: c.unitPrice,
}));
const { error } = await placeOrder(shopId, lineItems);
```

**Step 3: Commit**

```bash
git add app/(app)/orders/ components/orders/
git commit -m "feat: connect orders page to supabase"
```

---

### Task 12: Convert dashboard page

**Files:**
- Modify: `my-app/app/(app)/page.tsx` — server component
- Create: `my-app/components/dashboard-client.tsx` — client component

**Step 1: Server component fetches all data**

```tsx
// my-app/app/(app)/page.tsx
import { getCategories } from "@/lib/actions/categories";
import { getInventoryItems } from "@/lib/actions/inventory";
import { getShops } from "@/lib/actions/shops";
import { getOrders } from "@/lib/actions/orders";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardPage() {
  const [categories, items, shops, orders] = await Promise.all([
    getCategories(),
    getInventoryItems(),
    getShops(),
    getOrders(),
  ]);

  return (
    <DashboardClient
      categories={categories}
      inventoryItems={items}
      shops={shops}
      orders={orders}
    />
  );
}
```

**Step 2: Move current page logic into DashboardClient**

Replace all mock data imports with props. Update field names: `shopId` → `shop_id`, `lineItems` → `line_items`, `date` → `created_at`.

**Step 3: Commit**

```bash
git add app/(app)/page.tsx components/dashboard-client.tsx
git commit -m "feat: connect dashboard to supabase"
```

---

### Task 13: Remove mock data and clean up

**Files:**
- Delete: `my-app/lib/mock-data.ts`

**Step 1: Search for any remaining imports of mock-data**

Run: `grep -r "mock-data" my-app/`

Fix any remaining references.

**Step 2: Verify build**

Run: `cd my-app && npm run build`
Expected: Success with no errors

**Step 3: Run all tests**

Run: `cd my-app && npx vitest run`
Expected: All tests pass

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove mock data, all pages use supabase"
```

---

## Execution Order

Tasks 1-7 are backend-only (tests, schema, actions). Tasks 8-12 are page conversions (can be done in any order). Task 13 is cleanup.

Dependencies:
- Task 2 (schema) must be run in Supabase dashboard before testing actions against real data
- Task 3 (types) must come before tasks 4-7 (actions use the types)
- Tasks 4-7 (actions) must come before tasks 8-12 (pages import actions)
- Task 13 comes last
