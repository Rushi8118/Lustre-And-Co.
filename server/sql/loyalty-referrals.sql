-- ============================================================
-- Loyalty & Referral Program
-- Run this in the Supabase SQL editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. Settings ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_settings (
  id                              INTEGER PRIMARY KEY DEFAULT 1,
  enabled                         BOOLEAN NOT NULL DEFAULT TRUE,
  points_per_currency             NUMERIC(12, 4) NOT NULL DEFAULT 1,
  currency_unit                   NUMERIC(12, 2) NOT NULL DEFAULT 1,
  review_points                   INTEGER NOT NULL DEFAULT 50,
  referral_inviter_points         INTEGER NOT NULL DEFAULT 500,
  referral_friend_points          INTEGER NOT NULL DEFAULT 250,
  birthday_points                 INTEGER NOT NULL DEFAULT 200,
  minimum_referral_order_amount   NUMERIC(12, 2) NOT NULL DEFAULT 500,
  points_expire_days              INTEGER,
  birthday_reward_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  review_reward_enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  referral_reward_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO loyalty_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── 2. Tiers ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL UNIQUE,
  min_lifetime_points INTEGER NOT NULL DEFAULT 0,
  min_lifetime_spend  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  points_multiplier   NUMERIC(8, 4) NOT NULL DEFAULT 1,
  birthday_multiplier NUMERIC(8, 4) NOT NULL DEFAULT 1,
  benefits            JSONB NOT NULL DEFAULT '[]'::JSONB,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO loyalty_tiers (name, min_lifetime_points, min_lifetime_spend, points_multiplier, birthday_multiplier, benefits, sort_order, is_active)
VALUES
  ('Bronze', 0,    0,     1,    1,    '["Earn reward points on every purchase"]'::JSONB,                                   0, TRUE),
  ('Silver', 1000, 10000, 1.25, 1.25, '["25% points multiplier","Early access to selected offers"]'::JSONB,               1, TRUE),
  ('Gold',   3000, 30000, 1.5,  1.5,  '["50% points multiplier","Birthday bonus","Priority support"]'::JSONB,             2, TRUE),
  ('VIP',    7500, 75000, 2,    2,    '["2× points multiplier","Exclusive VIP offers","Priority support"]'::JSONB,        3, TRUE)
ON CONFLICT (name) DO NOTHING;

-- ── 3. Customer loyalty accounts ───────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  available_points       INTEGER NOT NULL DEFAULT 0,
  lifetime_points        INTEGER NOT NULL DEFAULT 0,
  redeemed_points        INTEGER NOT NULL DEFAULT 0,
  wallet_balance         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  lifetime_spend         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  current_tier_id        UUID REFERENCES loyalty_tiers(id) ON DELETE SET NULL,
  birthday_month         SMALLINT,
  birthday_day           SMALLINT,
  birthday_year          SMALLINT,
  birthday_reward_year   INTEGER,
  referral_code          TEXT NOT NULL UNIQUE,
  referred_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  referral_completed_at  TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_user         ON loyalty_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_referral     ON loyalty_accounts(referral_code);
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_tier         ON loyalty_accounts(current_tier_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_birthday     ON loyalty_accounts(birthday_month, birthday_day);

-- ── 4. Points ledger ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_ledger (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type  TEXT NOT NULL CHECK (transaction_type IN (
    'purchase','review','referral_inviter','referral_friend',
    'birthday','admin_adjustment','redemption','expiration','refund_reversal'
  )),
  points            INTEGER NOT NULL DEFAULT 0,
  wallet_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  order_id          UUID REFERENCES orders(id) ON DELETE SET NULL,
  review_id         UUID,
  referred_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  idempotency_key   TEXT NOT NULL UNIQUE,
  description       TEXT,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_user    ON loyalty_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_type    ON loyalty_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_created ON loyalty_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_expiry  ON loyalty_ledger(expires_at) WHERE expires_at IS NOT NULL;

-- ── 5. Referral events ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  referral_code        TEXT NOT NULL,
  email                TEXT,
  status               TEXT NOT NULL DEFAULT 'clicked' CHECK (status IN ('clicked','registered','qualified','rewarded','rejected')),
  landing_page         TEXT,
  session_id           TEXT,
  qualified_order_id   UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  qualified_at         TIMESTAMPTZ,
  rewarded_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_referral_events_inviter  ON referral_events(inviter_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_referred ON referral_events(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_code     ON referral_events(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_events_status   ON referral_events(status);

-- ── 6. Redemptions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_redemptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points            INTEGER NOT NULL CHECK (points > 0),
  wallet_amount     NUMERIC(12, 2) NOT NULL CHECK (wallet_amount > 0),
  idempotency_key   TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','cancelled')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. Auto-update timestamps ──────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_loyalty_settings_ts ON loyalty_settings;
CREATE TRIGGER trg_loyalty_settings_ts BEFORE UPDATE ON loyalty_settings FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_loyalty_tiers_ts ON loyalty_tiers;
CREATE TRIGGER trg_loyalty_tiers_ts BEFORE UPDATE ON loyalty_tiers FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_loyalty_accounts_ts ON loyalty_accounts;
CREATE TRIGGER trg_loyalty_accounts_ts BEFORE UPDATE ON loyalty_accounts FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
