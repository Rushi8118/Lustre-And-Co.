create extension if not exists pgcrypto;

-- ─── 1. SUPPLIERS ────────────────────────────────────────────────────────────
create table if not exists inventory_suppliers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  code           text unique,
  contact_name   text,
  email          text,
  phone          text,
  address        text,
  city           text,
  state          text,
  country        text,
  postal_code    text,
  payment_terms  text,
  notes          text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ─── 2. EXTEND PRODUCTS TABLE ────────────────────────────────────────────────
alter table if exists products
  add column if not exists sku               text,
  add column if not exists barcode           text,
  add column if not exists reserved_stock    integer not null default 0,
  add column if not exists damaged_stock     integer not null default 0,
  add column if not exists reorder_level     integer not null default 5,
  add column if not exists reorder_quantity  integer not null default 10,
  add column if not exists warehouse_location text,
  add column if not exists supplier_id       uuid,
  add column if not exists cost_price        numeric(12,2);

alter table if exists products
  drop constraint if exists products_supplier_id_fkey;
alter table if exists products
  add constraint products_supplier_id_fkey
  foreign key (supplier_id)
  references inventory_suppliers(id)
  on delete set null;

create unique index if not exists products_sku_unique_idx
  on products(sku) where sku is not null and sku <> '';
create unique index if not exists products_barcode_unique_idx
  on products(barcode) where barcode is not null and barcode <> '';
create index if not exists products_reserved_stock_idx on products(reserved_stock);
create index if not exists products_reorder_level_idx  on products(reorder_level);

-- ─── 3. WAREHOUSES ───────────────────────────────────────────────────────────
create table if not exists inventory_warehouses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null unique,
  address     text,
  city        text,
  state       text,
  country     text,
  postal_code text,
  is_active   boolean not null default true,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── 4. LOCATIONS ────────────────────────────────────────────────────────────
create table if not exists inventory_locations (
  id           uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references inventory_warehouses(id) on delete cascade,
  code         text not null,
  name         text not null,
  aisle text, rack text, shelf text, bin text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  unique(warehouse_id, code)
);

-- ─── 5. PRODUCT LOCATIONS ────────────────────────────────────────────────────
create table if not exists inventory_product_locations (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references products(id) on delete cascade,
  warehouse_id     uuid not null references inventory_warehouses(id) on delete cascade,
  location_id      uuid references inventory_locations(id) on delete set null,
  stock_quantity   integer not null default 0,
  reserved_stock   integer not null default 0,
  damaged_stock    integer not null default 0,
  reorder_level    integer not null default 5,
  reorder_quantity integer not null default 10,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique(product_id, warehouse_id)
);

-- ─── 6. MOVEMENT LEDGER ──────────────────────────────────────────────────────
create table if not exists inventory_movements (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references products(id) on delete cascade,
  warehouse_id     uuid references inventory_warehouses(id) on delete set null,
  location_id      uuid references inventory_locations(id) on delete set null,
  movement_type    text not null check (movement_type in (
    'opening_stock','purchase_received','sale',
    'reservation','reservation_release','reservation_commit',
    'manual_adjustment','damage','damage_reversal',
    'return','transfer_in','transfer_out',
    'stock_count','refund_restock','write_off'
  )),
  quantity         integer not null,
  stock_before     integer not null default 0,
  stock_after      integer not null default 0,
  reserved_before  integer not null default 0,
  reserved_after   integer not null default 0,
  reference_type   text,
  reference_id     text,
  idempotency_key  text unique,
  reason           text,
  metadata         jsonb not null default '{}'::jsonb,
  created_by       uuid,
  created_at       timestamptz not null default now()
);
create index if not exists inventory_movements_product_idx    on inventory_movements(product_id);
create index if not exists inventory_movements_reference_idx  on inventory_movements(reference_type, reference_id);
create index if not exists inventory_movements_created_at_idx on inventory_movements(created_at);
create index if not exists inventory_movements_type_idx       on inventory_movements(movement_type);

