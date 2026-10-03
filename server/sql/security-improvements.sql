-- ============================================================================
-- Security and Production Improvements Migration
-- Lustre & Co. E-Commerce Platform
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. Extend Users with Granular Permissions and Two-Factor Authentication
alter table if exists users
  add column if not exists permissions jsonb not null default '[]'::jsonb,
  add column if not exists two_factor_enabled boolean not null default false,
  add column if not exists two_factor_secret text,
  add column if not exists two_factor_temp_code text,
  add column if not exists two_factor_temp_expires timestamptz;

-- 2. Auth Refresh Tokens & Rotation Ledger
create table if not exists auth_refresh_tokens (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references users(id)
    on delete cascade,

  token_hash text not null unique,
  device_info text,
  ip_address text,

  expires_at timestamptz not null,
  revoked boolean not null default false,
  replaced_by_token_hash text,

  created_at timestamptz not null default now()
);

create index if not exists auth_refresh_tokens_user_idx
  on auth_refresh_tokens(user_id);

create index if not exists auth_refresh_tokens_hash_idx
  on auth_refresh_tokens(token_hash);

create index if not exists auth_refresh_tokens_active_idx
  on auth_refresh_tokens(user_id, revoked)
  where revoked = false;

-- 3. Comprehensive Administrative & Security Audit Logs
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references users(id)
    on delete set null,

  user_email text,
  user_role text,

  action text not null,
  resource text,
  resource_id text,

  status text not null default 'success'
    check (status in ('success', 'failed', 'denied')),

  ip_address text,
  user_agent text,
  details jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx
  on audit_logs(created_at desc);

create index if not exists audit_logs_action_idx
  on audit_logs(action);

create index if not exists audit_logs_user_idx
  on audit_logs(user_id);

create index if not exists audit_logs_resource_idx
  on audit_logs(resource, resource_id);
