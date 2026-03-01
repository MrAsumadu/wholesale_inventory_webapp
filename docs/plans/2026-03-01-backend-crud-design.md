# Backend CRUD Design — Categories, Inventory, Shops, Orders

## Context

The wholesale inventory webapp has a full UI with mock data. This design adds Supabase-backed persistence with Server Actions for all CRUD operations.

## Decisions

- **Shared data**: All users (4-5 staff) share the same data. Single business.
- **Auto-deduct inventory**: Placing an order atomically reduces stock.
- **Server Actions**: All mutations go through Next.js Server Actions using the Supabase server client.
- **No order deletion/rollback**: Orders are immutable once placed.
- **Block deletion**: Can't delete categories with items or shops with orders.
- **No seed data**: Start with empty database.
- **No realtime**: Page revalidation on mutations is sufficient for 4-5 users.
- **Images**: Placeholder text fields for now, no uploads.

## Schema

### categories
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| name | text | NOT NULL |
| image | text | NOT NULL, default '/placeholder-item.svg' |
| created_at | timestamptz | NOT NULL, default now() |

### inventory_items
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| name | text | NOT NULL |
| image | text | NOT NULL, default '/placeholder-item.svg' |
| price | numeric(10,2) | NOT NULL, CHECK >= 0 |
| quantity | integer | NOT NULL, default 0, CHECK >= 0 |
| expiration_date | date | nullable |
| category_id | uuid | NOT NULL, FK → categories(id) ON DELETE RESTRICT |
| created_at | timestamptz | NOT NULL, default now() |

### shops
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| name | text | NOT NULL |
| owner | text | NOT NULL |
| location | text | NOT NULL |
| phone | text | NOT NULL |
| opening_time | time | NOT NULL |
| closing_time | time | NOT NULL |
| created_at | timestamptz | NOT NULL, default now() |

### orders
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| shop_id | uuid | NOT NULL, FK → shops(id) ON DELETE RESTRICT |
| total | numeric(10,2) | NOT NULL, CHECK >= 0 |
| created_at | timestamptz | NOT NULL, default now() |

### order_line_items
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| order_id | uuid | NOT NULL, FK → orders(id) ON DELETE CASCADE |
| item_id | uuid | NOT NULL, FK → inventory_items(id) ON DELETE RESTRICT |
| item_name | text | NOT NULL (denormalized, preserves name at order time) |
| quantity | integer | NOT NULL, CHECK > 0 |
| unit_price | numeric(10,2) | NOT NULL, CHECK >= 0 |

## RLS Policies

All tables: authenticated users can SELECT and INSERT.
Categories, inventory_items, shops: also UPDATE and DELETE.
Orders, order_line_items: SELECT and INSERT only (immutable).

## Postgres Function: place_order

Accepts shop_id (uuid) and line_items (jsonb array). In a single transaction:
1. Calculates total from line items
2. Inserts order row
3. Inserts each line item row
4. Decrements inventory_items.quantity for each item

The CHECK (quantity >= 0) constraint on inventory_items causes the entire transaction to abort if any item would go negative — preventing overselling.

## Server Actions — lib/actions/

| File | Actions |
|------|---------|
| categories.ts | getCategories, createCategory, updateCategory, deleteCategory |
| inventory.ts | getInventoryItems, createItem, updateItem, deleteItem |
| shops.ts | getShops, getShop, createShop, updateShop, deleteShop |
| orders.ts | getOrders, getShopOrders, placeOrder |

All mutations call revalidatePath to refresh page data.

## Page Changes

Pages become server components that fetch via server actions. Form/interactive components stay as client components, submitting via Server Actions.

## Revenue Queries

All retroactive revenue calculations are possible from existing schema:
- Total revenue: sum(total) from orders
- Per shop: group by shop_id
- Per period: filter by created_at
- Per item: sum(quantity * unit_price) from order_line_items group by item_id

## Testing

Vitest tests for each server action. Key test: place_order deducts inventory and fails when stock insufficient.