-- ─── 7. RESERVATIONS ─────────────────────────────────────────────────────────
create table if not exists inventory_reservations (
  id                uuid primary key default gen_random_uuid(),
  reservation_token text not null unique,
  cart_id           uuid,
  order_id          uuid,
  user_id           uuid,
  status            text not null default 'active'
    check (status in ('active','committed','released','expired','cancelled')),
  expires_at        timestamptz not null,
  created_at        timestamptz not null default now(),
  committed_at      timestamptz,
  released_at       timestamptz
);
create index if not exists inventory_reservations_status_idx  on inventory_reservations(status);
create index if not exists inventory_reservations_expires_idx on inventory_reservations(expires_at);

create table if not exists inventory_reservation_items (
  id             uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references inventory_reservations(id) on delete cascade,
  product_id     uuid not null references products(id) on delete restrict,
  warehouse_id   uuid references inventory_warehouses(id) on delete set null,
  quantity       integer not null check (quantity > 0),
  created_at     timestamptz not null default now(),
  unique(reservation_id, product_id, warehouse_id)
);

-- ─── 8. ALERTS ───────────────────────────────────────────────────────────────
create table if not exists inventory_alerts (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references products(id) on delete cascade,
  warehouse_id        uuid references inventory_warehouses(id) on delete set null,
  alert_type          text not null check (alert_type in ('low_stock','out_of_stock')),
  status              text not null default 'open'
    check (status in ('open','acknowledged','resolved')),
  available_quantity  integer not null default 0,
  reorder_level       integer not null default 0,
  message             text,
  created_at          timestamptz not null default now(),
  acknowledged_at     timestamptz,
  resolved_at         timestamptz
);
create unique index if not exists inventory_open_alert_unique_idx
  on inventory_alerts(product_id, alert_type)
  where status in ('open','acknowledged') and warehouse_id is null;

