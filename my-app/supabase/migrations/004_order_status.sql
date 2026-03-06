-- Step 1a: Add status column to orders
alter table orders add column status text not null default 'pending'
  check (status in ('pending', 'completed'));

-- Existing orders already had stock deducted, so mark them completed
update orders set status = 'completed';

-- Step 1b: Add UPDATE and DELETE RLS policies
create policy "auth_update" on orders for update to authenticated using (true) with check (true);
create policy "auth_delete" on orders for delete to authenticated using (true);
create policy "auth_update" on order_line_items for update to authenticated using (true) with check (true);
create policy "auth_delete" on order_line_items for delete to authenticated using (true);

-- Step 1c: Rewrite place_order to create pending orders (no stock deduction)
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

  insert into orders (shop_id, total, status) values (p_shop_id, v_total, 'pending')
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
  end loop;

  return v_order_id;
end;
$$ language plpgsql security definer;

-- Step 1d: New confirm_order function - validates stock, deducts, sets completed
create or replace function confirm_order(p_order_id uuid)
returns void as $$
declare
  v_status text;
  v_line record;
  v_available int;
begin
  select status into v_status from orders where id = p_order_id;

  if v_status is null then
    raise exception 'Order not found';
  end if;

  if v_status <> 'pending' then
    raise exception 'Order is already %', v_status;
  end if;

  for v_line in
    select item_id, item_name, quantity from order_line_items where order_id = p_order_id
  loop
    select quantity into v_available
      from inventory_items
      where id = v_line.item_id
      for update;

    if v_available is null then
      raise exception 'Item "%" not found', v_line.item_name;
    end if;

    if v_available < v_line.quantity then
      raise exception 'Insufficient stock for "%": requested %, available %',
        v_line.item_name, v_line.quantity, v_available;
    end if;

    update inventory_items
      set quantity = quantity - v_line.quantity
      where id = v_line.item_id;
  end loop;

  update orders set status = 'completed' where id = p_order_id;
end;
$$ language plpgsql security definer;

-- Step 1e: New update_pending_order function
create or replace function update_pending_order(
  p_order_id uuid,
  p_line_items jsonb
) returns void as $$
declare
  v_status text;
  v_total numeric(10,2) := 0;
  v_item jsonb;
begin
  select status into v_status from orders where id = p_order_id;

  if v_status is null then
    raise exception 'Order not found';
  end if;

  if v_status <> 'pending' then
    raise exception 'Cannot edit a % order', v_status;
  end if;

  -- Calculate new total
  for v_item in select * from jsonb_array_elements(p_line_items) loop
    v_total := v_total + (v_item->>'quantity')::int * (v_item->>'unit_price')::numeric;
  end loop;

  -- Delete old line items
  delete from order_line_items where order_id = p_order_id;

  -- Insert new line items
  for v_item in select * from jsonb_array_elements(p_line_items) loop
    insert into order_line_items (order_id, item_id, item_name, quantity, unit_price)
    values (
      p_order_id,
      (v_item->>'item_id')::uuid,
      v_item->>'item_name',
      (v_item->>'quantity')::int,
      (v_item->>'unit_price')::numeric
    );
  end loop;

  -- Update total
  update orders set total = v_total where id = p_order_id;
end;
$$ language plpgsql security definer;

-- Step 1f: Update stats to only count completed orders
create or replace function get_order_stats()
returns json as $$
  select json_build_object(
    'count', count(*),
    'totalRevenue', coalesce(sum(total), 0)
  ) from orders where status = 'completed';
$$ language sql security definer;

create or replace function get_order_counts_by_shop()
returns json as $$
  select coalesce(
    json_object_agg(shop_id, cnt),
    '{}'::json
  )
  from (
    select shop_id, count(*) as cnt
    from orders
    where status = 'completed'
    group by shop_id
  ) t;
$$ language sql security definer;
