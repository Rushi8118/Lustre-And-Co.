-- Storage & Enhanced Search Schema Migration
create extension if not exists pgcrypto;

-- 1. Product Images Metadata Table (Multi-image cloud storage, ordering, alt text)
create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  url text not null,
  storage_path text not null,
  alt_text text,
  display_order integer not null default 0,
  is_primary boolean not null default false,
  thumbnail_url text,
  webp_url text,
  file_size integer,
  mime_type text,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_idx on product_images(product_id);
create index if not exists product_images_order_idx on product_images(display_order);

-- 2. Search Analytics Table (Trending searches, typo logs, zero-result tracking)
create table if not exists search_analytics (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  normalized_query text not null,
  results_count integer not null default 0,
  user_id uuid references users(id) on delete set null,
  session_id text,
  clicked_product_id uuid references products(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists search_analytics_query_idx on search_analytics(normalized_query);
create index if not exists search_analytics_created_idx on search_analytics(created_at);
