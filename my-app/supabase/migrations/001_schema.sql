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