-- ─── 9. PURCHASE ORDERS ──────────────────────────────────────────────────────
create table if not exists purchase_orders (
  id                     uuid primary key default gen_random_uuid(),
  purchase_order_number  text not null unique,
  supplier_id            uuid not null references inventory_suppliers(id) on delete restrict,
  warehouse_id           uuid references inventory_warehouses(id) on delete restrict,
  status                 text not null default 'draft'
    check (status in ('draft','submitted','partially_received','received','cancelled')),
  expected_delivery_date date,
  notes                  text,
  subtotal               numeric(12,2) not null default 0,
  tax                    numeric(12,2) not null default 0,
  shipping               numeric(12,2) not null default 0,
  total                  numeric(12,2) not null default 0,
  created_by             uuid,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create table if not exists purchase_order_items (
  id                  uuid primary key default gen_random_uuid(),
  purchase_order_id   uuid not null references purchase_orders(id) on delete cascade,
  product_id          uuid not null references products(id) on delete restrict,
  ordered_quantity    integer not null check (ordered_quantity > 0),
  received_quantity   integer not null default 0 check (received_quantity >= 0),
  unit_cost           numeric(12,2) not null default 0,
  created_at          timestamptz not null default now(),
  unique(purchase_order_id, product_id)
);

-- ─── 10. TRANSFERS ───────────────────────────────────────────────────────────
create table if not exists inventory_transfers (
  id                uuid primary key default gen_random_uuid(),
  transfer_number   text not null unique,
  from_warehouse_id uuid not null references inventory_warehouses(id) on delete restrict,
  to_warehouse_id   uuid not null references inventory_warehouses(id) on delete restrict,
  status            text not null default 'draft'
    check (status in ('draft','in_transit','received','cancelled')),
  notes             text,
  created_by        uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (from_warehouse_id <> to_warehouse_id)
);
create table if not exists inventory_transfer_items (
  id          uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references inventory_transfers(id) on delete cascade,
  product_id  uuid not null references products(id) on delete restrict,
  quantity    integer not null check (quantity > 0),
  created_at  timestamptz not null default now(),
  unique(transfer_id, product_id)
);

-- ─── 11. ORDER reservation token column ──────────────────────────────────────
alter table if exists orders
  add column if not exists inventory_reservation_token text;
create unique index if not exists orders_inventory_reservation_token_idx
  on orders(inventory_reservation_token)
  where inventory_reservation_token is not null;

-- ─── 12. FUNCTIONS ───────────────────────────────────────────────────────────
create or replace function inventory_available_stock(on_hand integer, reserved integer, damaged integer)
returns integer language sql immutable as $$
  select greatest(0, coalesce(on_hand,0) - coalesce(reserved,0) - coalesce(damaged,0));
$$;

create or replace function reserve_inventory(p_reservation_token text, p_cart_id uuid, p_user_id uuid, p_expires_at timestamptz, p_items jsonb)
returns jsonb language plpgsql security definer as $$
declare v_reservation_id uuid; v_item jsonb; v_product_id uuid; v_quantity integer; v_product record; v_available integer; v_existing record;
begin
  if p_reservation_token is null or length(trim(p_reservation_token)) < 8 then raise exception 'Invalid reservation token'; end if;
  if p_expires_at <= now() then raise exception 'Reservation expiration must be in the future'; end if;
  select * into v_existing from inventory_reservations where reservation_token = p_reservation_token for update;
  if found then
    if v_existing.status = 'active' then return jsonb_build_object('reservationId',v_existing.id,'reservationToken',v_existing.reservation_token,'status',v_existing.status,'expiresAt',v_existing.expires_at); end if;
    raise exception 'Reservation token has already been used';
  end if;
  insert into inventory_reservations (reservation_token,cart_id,user_id,status,expires_at) values (p_reservation_token,p_cart_id,p_user_id,'active',p_expires_at) returning id into v_reservation_id;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'productId')::uuid; v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then raise exception 'Quantity must be greater than zero'; end if;
    select * into v_product from products where id = v_product_id for update;
    if not found then raise exception 'Product % not found', v_product_id; end if;
    v_available := inventory_available_stock(v_product.stock_quantity,v_product.reserved_stock,v_product.damaged_stock);
    if v_available < v_quantity then raise exception 'Insufficient stock for product %. Available: %, requested: %', v_product_id, v_available, v_quantity; end if;
    update products set reserved_stock = reserved_stock + v_quantity where id = v_product_id;
    insert into inventory_reservation_items (reservation_id,product_id,quantity) values (v_reservation_id,v_product_id,v_quantity);
    insert into inventory_movements (product_id,movement_type,quantity,stock_before,stock_after,reserved_before,reserved_after,reference_type,reference_id,idempotency_key,reason)
    values (v_product_id,'reservation',0,v_product.stock_quantity,v_product.stock_quantity,v_product.reserved_stock,v_product.reserved_stock+v_quantity,'reservation',v_reservation_id::text,'reservation:'||v_reservation_id::text||':'||v_product_id::text,'Stock reserved for checkout');
  end loop;
  return jsonb_build_object('reservationId',v_reservation_id,'reservationToken',p_reservation_token,'status','active','expiresAt',p_expires_at);
exception when others then
  if v_reservation_id is not null then update inventory_reservations set status='cancelled',released_at=now() where id=v_reservation_id and status='active'; end if;
  raise;
end; $$;

create or replace function release_inventory_reservation(p_reservation_token text, p_status text default 'released')
returns jsonb language plpgsql security definer as $$
declare v_reservation record; v_item record; v_product record;
begin
  select * into v_reservation from inventory_reservations where reservation_token=p_reservation_token for update;
  if not found then raise exception 'Reservation not found'; end if;
  if v_reservation.status in ('released','expired','cancelled') then return jsonb_build_object('reservationId',v_reservation.id,'status',v_reservation.status,'changed',false); end if;
  if v_reservation.status = 'committed' then raise exception 'Committed reservations cannot be released'; end if;
  for v_item in select * from inventory_reservation_items where reservation_id=v_reservation.id loop
    select * into v_product from products where id=v_item.product_id for update;
    if not found then continue; end if;
    update products set reserved_stock=greatest(0,reserved_stock-v_item.quantity) where id=v_item.product_id;
    insert into inventory_movements (product_id,movement_type,quantity,stock_before,stock_after,reserved_before,reserved_after,reference_type,reference_id,idempotency_key,reason)
    values (v_item.product_id,'reservation_release',0,v_product.stock_quantity,v_product.stock_quantity,v_product.reserved_stock,greatest(0,v_product.reserved_stock-v_item.quantity),'reservation',v_reservation.id::text,'release:'||v_reservation.id::text||':'||v_item.product_id::text,'Checkout reservation released');
  end loop;
  update inventory_reservations set status=p_status,released_at=now() where id=v_reservation.id;
  return jsonb_build_object('reservationId',v_reservation.id,'status',p_status,'changed',true);
