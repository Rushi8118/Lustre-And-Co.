-- Lustre & Co. — Supabase (Postgres) schema.
-- Run once in the Supabase dashboard (SQL Editor) or with `supabase db push`.
-- Column names intentionally mirror the API's camelCase field names.
-- The NestJS API connects with the service-role key; RLS is enabled with no
-- policies so the tables are not reachable with the public anon key.

create extension if not exists pgcrypto;

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new."updatedAt" = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  "googleId" text,
  provider text not null default 'local',
  password text not null,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  phone text,
  addresses jsonb not null default '[]'::jsonb,
  wishlist uuid[] not null default '{}',
  "isActive" boolean not null default true,
  "lastLoginAt" timestamptz,
  "resetPasswordTokenHash" text,
  "resetPasswordExpires" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists users_google_id_idx on users ("googleId");
create index if not exists users_role_idx on users (role);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  eyebrow text not null default '',
  title text not null default '',
  description text not null default '',
  image text not null default '',
  "sortOrder" integer not null default 0,
  "isActive" boolean not null default true,
  "showInMenu" boolean not null default true,
  "showOnHome" boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sku text,
  category text not null,
  "collectionName" text not null default 'everyday',
  occasion text not null default 'everyday',
  price numeric not null,
  "oldPrice" numeric,
  rating numeric not null default 0,
  reviews integer not null default 0,
  badge text,
  finish text not null default '18K Gold Plated',
  material text not null default 'Gold-plated brass',
  "availableColors" text[] not null default array['Gold'],
  "availableSizes" text[] not null default array['Standard (16" + 2")'],
  availability text not null default 'in-stock',
  "stockQuantity" integer not null default 50,
  "salesCount" integer not null default 0,
  image text not null,
  gallery text[] not null default '{}',
  description text,
  details text[] not null default '{}',
  care text[] not null default '{}',
  shipping text[] not null default '{}',
  returns text[] not null default '{}',
  tags text[] not null default '{}',
  "isActive" boolean not null default true,
  "isFeatured" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists products_category_idx on products (category);
create index if not exists products_sku_idx on products (sku);
create index if not exists products_active_idx on products ("isActive");
create index if not exists products_tags_idx on products using gin (tags);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product uuid not null references products (id) on delete cascade,
  "user" uuid references users (id) on delete set null,
  author text not null,
  rating integer not null check (rating between 1 and 5),
  title text not null,
  comment text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  "verifiedPurchase" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists reviews_product_user_idx on reviews (product, "user");
create index if not exists reviews_status_idx on reviews (status);

create table if not exists carts (
  id uuid primary key default gen_random_uuid(),
  "user" uuid not null unique references users (id) on delete cascade,
  -- [{ id, product (uuid), quantity, selectedColor, selectedSize }]
  items jsonb not null default '[]'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  "orderId" text not null unique,
  "user" uuid references users (id) on delete set null,
  customer jsonb not null,
  "shippingAddress" jsonb not null,
  items jsonb not null,
  subtotal numeric not null,
  discount numeric not null default 0,
  "promoCode" text,
  "shippingFee" numeric not null default 0,
  "deliverySurcharge" numeric not null default 0,
  tax numeric not null default 0,
  total numeric not null,
  "deliveryOption" text not null default 'standard' check ("deliveryOption" in ('standard', 'express')),
  notes text not null default '',
  status text not null default 'Confirmed'
    check (status in ('Confirmed', 'Processing', 'In Transit', 'Delivered', 'Cancelled')),
  "statusHistory" jsonb not null default '[]'::jsonb,
  payment jsonb not null default '{"method": "cod", "status": "pending"}'::jsonb,
  carrier text not null default 'Bluedart Air Express',
  "trackingNumber" text,
  "estimatedDeliveryDate" text,
  "stockRestored" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists orders_user_idx on orders ("user");
create index if not exists orders_customer_email_idx on orders ((customer ->> 'email'));
create index if not exists orders_created_at_idx on orders ("createdAt" desc);
create index if not exists orders_status_idx on orders (status);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  "order" uuid not null references orders (id) on delete cascade,
  "orderId" text not null unique,
  "user" uuid references users (id) on delete set null,
  amount numeric not null check (amount >= 0),
  currency text not null default 'INR',
  method text not null check (method in ('card', 'wallet', 'cod', 'netbanking', 'razorpay')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  "transactionId" text,
  "razorpayOrderId" text,
  "razorpayPaymentId" text,
  "razorpaySignature" text,
  "paidAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percentage', 'fixed', 'free_shipping')),
  value numeric not null,
  description text not null default '',
  "minOrderAmount" numeric not null default 0,
  "usageLimit" integer not null default 0,
  "usedCount" integer not null default 0,
  "isActive" boolean not null default true,
  "expiresAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique default 'store',
  store jsonb not null default '{}'::jsonb,
  social jsonb not null default '{}'::jsonb,
  commerce jsonb not null default '{}'::jsonb,
  announcement jsonb not null default '{}'::jsonb,
  homepage jsonb not null default '{}'::jsonb,
  newsletter jsonb not null default '{}'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  eyebrow text not null default '',
  description text not null default '',
  sections jsonb not null default '[]'::jsonb,
  "isPublished" boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  "group" text not null default 'General',
  "sortOrder" integer not null default 0,
  "isActive" boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists faqs_group_idx on faqs ("group");

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null default '',
  reason text not null default 'Other',
  "orderId" text not null default '',
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'replied', 'archived')),
  "adminNote" text not null default '',
  "user" uuid references users (id) on delete set null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists contact_messages_status_idx on contact_messages (status);

