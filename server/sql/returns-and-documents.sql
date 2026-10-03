-- Returns, Refunds, Exchanges, Invoices and Legal Document Generation
create extension if not exists pgcrypto;

-- 1. Document Sequences (for thread-safe sequential numbering)
create table if not exists document_sequences (
  id text primary key, -- e.g. 'invoice-2026', 'credit_note-2026'
  doc_type text not null,
  year integer not null,
  last_number integer not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function get_next_document_number(p_doc_type text, p_year integer, p_prefix text)
returns text
language plpgsql
as $$
declare
  v_seq_id text;
  v_next_num integer;
begin
  v_seq_id := p_doc_type || '-' || p_year::text;
  
  insert into document_sequences (id, doc_type, year, last_number, updated_at)
  values (v_seq_id, p_doc_type, p_year, 1, now())
  on conflict (id) do update
  set last_number = document_sequences.last_number + 1,
      updated_at = now()
  returning last_number into v_next_num;

  return p_prefix || '-' || p_year::text || '-' || lpad(v_next_num::text, 4, '0');
end;
$$;

-- 2. Order Returns and Exchanges
create table if not exists order_returns (
  id uuid primary key default gen_random_uuid(),

  return_number text not null unique,
  order_id uuid not null references orders(id) on delete restrict,
  order_number text not null,
  user_id uuid references users(id) on delete set null,

  customer jsonb not null default '{}'::jsonb,

  request_type text not null default 'return'
    check (request_type in ('return', 'exchange')),

  status text not null default 'Requested'
    check (
      status in (
        'Requested',
        'Approved',
        'Pickup scheduled',
        'Received',
        'Inspected',
        'Refund initiated',
        'Completed',
        'Rejected',
        'Cancelled'
      )
    ),

  reason text not null,
  customer_notes text,
  items jsonb not null default '[]'::jsonb,
  photos text[] not null default '{}',

  refund_preference text not null default 'original_payment'
    check (refund_preference in ('original_payment', 'store_credit')),

  store_credit_bonus_percent numeric(5, 2) not null default 5.00,
  total_items_count integer not null default 1,

  calculated_refund_amount numeric(12, 2) not null default 0,
  actual_refund_amount numeric(12, 2) not null default 0,
  restocking_fee numeric(12, 2) not null default 0,

  pickup_address jsonb not null default '{}'::jsonb,
  pickup_courier text,
  pickup_tracking_number text,
  pickup_scheduled_date timestamptz,

  admin_notes text,
  rejection_reason text,

  inspection_status text default 'Pending'
    check (inspection_status in ('Pending', 'Passed', 'Failed', 'Partially Approved')),
  inspection_notes text,

  refund_status text not null default 'Pending'
    check (refund_status in ('Pending', 'Approved', 'Initiated', 'Completed', 'Failed')),
  refund_method text,
  refund_transaction_id text,

  exchange_item_details jsonb not null default '{}'::jsonb,
  exchange_order_id uuid references orders(id) on delete set null,
  exchange_order_number text,

  credit_note_id uuid,
  credit_note_number text,

  status_history jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists order_returns_order_idx on order_returns(order_id);
create index if not exists order_returns_user_idx on order_returns(user_id);
create index if not exists order_returns_status_idx on order_returns(status);
create index if not exists order_returns_number_idx on order_returns(return_number);

-- 3. Order Invoices & Credit Notes
create table if not exists order_invoices (
  id uuid primary key default gen_random_uuid(),

  invoice_number text not null unique,
  order_id uuid not null references orders(id) on delete restrict,
  order_number text not null,

  invoice_date timestamptz not null default now(),
  due_date timestamptz,

  invoice_type text not null default 'tax_invoice'
    check (invoice_type in ('tax_invoice', 'credit_note', 'proforma', 'receipt')),

  parent_invoice_id uuid references order_invoices(id) on delete set null,
  return_id uuid references order_returns(id) on delete set null,

  seller_details jsonb not null default '{}'::jsonb,
  buyer_details jsonb not null default '{}'::jsonb,
  shipping_address jsonb not null default '{}'::jsonb,
  billing_address jsonb not null default '{}'::jsonb,

  items jsonb not null default '[]'::jsonb,

  subtotal numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  shipping_fee numeric(12, 2) not null default 0,
  taxable_amount numeric(12, 2) not null default 0,

  cgst_rate numeric(5, 2) not null default 0,
  cgst_amount numeric(12, 2) not null default 0,
  sgst_rate numeric(5, 2) not null default 0,
  sgst_amount numeric(12, 2) not null default 0,
  igst_rate numeric(5, 2) not null default 0,
  igst_amount numeric(12, 2) not null default 0,
  total_tax numeric(12, 2) not null default 0,

  total_amount numeric(12, 2) not null default 0,
  amount_in_words text,

  payment_details jsonb not null default '{}'::jsonb,

  status text not null default 'issued'
    check (status in ('draft', 'issued', 'paid', 'cancelled', 'refunded')),

  notes text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_invoices_order_idx on order_invoices(order_id);
create index if not exists order_invoices_number_idx on order_invoices(invoice_number);
create index if not exists order_invoices_return_idx on order_invoices(return_id);

-- 4. Add helper columns to orders table if missing
alter table if exists orders
  add column if not exists invoice_number text,
  add column if not exists invoice_id uuid references order_invoices(id) on delete set null,
  add column if not exists return_status text,
  add column if not exists return_id uuid references order_returns(id) on delete set null;

-- Triggers for updated_at
create or replace function set_return_and_invoice_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists order_returns_updated_at_trigger on order_returns;
create trigger order_returns_updated_at_trigger
before update on order_returns
for each row
execute function set_return_and_invoice_updated_at();

drop trigger if exists order_invoices_updated_at_trigger on order_invoices;
create trigger order_invoices_updated_at_trigger
before update on order_invoices
for each row
execute function set_return_and_invoice_updated_at();
