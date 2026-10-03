-- ============================================================================
-- Shipping & Logistics Schema Migration
-- Lustre & Co. E-Commerce Platform
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists shipping_providers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  provider_type text not null check (provider_type in ('shiprocket','delhivery','bluedart','easyship','shippo','local_delivery','store_pickup')),
  is_active boolean not null default true,
  is_default boolean not null default false,
  priority integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists shipping_providers_single_default_idx on shipping_providers(is_default) where is_default = true;

create table if not exists shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  countries text[] not null default '{}',
  states text[] not null default '{}',
  pincodes text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shipping_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  shipping_type text not null check (shipping_type in ('carrier','local_delivery','store_pickup')),
  provider_id uuid references shipping_providers(id) on delete set null,
  zone_id uuid references shipping_zones(id) on delete set null,
  min_order_value numeric(12,2),
  max_order_value numeric(12,2),
  min_weight_grams integer,
  max_weight_grams integer,
  base_rate numeric(12,2) not null default 0,
  per_kg_rate numeric(12,2) not null default 0,
  cod_fee numeric(12,2) not null default 0,
  estimated_min_days integer,
  estimated_max_days integer,
  is_active boolean not null default true,
  is_free boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  provider_id uuid references shipping_providers(id) on delete set null,
  shipping_method_id uuid references shipping_methods(id) on delete set null,
  shipment_type text not null default 'delivery' check (shipment_type in ('delivery','return','pickup')),
  status text not null default 'pending' check (status in ('pending','rate_selected','created','label_ready','picked_up','in_transit','out_for_delivery','delivered','failed','cancelled','return_requested','return_in_transit','returned')),
  provider_shipment_id text,
  tracking_number text,
  tracking_url text,
  label_url text,
  courier_name text,
  service_name text,
  shipping_cost numeric(12,2) not null default 0,
  cod_amount numeric(12,2) not null default 0,
  pickup_address jsonb,
  delivery_address jsonb,
  package_details jsonb not null default '{}'::jsonb,
  provider_response jsonb not null default '{}'::jsonb,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz
);
create index if not exists shipments_order_idx on shipments(order_id);
create index if not exists shipments_tracking_idx on shipments(tracking_number);
create index if not exists shipments_provider_shipment_idx on shipments(provider_shipment_id);
create index if not exists shipments_status_idx on shipments(status);

create table if not exists shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments(id) on delete cascade,
  status text not null,
  previous_status text,
  location text,
  description text,
  event_time timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists shipment_events_shipment_idx on shipment_events(shipment_id);
create index if not exists shipment_events_time_idx on shipment_events(event_time);

create table if not exists shipment_rate_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_token text not null unique,
  order_id uuid references orders(id) on delete cascade,
  provider_id uuid references shipping_providers(id) on delete set null,
  shipping_method_id uuid references shipping_methods(id) on delete set null,
  courier_name text,
  service_name text,
  amount numeric(12,2) not null,
  currency text not null default 'INR',
  estimated_min_days integer,
  estimated_max_days integer,
  source_pincode text,
  destination_pincode text,
  request_hash text not null,
  response jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists shipment_rate_quotes_order_idx on shipment_rate_quotes(order_id);
create index if not exists shipment_rate_quotes_expiry_idx on shipment_rate_quotes(expires_at);

create table if not exists shipment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_code text not null,
  external_event_id text,
  event_type text,
  payload jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  processing_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create unique index if not exists shipment_webhook_unique_event_idx on shipment_webhook_events(provider_code, external_event_id) where external_event_id is not null;

create table if not exists return_shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  original_shipment_id uuid references shipments(id) on delete set null,
  shipment_id uuid references shipments(id) on delete set null,
  reason text not null,
  status text not null default 'requested' check (status in ('requested','approved','pickup_scheduled','in_transit','received','rejected','cancelled')),
  pickup_address jsonb,
  provider_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists orders add column if not exists selected_shipping_method_id uuid references shipping_methods(id) on delete set null;
alter table if exists orders add column if not exists shipping_provider_code text;
alter table if exists orders add column if not exists shipping_cost numeric(12,2) not null default 0;
alter table if exists orders add column if not exists shipping_address jsonb;
alter table if exists orders add column if not exists shipping_status text;
alter table if exists orders add column if not exists tracking_number text;
alter table if exists orders add column if not exists tracking_url text;

