-- Fix #1: place_order - add stock check with meaningful error before deducting
create or replace function place_order(
  p_shop_id uuid,
  p_line_items jsonb
) returns uuid as $$
declare
  v_order_id uuid;
  v_total numeric(10,2) := 0;
  v_item jsonb;
  v_available int;
begin
  for v_item in select * from jsonb_array_elements(p_line_items) loop
    v_total := v_total + (v_item->>'quantity')::int * (v_item->>'unit_price')::numeric;
  end loop;

  insert into orders (shop_id, total) values (p_shop_id, v_total)
    returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_line_items) loop
    select quantity into v_available
      from inventory_items
      where id = (v_item->>'item_id')::uuid
      for update;

    if v_available is null then
      raise exception 'Item "%" not found', v_item->>'item_name';
    end if;

    if v_available < (v_item->>'quantity')::int then
      raise exception 'Insufficient stock for "%": requested %, available %',
        v_item->>'item_name', (v_item->>'quantity')::int, v_available;
    end if;

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

-- Fix #2: Server-side aggregate for order stats
create or replace function get_order_stats()
returns json as $$
  select json_build_object(
    'count', count(*),
    'totalRevenue', coalesce(sum(total), 0)
  ) from orders;
$$ language sql security definer;

-- Fix #3: Server-side aggregate for order counts by shop
create or replace function get_order_counts_by_shop()
returns json as $$
  select coalesce(
    json_object_agg(shop_id, cnt),
    '{}'::json
  )
  from (
    select shop_id, count(*) as cnt
    from orders
    group by shop_id
  ) t;
$$ language sql security definer;
