create extension if not exists pgcrypto;

-- 1. Shipping Shipments Table
create table if not exists shipping_shipments (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null
    references orders(id)
    on delete restrict,

  parent_shipment_id uuid references shipping_shipments(id)
    on delete set null,

  provider text not null,
  service_code text,
  service_name text,

  shipment_type text not null default 'outbound'
    check (
      shipment_type in ('outbound', 'return', 'exchange')
    ),

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'booked',
        'pickup_scheduled',
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'failed',
        'returned',
        'exception'
      )
    ),

  provider_shipment_id text,
  tracking_number text,
  awb_number text,
  label_url text,
  label_expires_at timestamptz,

  pickup_address jsonb not null default '{}'::jsonb,
  delivery_address jsonb not null default '{}'::jsonb,
  package_details jsonb not null default '{}'::jsonb,

  shipping_cost numeric(12, 2) not null default 0,
  cod_amount numeric(12, 2) not null default 0,
  currency text not null default 'INR',

  estimated_delivery_date date,

  last_tracking_sync_at timestamptz,
  provider_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(provider, provider_shipment_id)
);

create index if not exists shipping_shipments_order_idx
  on shipping_shipments(order_id);

create index if not exists shipping_shipments_tracking_idx
  on shipping_shipments(tracking_number);

create index if not exists shipping_shipments_awb_idx
  on shipping_shipments(awb_number);

create index if not exists shipping_shipments_status_idx
  on shipping_shipments(status);

create index if not exists shipping_shipments_sync_idx
  on shipping_shipments(last_tracking_sync_at);


-- 2. Shipping Tracking Events
create table if not exists shipping_tracking_events (
  id uuid primary key default gen_random_uuid(),

  shipment_id uuid not null
    references shipping_shipments(id)
    on delete cascade,

  status text not null,
  location text,
  description text,
  event_time timestamptz not null,

  provider_event_id text,
  provider_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique(shipment_id, provider_event_id)
);

create index if not exists shipping_tracking_events_shipment_idx
  on shipping_tracking_events(shipment_id);

create index if not exists shipping_tracking_events_time_idx
  on shipping_tracking_events(event_time);


-- 3. Shipping Rate Quotes
create table if not exists shipping_rate_quotes (
  id uuid primary key default gen_random_uuid(),

  quote_token text not null unique,

  provider text not null,
  service_code text,
  service_name text,

  origin_pincode text not null,
  destination_pincode text not null,

  package_details jsonb not null default '{}'::jsonb,

  amount numeric(12, 2) not null,
  currency text not null default 'INR',

  estimated_days integer,
  estimated_delivery_date date,

  expires_at timestamptz not null,

  created_at timestamptz not null default now()
);

create index if not exists shipping_rate_quotes_expiry_idx
  on shipping_rate_quotes(expires_at);

create index if not exists shipping_rate_quotes_destination_idx
  on shipping_rate_quotes(destination_pincode);


-- 4. Shipping Webhook Events
create table if not exists shipping_webhook_events (
  id uuid primary key default gen_random_uuid(),

  provider text not null,
  external_event_id text not null,

  event_type text,
  payload jsonb not null default '{}'::jsonb,

  processed_at timestamptz,
  created_at timestamptz not null default now(),

  unique(provider, external_event_id)
);


-- 5. Shipping Settings
create table if not exists shipping_settings (
  id integer primary key default 1,

  default_provider text not null default 'local_delivery',
  fallback_provider text,

  auto_create_shipments boolean not null default false,
  auto_sync_tracking boolean not null default true,

  pickup_address jsonb not null default '{
    "name": "Lustre & Co. Flagship Store & Warehouse",
    "phone": "+91 98200 12345",
    "email": "logistics@lustreandco.com",
    "addressLine1": "Plot 42, Bandra-Kurla Complex",
    "addressLine2": "Jewellery Financial Hub",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "postalCode": "400051"
  }'::jsonb,

  local_delivery_enabled boolean not null default true,
  store_pickup_enabled boolean not null default true,

  free_shipping_threshold numeric(12, 2) default 10000,
  flat_shipping_rate numeric(12, 2) not null default 150,

  updated_at timestamptz not null default now()
);

insert into shipping_settings (id)
values (1)
on conflict (id) do nothing;


-- 6. Shipping Provider Settings
create table if not exists shipping_provider_settings (
  provider text primary key,

  enabled boolean not null default false,
  credentials jsonb not null default '{}'::jsonb,
  configuration jsonb not null default '{}'::jsonb,

  updated_at timestamptz not null default now()
);

-- Seed default provider records
insert into shipping_provider_settings (provider, enabled, configuration)
values 
  ('local_delivery', true, '{"radiusKm": 35, "standardRate": 60}'::jsonb),
  ('store_pickup', true, '{"holdDurationDays": 7}'::jsonb),
  ('shiprocket', false, '{}'::jsonb),
  ('delhivery', false, '{}'::jsonb),
  ('blue_dart', false, '{}'::jsonb),
  ('easyship', false, '{}'::jsonb),
  ('shippo', false, '{}'::jsonb)
on conflict (provider) do nothing;


-- 7. Triggers for updated_at
create or replace function set_shipping_shipments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shipping_shipments_updated_at_trigger
on shipping_shipments;

create trigger shipping_shipments_updated_at_trigger
before update on shipping_shipments
for each row
execute function set_shipping_shipments_updated_at();


create or replace function set_shipping_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shipping_settings_updated_at_trigger
on shipping_settings;

create trigger shipping_settings_updated_at_trigger
before update on shipping_settings
for each row
execute function set_shipping_settings_updated_at();


create or replace function set_shipping_provider_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shipping_provider_settings_updated_at_trigger
on shipping_provider_settings;

create trigger shipping_provider_settings_updated_at_trigger
before update on shipping_provider_settings
for each row
execute function set_shipping_provider_settings_updated_at();


-- 8. Alter Orders table to include shipping tracking and provider fields
alter table if exists orders
  add column if not exists shipping_provider text,
  add column if not exists shipping_shipment_id uuid,
  add column if not exists shipping_quote_token text,
  add column if not exists tracking_number text,
  add column if not exists awb_number text,
  add column if not exists shipping_label_url text,
  add column if not exists shipping_status text;
