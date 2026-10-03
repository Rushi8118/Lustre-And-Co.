-- ============================================================
-- Product Recommendations Tables
-- Run this migration in your Supabase SQL editor
-- ============================================================

-- ── 1. Product view tracking ───────────────────────────────
CREATE TABLE IF NOT EXISTS product_views (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id    TEXT,
  viewed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms   INTEGER,                          -- time spent on page
  source        TEXT DEFAULT 'direct'             -- direct | search | recommendation
);

CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_product_views_user_id    ON product_views(user_id);
CREATE INDEX IF NOT EXISTS idx_product_views_session_id ON product_views(session_id);
CREATE INDEX IF NOT EXISTS idx_product_views_viewed_at  ON product_views(viewed_at DESC);

-- ── 2. Recommendation events (clicks, impressions) ────────
CREATE TABLE IF NOT EXISTS recommendation_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id        TEXT,
  source_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  recommended_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,              -- you_may_also_like | frequently_bought | etc.
  event_type        TEXT NOT NULL DEFAULT 'impression', -- impression | click | add_to_cart
  position          INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rec_events_source      ON recommendation_events(source_product_id);
CREATE INDEX IF NOT EXISTS idx_rec_events_recommended ON recommendation_events(recommended_product_id);
CREATE INDEX IF NOT EXISTS idx_rec_events_user        ON recommendation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_rec_events_type        ON recommendation_events(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_rec_events_created_at  ON recommendation_events(created_at DESC);

-- ── 3. Frequently bought together (co-purchase pairs) ─────
CREATE TABLE IF NOT EXISTS product_co_purchases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_a_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_b_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_count  INTEGER NOT NULL DEFAULT 1,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_a_id, product_b_id)
);

CREATE INDEX IF NOT EXISTS idx_co_purchases_a ON product_co_purchases(product_a_id);
CREATE INDEX IF NOT EXISTS idx_co_purchases_b ON product_co_purchases(product_b_id);

-- ── 4. Manual curated recommendations (admin) ─────────────
CREATE TABLE IF NOT EXISTS curated_recommendations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  target_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL DEFAULT 'you_may_also_like',
  position          INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_product_id, target_product_id, recommendation_type)
);

CREATE INDEX IF NOT EXISTS idx_curated_source ON curated_recommendations(source_product_id, is_active);

-- ── 5. Order items table & Auto-update co-purchase counts ─
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

CREATE OR REPLACE FUNCTION upsert_co_purchases()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- When a new order_item is inserted, pair it with all other items in same order
  INSERT INTO product_co_purchases (product_a_id, product_b_id, order_count, last_seen_at)
  SELECT
    LEAST(NEW.product_id, oi.product_id),
    GREATEST(NEW.product_id, oi.product_id),
    1,
    NOW()
  FROM order_items oi
  WHERE oi.order_id = NEW.order_id
    AND oi.product_id != NEW.product_id
  ON CONFLICT (product_a_id, product_b_id)
  DO UPDATE SET
    order_count  = product_co_purchases.order_count + 1,
    last_seen_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_upsert_co_purchases ON order_items;
CREATE TRIGGER trg_upsert_co_purchases
  AFTER INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION upsert_co_purchases();
