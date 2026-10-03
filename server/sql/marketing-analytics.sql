-- ============================================================================
-- Marketing and Analytics Schema Migration
-- Lustre & Co. E-Commerce Platform
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Helper columns on users and orders
-- ---------------------------------------------------------------------------

alter table if exists users
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists marketing_email_opt_in boolean not null default true,
  add column if not exists marketing_sms_opt_in boolean not null default false,
  add column if not exists phone text,
  add column if not exists device_type text,
  add column if not exists customer_type text;

alter table if exists orders
  add column if not exists device_type text,
  add column if not exists country text,
  add column if not exists state text,
  add column if not exists city text,
  add column if not exists coupon_code text,
  add column if not exists refund_total numeric(12, 2) not null default 0,
  add column if not exists customer_type text,
  add column if not exists shipping_provider text,
  add column if not exists shipping_status text;

-- ---------------------------------------------------------------------------
-- 2. Marketing Email Templates
-- ---------------------------------------------------------------------------

create table if not exists marketing_email_templates (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  slug text not null unique,

  campaign_type text not null
    check (
      campaign_type in (
        'newsletter',
        'new_product',
        'sale',
        'order_update',
        'abandoned_cart',
        'review_request',
        'back_in_stock'
      )
    ),

  subject text not null,
  preview_text text,
  html_body text not null,
  text_body text,

  variables jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  is_default boolean not null default false,

  created_by uuid references users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketing_templates_type_idx
  on marketing_email_templates(campaign_type);

create index if not exists marketing_templates_active_idx
  on marketing_email_templates(is_active);

-- Alias table / view for marketing_templates compatibility
create table if not exists marketing_templates (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  template_key text,
  slug text,

  campaign_type text not null,

  subject text not null,
  preheader text,
  preview_text text,
  html_body text not null,
  text_body text,

  variables jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  is_default boolean not null default false,

  created_by uuid references users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Marketing Campaigns
-- ---------------------------------------------------------------------------

create table if not exists marketing_campaigns (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  campaign_type text not null
    check (
      campaign_type in (
        'newsletter',
        'new_product',
        'sale',
        'order_update',
        'abandoned_cart',
        'review_request',
        'back_in_stock'
      )
    ),

  template_id uuid references marketing_email_templates(id)
    on delete set null,

  subject_override text,
  html_override text,
  text_override text,

  audience_filter jsonb not null default '{}'::jsonb,

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'scheduled',
        'processing',
        'sent',
        'partially_sent',
        'failed',
        'cancelled'
      )
    ),

  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,

  total_recipients integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,

  created_by uuid references users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketing_campaigns_status_idx
  on marketing_campaigns(status);

create index if not exists marketing_campaigns_scheduled_idx
  on marketing_campaigns(scheduled_at);

create index if not exists marketing_campaigns_type_idx
  on marketing_campaigns(campaign_type);

-- ---------------------------------------------------------------------------
-- 4. Marketing Campaign Recipients
-- ---------------------------------------------------------------------------

create table if not exists marketing_campaign_recipients (
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid not null
    references marketing_campaigns(id)
    on delete cascade,

  user_id uuid references users(id)
    on delete set null,

  email text not null,
  phone text,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'sending',
        'processing',
        'sent',
        'failed',
        'skipped',
        'unsubscribed'
      )
    ),

  personalization jsonb not null default '{}'::jsonb,
  variables jsonb not null default '{}'::jsonb,

  provider_message_id text,
  error_message text,
  failure_reason text,

  attempts integer not null default 0,
  sent_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(campaign_id, email)
);

create index if not exists marketing_recipients_campaign_idx
  on marketing_campaign_recipients(campaign_id);

create index if not exists marketing_recipients_status_idx
  on marketing_campaign_recipients(status);

create index if not exists marketing_recipients_email_idx
  on marketing_campaign_recipients(email);

-- ---------------------------------------------------------------------------
-- 5. Marketing Unsubscribes
-- ---------------------------------------------------------------------------

create table if not exists marketing_unsubscribes (
  id uuid primary key default gen_random_uuid(),

  email text not null unique,
  user_id uuid references users(id)
    on delete set null,

  reason text,
  source text,

  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz not null default now()
);

create index if not exists marketing_unsubscribes_email_idx
  on marketing_unsubscribes(email);

-- ---------------------------------------------------------------------------
-- 6. Marketing Events
-- ---------------------------------------------------------------------------