end; $$;

create or replace function commit_inventory_reservation(p_reservation_token text, p_order_id uuid)
returns jsonb language plpgsql security definer as $$
declare v_reservation record; v_item record; v_product record;
begin
  select * into v_reservation from inventory_reservations where reservation_token=p_reservation_token for update;
  if not found then raise exception 'Reservation not found'; end if;
  if v_reservation.status='committed' then return jsonb_build_object('reservationId',v_reservation.id,'status','committed','changed',false); end if;
  if v_reservation.status <> 'active' then raise exception 'Only active reservations can be committed. Current status: %',v_reservation.status; end if;
  if v_reservation.expires_at <= now() then raise exception 'Reservation has expired'; end if;
  for v_item in select * from inventory_reservation_items where reservation_id=v_reservation.id loop
    select * into v_product from products where id=v_item.product_id for update;
    if not found then raise exception 'Reserved product no longer exists'; end if;
    if v_product.stock_quantity < v_item.quantity then raise exception 'Physical stock is insufficient for product %',v_item.product_id; end if;
    update products set stock_quantity=stock_quantity-v_item.quantity,reserved_stock=greatest(0,reserved_stock-v_item.quantity) where id=v_item.product_id;
    insert into inventory_movements (product_id,movement_type,quantity,stock_before,stock_after,reserved_before,reserved_after,reference_type,reference_id,idempotency_key,reason)
    values (v_item.product_id,'reservation_commit',-v_item.quantity,v_product.stock_quantity,v_product.stock_quantity-v_item.quantity,v_product.reserved_stock,greatest(0,v_product.reserved_stock-v_item.quantity),'order',p_order_id::text,'commit:'||v_reservation.id::text||':'||v_item.product_id::text,'Reservation committed to order');
  end loop;
  update inventory_reservations set status='committed',order_id=p_order_id,committed_at=now() where id=v_reservation.id;
  return jsonb_build_object('reservationId',v_reservation.id,'status','committed','changed',true);
end; $$;

create or replace function adjust_inventory_stock(p_product_id uuid, p_quantity integer, p_movement_type text, p_reason text, p_idempotency_key text, p_created_by uuid default null, p_warehouse_id uuid default null, p_location_id uuid default null)
returns jsonb language plpgsql security definer as $$
declare v_product record; v_after integer;
begin
  if p_quantity=0 then raise exception 'Adjustment quantity cannot be zero'; end if;
  if p_movement_type not in ('opening_stock','purchase_received','manual_adjustment','damage','damage_reversal','return','refund_restock','write_off') then raise exception 'Invalid adjustment movement type'; end if;
  if p_idempotency_key is not null and exists (select 1 from inventory_movements where idempotency_key=p_idempotency_key) then return jsonb_build_object('changed',false,'reason','already_processed'); end if;
  select * into v_product from products where id=p_product_id for update;
  if not found then raise exception 'Product not found'; end if;
  v_after := v_product.stock_quantity + p_quantity;
  if v_after < 0 then raise exception 'Stock cannot become negative'; end if;
  update products set stock_quantity=v_after, damaged_stock=case when p_movement_type='damage' then greatest(0,damaged_stock+abs(p_quantity)) else damaged_stock end where id=p_product_id;
  insert into inventory_movements (product_id,warehouse_id,location_id,movement_type,quantity,stock_before,stock_after,reserved_before,reserved_after,reference_type,idempotency_key,reason,created_by)
  values (p_product_id,p_warehouse_id,p_location_id,p_movement_type,p_quantity,v_product.stock_quantity,v_after,v_product.reserved_stock,v_product.reserved_stock,'manual',p_idempotency_key,p_reason,p_created_by);
  return jsonb_build_object('changed',true,'productId',p_product_id,'stockBefore',v_product.stock_quantity,'stockAfter',v_after);
end; $$;
