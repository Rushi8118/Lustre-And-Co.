WITH tbls AS (
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
)
SELECT json_agg(json_build_object('table', tbl, 'count', cnt)) FROM (
  SELECT 'analytics_daily_metrics' AS tbl, count(*) AS cnt FROM analytics_daily_metrics
  UNION ALL SELECT 'analytics_daily_snapshots', count(*) FROM analytics_daily_snapshots
  UNION ALL SELECT 'analytics_events', count(*) FROM analytics_events
  UNION ALL SELECT 'analytics_export_jobs', count(*) FROM analytics_export_jobs
  UNION ALL SELECT 'analytics_product_daily_metrics', count(*) FROM analytics_product_daily_metrics
  UNION ALL SELECT 'audit_logs', count(*) FROM audit_logs
  UNION ALL SELECT 'auth_refresh_tokens', count(*) FROM auth_refresh_tokens
  UNION ALL SELECT 'back_in_stock_requests', count(*) FROM back_in_stock_requests
  UNION ALL SELECT 'back_in_stock_subscriptions', count(*) FROM back_in_stock_subscriptions
  UNION ALL SELECT 'cart_bundle_items', count(*) FROM cart_bundle_items
  UNION ALL SELECT 'carts', count(*) FROM carts
  UNION ALL SELECT 'categories', count(*) FROM categories
  UNION ALL SELECT 'contact_messages', count(*) FROM contact_messages
  UNION ALL SELECT 'coupons', count(*) FROM coupons
  UNION ALL SELECT 'curated_recommendations', count(*) FROM curated_recommendations
  UNION ALL SELECT 'document_sequences', count(*) FROM document_sequences
  UNION ALL SELECT 'faqs', count(*) FROM faqs
  UNION ALL SELECT 'inventory_alerts', count(*) FROM inventory_alerts
  UNION ALL SELECT 'inventory_locations', count(*) FROM inventory_locations
  UNION ALL SELECT 'inventory_movements', count(*) FROM inventory_movements
  UNION ALL SELECT 'inventory_product_locations', count(*) FROM inventory_product_locations
  UNION ALL SELECT 'inventory_reservation_items', count(*) FROM inventory_reservation_items
  UNION ALL SELECT 'inventory_reservations', count(*) FROM inventory_reservations
  UNION ALL SELECT 'inventory_suppliers', count(*) FROM inventory_suppliers
  UNION ALL SELECT 'inventory_transfer_items', count(*) FROM inventory_transfer_items
  UNION ALL SELECT 'inventory_transfers', count(*) FROM inventory_transfers
  UNION ALL SELECT 'inventory_warehouses', count(*) FROM inventory_warehouses
  UNION ALL SELECT 'loyalty_accounts', count(*) FROM loyalty_accounts
  UNION ALL SELECT 'loyalty_ledger', count(*) FROM loyalty_ledger
  UNION ALL SELECT 'loyalty_redemptions', count(*) FROM loyalty_redemptions
  UNION ALL SELECT 'loyalty_settings', count(*) FROM loyalty_settings
  UNION ALL SELECT 'loyalty_tiers', count(*) FROM loyalty_tiers
  UNION ALL SELECT 'marketing_campaign_recipients', count(*) FROM marketing_campaign_recipients
  UNION ALL SELECT 'marketing_campaigns', count(*) FROM marketing_campaigns
  UNION ALL SELECT 'marketing_email_templates', count(*) FROM marketing_email_templates
  UNION ALL SELECT 'marketing_events', count(*) FROM marketing_events
  UNION ALL SELECT 'marketing_templates', count(*) FROM marketing_templates
  UNION ALL SELECT 'marketing_unsubscribes', count(*) FROM marketing_unsubscribes
  UNION ALL SELECT 'order_invoices', count(*) FROM order_invoices
  UNION ALL SELECT 'order_items', count(*) FROM order_items
  UNION ALL SELECT 'order_returns', count(*) FROM order_returns
  UNION ALL SELECT 'orders', count(*) FROM orders
  UNION ALL SELECT 'pages', count(*) FROM pages
  UNION ALL SELECT 'payments', count(*) FROM payments
  UNION ALL SELECT 'product_bundle_items', count(*) FROM product_bundle_items
  UNION ALL SELECT 'product_bundles', count(*) FROM product_bundles
  UNION ALL SELECT 'product_co_purchases', count(*) FROM product_co_purchases
  UNION ALL SELECT 'product_images', count(*) FROM product_images
  UNION ALL SELECT 'product_views', count(*) FROM product_views
  UNION ALL SELECT 'products', count(*) FROM products
  UNION ALL SELECT 'purchase_order_items', count(*) FROM purchase_order_items
  UNION ALL SELECT 'purchase_orders', count(*) FROM purchase_orders
  UNION ALL SELECT 'recommendation_events', count(*) FROM recommendation_events
  UNION ALL SELECT 'referral_events', count(*) FROM referral_events
  UNION ALL SELECT 'return_shipments', count(*) FROM return_shipments
  UNION ALL SELECT 'reviews', count(*) FROM reviews
  UNION ALL SELECT 'search_analytics', count(*) FROM search_analytics
  UNION ALL SELECT 'settings', count(*) FROM settings
  UNION ALL SELECT 'shipment_events', count(*) FROM shipment_events
  UNION ALL SELECT 'shipment_rate_quotes', count(*) FROM shipment_rate_quotes
  UNION ALL SELECT 'shipment_webhook_events', count(*) FROM shipment_webhook_events
  UNION ALL SELECT 'shipments', count(*) FROM shipments
  UNION ALL SELECT 'shipping_methods', count(*) FROM shipping_methods
  UNION ALL SELECT 'shipping_providers', count(*) FROM shipping_providers
  UNION ALL SELECT 'shipping_zones', count(*) FROM shipping_zones
  UNION ALL SELECT 'subscribers', count(*) FROM subscribers
  UNION ALL SELECT 'users', count(*) FROM users
) counts;