create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  "isActive" boolean not null default true,
  source text not null default 'footer',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- updatedAt triggers + RLS on every table
do $$
declare t text;
begin
  foreach t in array array['users', 'categories', 'products', 'reviews', 'carts', 'orders', 'payments',
                           'coupons', 'settings', 'pages', 'faqs', 'contact_messages', 'subscribers']
  loop
    execute format('drop trigger if exists %I_updated_at on %I', t, t);
    execute format('create trigger %I_updated_at before update on %I for each row execute function set_updated_at()', t, t);
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Functions (called from the API through supabase.rpc)
-- ---------------------------------------------------------------------------

-- Atomically takes stock; returns false when not enough units are left.
create or replace function reserve_product_stock(p_id uuid, p_qty integer) returns boolean
language plpgsql as $$
declare affected integer;
begin
  update products
     set "stockQuantity" = "stockQuantity" - p_qty,
         "salesCount" = "salesCount" + p_qty,
         availability = case when "stockQuantity" - p_qty <= 0 then 'out-of-stock' else availability end
   where id = p_id and "stockQuantity" >= p_qty;
  get diagnostics affected = row_count;
  return affected > 0;
end $$;

create or replace function release_product_stock(p_id uuid, p_qty integer) returns void
language sql as $$
  update products
     set "stockQuantity" = "stockQuantity" + p_qty,
         "salesCount" = "salesCount" - p_qty,
         availability = 'in-stock'
   where id = p_id;
$$;

create or replace function increment_coupon_usage(p_code text) returns void
language sql as $$
  update coupons set "usedCount" = "usedCount" + 1 where code = upper(p_code);
$$;

-- Removes a deleted product from every bag and wishlist.
create or replace function purge_product_references(p_id uuid) returns void
language sql as $$
  update carts
     set items = coalesce((select jsonb_agg(i) from jsonb_array_elements(items) i
                            where i ->> 'product' <> p_id::text), '[]'::jsonb)
   where items @> jsonb_build_array(jsonb_build_object('product', p_id::text));
  update users set wishlist = array_remove(wishlist, p_id) where p_id = any (wishlist);
$$;

-- Row counts (and optional sums) grouped by one column of a whitelisted table.
create or replace function count_by(p_table text, p_column text, p_sum text default null)
returns table (key text, count bigint, amount numeric)
language plpgsql stable as $$
begin
  if p_table not in ('orders', 'payments', 'reviews', 'contact_messages', 'products')
     or p_column not in ('status', 'category')
     or (p_sum is not null and p_sum not in ('total', 'amount')) then
    raise exception 'count_by: unsupported arguments';
  end if;
  return query execute format(
    'select %I::text, count(*), %s from %I group by 1',
    p_column, case when p_sum is null then 'null::numeric' else format('coalesce(sum(%I), 0)', p_sum) end, p_table
  );
end $$;

create or replace function lifetime_order_totals() returns table (revenue numeric, orders bigint)
language sql stable as $$
  select coalesce(sum(total), 0), count(*) from orders where status <> 'Cancelled';
$$;

create or replace function customer_order_stats()
returns table (user_id uuid, orders bigint, spent numeric, "lastOrderAt" timestamptz)
language sql stable as $$
  select "user", count(*),
         coalesce(sum(case when status <> 'Cancelled' then total else 0 end), 0),
         max("createdAt")
    from orders where "user" is not null group by "user";
$$;

create or replace function buyer_summary()
returns table (buyers bigint, returning bigint, revenue numeric, orders bigint)
language sql stable as $$
  select count(*), count(*) filter (where n >= 2), coalesce(sum(spent), 0), coalesce(sum(n), 0)
    from (select "user", count(*) n, sum(total) spent
            from orders where "user" is not null and status <> 'Cancelled' group by "user") s;
$$;

create or replace function review_stats(p_product uuid default null)
returns table (average numeric, count bigint)
language sql stable as $$
  select avg(rating), count(*) from reviews
   where status = 'approved' and (p_product is null or product = p_product);
$$;

-- Only the service role (the API) may call these.
do $$
declare f text;
begin
  foreach f in array array['reserve_product_stock(uuid, integer)', 'release_product_stock(uuid, integer)',
                           'increment_coupon_usage(text)', 'purge_product_references(uuid)',
                           'count_by(text, text, text)', 'lifetime_order_totals()', 'customer_order_stats()',
                           'buyer_summary()', 'review_stats(uuid)']
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end $$;