create or replace function set_shipping_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists shipping_providers_updated_at_trigger on shipping_providers;
create trigger shipping_providers_updated_at_trigger before update on shipping_providers for each row execute function set_shipping_updated_at();
drop trigger if exists shipping_methods_updated_at_trigger on shipping_methods;
create trigger shipping_methods_updated_at_trigger before update on shipping_methods for each row execute function set_shipping_updated_at();
drop trigger if exists shipments_updated_at_trigger on shipments;
create trigger shipments_updated_at_trigger before update on shipments for each row execute function set_shipping_updated_at();
drop trigger if exists return_shipments_updated_at_trigger on return_shipments;
create trigger return_shipments_updated_at_trigger before update on return_shipments for each row execute function set_shipping_updated_at();

-- Seed built-in and external shipping providers
insert into shipping_providers (code, name, provider_type, is_active, is_default, priority, config)
values
  (
    'local_delivery',
    'Local Delivery Fleet',
    'local_delivery',
    true,
    true,
    100,
    '{"baseRate": 60, "perKgRate": 20, "description": "Same day / next day localized delivery within store service radius"}'::jsonb
  ),
  (
    'store_pickup',
    'Boutique Store Pickup',
    'store_pickup',
    true,
    false,
    90,
    '{"description": "Complimentary pickup from Lustre & Co. flagship boutique showroom"}'::jsonb
  ),
  (
    'shiprocket',
    'Shiprocket Logistics',
    'shiprocket',
    true,
    false,
    80,
    '{
      "baseUrl": "https://apiv2.shiprocket.in/v1/external",
      "ratePath": "/courier/serviceability",
      "createShipmentPath": "/orders/create/adhoc",
      "trackPath": "/courier/track/awb/:trackingNumber",
      "cancelPath": "/orders/cancel",
      "labelPath": "/courier/generate/label",
      "serviceabilityPath": "/courier/serviceability"
    }'::jsonb
  ),
  (
    'delhivery',
    'Delhivery Express',
    'delhivery',
    true,
    false,
    75,
    '{
      "baseUrl": "https://track.delhivery.com",
      "ratePath": "/api/kinko/v1/invoice/charges/.json",
      "createShipmentPath": "/api/cmu/create.json",
      "trackPath": "/api/v1/packages/json/?waybill=:trackingNumber",
      "cancelPath": "/api/p/edit",
      "labelPath": "/api/p/packing_slip",
      "serviceabilityPath": "/c/api/pin-codes/json/?filter_codes=:postalCode"
    }'::jsonb
  ),
  (
    'bluedart',
    'Blue Dart Aviation Express',
    'bluedart',
    true,
    false,
    70,
    '{
      "baseUrl": "https://api.bluedart.com/v1",
      "ratePath": "/transit-time",
      "createShipmentPath": "/waybill",
      "trackPath": "/tracking/:trackingNumber",
      "cancelPath": "/waybill/:shipmentId/cancel",
      "labelPath": "/waybill/:shipmentId/label",
      "serviceabilityPath": "/pincode-serviceability/:postalCode"
    }'::jsonb
  ),
  (
    'easyship',
    'Easyship Global Freight',
    'easyship',
    true,
    false,
    65,
    '{
      "baseUrl": "https://api.easyship.com/2023-01",
      "ratePath": "/rate/v1/rates",
      "createShipmentPath": "/shipment/v1/shipments",
      "trackPath": "/tracking/v1/status/:trackingNumber",
      "cancelPath": "/shipment/v1/shipments/:shipmentId/cancel",
      "labelPath": "/label/v1/labels/:shipmentId",
      "serviceabilityPath": "/serviceability/:postalCode"
    }'::jsonb
  ),
  (
    'shippo',
    'Shippo Multi-Carrier',
    'shippo',
    true,
    false,
    60,
    '{
      "baseUrl": "https://api.goshippo.com",
      "ratePath": "/shipments",
      "createShipmentPath": "/transactions",
      "trackPath": "/tracks/shippo/:trackingNumber",
      "cancelPath": "/transactions/:shipmentId/cancel",
      "labelPath": "/transactions/:shipmentId",
      "serviceabilityPath": "/serviceability/:postalCode"
    }'::jsonb
  )
on conflict (code) do update set
  name = excluded.name,
  is_active = excluded.is_active,
  priority = excluded.priority,
  config = excluded.config;

-- Seed default shipping methods
insert into shipping_methods (code, name, shipping_type, base_rate, per_kg_rate, estimated_min_days, estimated_max_days, is_active, is_free)
values
  ('standard','Standard Surface Delivery','carrier',60,20,4,7,true,false),
  ('express','Express Air Dispatch','carrier',120,30,1,3,true,false),
  ('local','Local Courier Delivery','local_delivery',60,20,1,2,true,false),
  ('pickup','Boutique Store Pickup','store_pickup',0,0,1,1,true,true)
on conflict (code) do update set
  name = excluded.name,
  base_rate = excluded.base_rate,
  estimated_min_days = excluded.estimated_min_days,
  estimated_max_days = excluded.estimated_max_days;