create table if not exists marketing_events (
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid references marketing_campaigns(id)
    on delete set null,

  recipient_id uuid references marketing_campaign_recipients(id)
    on delete set null,

  event_type text not null
    check (
      event_type in (
        'sent',
        'delivered',
        'opened',
        'clicked',
        'bounced',
        'complained',
        'unsubscribed'
      )
    ),

  link_url text,
  provider_event_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists marketing_events_campaign_idx
  on marketing_events(campaign_id);

create index if not exists marketing_events_recipient_idx
  on marketing_events(recipient_id);

create index if not exists marketing_events_type_idx
  on marketing_events(event_type);

-- ---------------------------------------------------------------------------
-- 7. Back In Stock Subscriptions
-- ---------------------------------------------------------------------------

create table if not exists back_in_stock_subscriptions (
  id uuid primary key default gen_random_uuid(),

  product_id uuid not null
    references products(id)
    on delete cascade,

  email text,
  phone text,

  user_id uuid references users(id)
    on delete set null,

  status text not null default 'active'
    check (
      status in (
        'active',
        'waiting',
        'notified',
        'unsubscribed',
        'invalid',
        'cancelled'
      )
    ),

  notification_channel text not null default 'email'
    check (
      notification_channel in ('email', 'sms', 'both', 'whatsapp')
    ),

  notify_by_email boolean not null default true,
  notify_by_sms boolean not null default false,

  last_notified_at timestamptz,
  notified_stock_quantity integer,

  notification_token text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    email is not null or phone is not null
  )
);

create unique index if not exists back_in_stock_email_unique_idx
  on back_in_stock_subscriptions(product_id, lower(email))
  where email is not null and status in ('active', 'waiting');

create unique index if not exists back_in_stock_phone_unique_idx
  on back_in_stock_subscriptions(product_id, phone)
  where phone is not null and status in ('active', 'waiting');

create index if not exists back_in_stock_product_idx
  on back_in_stock_subscriptions(product_id);

create index if not exists back_in_stock_status_idx
  on back_in_stock_subscriptions(status);

-- Alias table / view for back_in_stock_requests compatibility
create table if not exists back_in_stock_requests (
  id uuid primary key default gen_random_uuid(),

  product_id uuid not null
    references products(id)
    on delete cascade,

  email text,
  phone text,

  channel text not null default 'email',
  status text not null default 'waiting',
  notification_token text,
  notified_at timestamptz,
  created_at timestamptz not null default now(),

  check (email is not null or phone is not null)
);

-- ---------------------------------------------------------------------------
-- 8. Analytics Events
-- ---------------------------------------------------------------------------

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references users(id)
    on delete set null,

  session_id text,
  event_type text not null,

  product_id uuid references products(id)
    on delete set null,

  order_id uuid references orders(id)
    on delete set null,

  page_path text,
  page_url text,

  device_type text,
  browser text,
  operating_system text,

  country text,
  state text,
  city text,

  value numeric(14, 2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists analytics_events_type_idx
  on analytics_events(event_type);

create index if not exists analytics_events_created_idx
  on analytics_events(created_at);

create index if not exists analytics_events_session_idx
  on analytics_events(session_id);

create index if not exists analytics_events_user_idx
  on analytics_events(user_id);

create index if not exists analytics_events_order_idx
  on analytics_events(order_id);

-- ---------------------------------------------------------------------------
-- 9. Analytics Daily Snapshots & Metrics
-- ---------------------------------------------------------------------------

create table if not exists analytics_daily_snapshots (
  id uuid primary key default gen_random_uuid(),

  snapshot_date date not null unique,

  gross_revenue numeric(14, 2) not null default 0,
  net_revenue numeric(14, 2) not null default 0,
  refund_total numeric(14, 2) not null default 0,
  order_count integer not null default 0,
  customer_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists analytics_daily_metrics (
  id uuid primary key default gen_random_uuid(),

  metric_date date not null unique,

  gross_revenue numeric(14, 2) not null default 0,
  net_revenue numeric(14, 2) not null default 0,
  refund_total numeric(14, 2) not null default 0,

  order_count integer not null default 0,
  customer_count integer not null default 0,
  new_customer_count integer not null default 0,
  returning_customer_count integer not null default 0,

  checkout_started_count integer not null default 0,
  checkout_completed_count integer not null default 0,
  abandoned_cart_count integer not null default 0,

  cod_order_count integer not null default 0,
  online_order_count integer not null default 0
);

-- ---------------------------------------------------------------------------
-- 10. Triggers
-- ---------------------------------------------------------------------------

create or replace function set_marketing_templates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists marketing_templates_updated_at_trigger
on marketing_email_templates;

create trigger marketing_templates_updated_at_trigger
before update on marketing_email_templates
for each row
execute function set_marketing_templates_updated_at();

create or replace function set_marketing_campaigns_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists marketing_campaigns_updated_at_trigger
on marketing_campaigns;

create trigger marketing_campaigns_updated_at_trigger
before update on marketing_campaigns
for each row
execute function set_marketing_campaigns_updated_at();

create or replace function set_back_in_stock_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists back_in_stock_updated_at_trigger
on back_in_stock_subscriptions;

create trigger back_in_stock_updated_at_trigger
before update on back_in_stock_subscriptions
for each row
execute function set_back_in_stock_updated_at();
