create table if not exists product_bundles (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  slug text not null unique,
  description text,

  bundle_type text not null default 'fixed_bundle'
    check (
      bundle_type in (
        'fixed_bundle',
        'gift_set',
        'starter_kit',
        'frequently_bought_together',
        'mix_and_match',
        'bogo'
      )
    ),

  discount_type text not null default 'percentage'
    check (
      discount_type in ('percentage', 'fixed', 'free_item')
    ),

  discount_value numeric(12, 2) not null default 0
    check (discount_value >= 0),

  min_items integer not null default 2
    check (min_items >= 1),

  max_items integer
    check (max_items is null or max_items >= min_items),

  buy_quantity integer
    check (buy_quantity is null or buy_quantity >= 1),

  get_quantity integer
    check (get_quantity is null or get_quantity >= 1),

  is_active boolean not null default true,
  is_featured boolean not null default false,

  starts_at timestamptz,
  ends_at timestamptz,

  image text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_bundles_active_idx
  on product_bundles (is_active);

create index if not exists product_bundles_type_idx
  on product_bundles (bundle_type);

create index if not exists product_bundles_dates_idx
  on product_bundles (starts_at, ends_at);


create table if not exists product_bundle_items (
  id uuid primary key default gen_random_uuid(),

  bundle_id uuid not null
    references product_bundles(id)
    on delete cascade,

  product_id uuid not null
    references products(id)
    on delete restrict,

  quantity integer not null default 1
    check (quantity >= 1),

  group_key text,
  is_required boolean not null default true,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),

  unique(bundle_id, product_id, group_key)
);

create index if not exists product_bundle_items_bundle_idx
  on product_bundle_items (bundle_id);

create index if not exists product_bundle_items_product_idx
  on product_bundle_items (product_id);


create table if not exists cart_bundle_items (
  id uuid primary key default gen_random_uuid(),

  cart_id uuid not null
    references carts(id)
    on delete cascade,

  bundle_id uuid not null
    references product_bundles(id)
    on delete restrict,

  quantity integer not null default 1
    check (quantity >= 1),

  selected_items jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(cart_id, bundle_id)
);

create index if not exists cart_bundle_items_cart_idx
  on cart_bundle_items (cart_id);

create index if not exists cart_bundle_items_bundle_idx
  on cart_bundle_items (bundle_id);


alter table if exists carts
  add column if not exists bundle_items jsonb not null default '[]'::jsonb;


alter table if exists orders
  add column if not exists bundle_items jsonb not null default '[]'::jsonb;


create or replace function set_product_bundles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists product_bundles_updated_at_trigger
on product_bundles;

create trigger product_bundles_updated_at_trigger
before update on product_bundles
for each row
execute function set_product_bundles_updated_at();
