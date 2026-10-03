-- ============================================================================
-- Lustre & Co. — Comprehensive Test & Demonstration Database Seed Script
-- Populates every core table with at least 30 realistic records
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CATEGORIES (Ensure base categories)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO categories (name, slug, eyebrow, title, description, image, "sortOrder", "isActive")
VALUES
  ('Necklaces', 'necklaces', 'Iconic Statements', 'Heirloom Necklaces', 'Heirloom pendants and diamond chains crafted for timeless elegance.', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80', 1, true),
  ('Earrings', 'earrings', 'Everyday Sparkle', 'Earrings Collection', 'From delicate diamond studs to regal chandeliers.', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80', 2, true),
  ('Rings', 'rings', 'Eternal Solitaires', 'Fine Rings & Solitaires', 'Hand-set gemstone and diamond bands for milestone memories.', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80', 3, true),
  ('Bracelets', 'bracelets', 'Artisanal Cuffs', 'Artisanal Bracelets', 'Subtle wrist adornments and tennis chains plated in 18K gold.', 'https://images.unsplash.com/photo-1611591475836-1e6d42157544?auto=format&fit=crop&w=800&q=80', 4, true),
  ('Bangles', 'bangles', 'Heritage Splendor', 'Heritage Bangles & Kadas', 'Intricate openable bangles inspired by royal Indian craftsmanship.', 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=80', 5, true)
ON CONFLICT (slug) DO UPDATE
SET description = EXCLUDED.description;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PRODUCTS (Ensure 35+ Luxury Products)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO products (
  slug, name, sku, category, "collectionName", occasion, price, "oldPrice",
  badge, finish, material, "availableColors", "availableSizes", availability,
  "stockQuantity", "salesCount", image, gallery, description, details, care,
  shipping, returns, tags, "isActive", "isFeatured", rating, reviews
)
VALUES
  ('celestial-diamond-pendant', 'Celestial Diamond Pendant', 'LC-VIP-NEC-001', 'necklaces', 'festive', 'bridal', 24999, 29999, 'Bestseller', '18K Yellow Gold', '18K Solid Gold & VS1 Diamonds', ARRAY['Gold', 'Rose Gold', 'White Gold'], ARRAY['16 inch', '18 inch'], 'in-stock', 45, 120, 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80', ARRAY['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80'], 'Graceful astral design featuring solitaire diamond accents.', ARRAY['18K Hallmarked Gold', 'Diamond Clarity: VS1', 'Chain length: 18 inches'], ARRAY['Store in airtight velvet pouch', 'Avoid perfumes'], ARRAY['Free insured express shipping across India'], ARRAY['15-day return guarantee'], ARRAY['diamond', 'gold', 'pendant', 'luxury'], true, true, 4.9, 38),
  ('solitaire-halo-ring', 'Solitaire Halo Engagement Ring', 'LC-VIP-RNG-002', 'rings', 'bridal', 'wedding', 45999, 52999, 'Iconic', 'Platinum & 18K White Gold', 'Lab-Grown Certified Diamond', ARRAY['White Gold', 'Platinum'], ARRAY['10', '12', '14', '16'], 'in-stock', 30, 85, 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80', ARRAY['https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80'], 'Timeless 1.2ct central solitaire embraced by a scintillating micropavé halo.', ARRAY['1.2 Carat Centre Stone', 'GIA/IGI Certified', 'Conflict-Free'], ARRAY['Clean with soft micro-fiber cloth'], ARRAY['Free insured express delivery'], ARRAY['Lifetime exchange policy'], ARRAY['ring', 'solitaire', 'bridal', 'diamond'], true, true, 5.0, 42),
  ('emerald-cascade-drop-earrings', 'Emerald Cascade Drop Earrings', 'LC-VIP-EAR-003', 'earrings', 'festive', 'cocktail', 18999, 23999, 'Limited Edition', '18K Gold Vermeil', 'Hydrothermal Colombian Emerald & Zirconia', ARRAY['Gold'], ARRAY['Standard'], 'in-stock', 25, 64, 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80', ARRAY['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80'], 'Stunning chandelier drops reflecting rich green hues.', ARRAY['Weight: 14.5g', 'Push back closure', 'Nickel-free'], ARRAY['Wipe clean after use'], ARRAY['Fast 2-3 day shipping'], ARRAY['15-day exchange'], ARRAY['earrings', 'emerald', 'statement'], true, true, 4.8, 29),
  ('eternity-tennis-bracelet', 'Eternity Tennis Bracelet', 'LC-VIP-BRC-004', 'bracelets', 'everyday', 'everyday', 32999, 38999, 'Trending', '18K White Gold Plated', 'Cubic Zirconia 5A Grade & Brass', ARRAY['Silver', 'Rose Gold', 'Gold'], ARRAY['6.5 inch', '7 inch', '7.5 inch'], 'in-stock', 50, 150, 'https://images.unsplash.com/photo-1611591475836-1e6d42157544?auto=format&fit=crop&w=800&q=80', ARRAY['https://images.unsplash.com/photo-1611591475836-1e6d42157544?auto=format&fit=crop&w=800&q=80'], 'Seamless channel of radiant square brilliant cut crystals with safety clasp.', ARRAY['Double safety clasp', 'Water resistant finish', 'Length: 7 in'], ARRAY['Avoid salt water and chlorine'], ARRAY['Express door-step delivery'], ARRAY['Hassle free returns'], ARRAY['tennis', 'bracelet', 'glamour'], true, true, 4.9, 74),
  ('royal-heritage-kundan-bangle', 'Royal Heritage Kundan Bangle', 'LC-VIP-BNG-005', 'bangles', 'bridal', 'wedding', 28999, 34999, 'Artisanal', '22K Gold Foil Plating', 'Handcrafted Polki & Kundan Stones with Meenakari', ARRAY['Gold'], ARRAY['2.4', '2.6', '2.8'], 'in-stock', 20, 48, 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=80', ARRAY['https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=80'], 'Openable screw kada lined with reverse red Meenakari enamel art.', ARRAY['Traditional Jaipur Enamel', 'Openable hinge mechanism'], ARRAY['Store in silk wrap away from moisture'], ARRAY['Tamper-proof package delivery'], ARRAY['Authenticity guaranteed'], ARRAY['bangle', 'kundan', 'heritage', 'polki'], true, false, 4.7, 31)
ON CONFLICT (slug) DO UPDATE
SET price = EXCLUDED.price;

-- Generate 30 additional dynamic luxury products to ensure 35+ items
DO $$
DECLARE
  v_cats text[] := ARRAY['necklaces', 'earrings', 'rings', 'bracelets', 'bangles'];
  v_metals text[] := ARRAY['18K Gold Plated', '22K Antique Gold', 'Rose Gold Vermeil', 'Rhodium Polished', 'Platinum Finish'];
  v_occasions text[] := ARRAY['everyday', 'festive', 'bridal', 'workwear', 'gifting'];
  v_i integer;
  v_slug text;
  v_name text;
  v_cat text;
  v_price numeric;
BEGIN
  FOR v_i IN 6..35 LOOP
    v_cat := v_cats[1 + (v_i % 5)];
    v_slug := 'lustre-exclusive-' || v_cat || '-' || v_i;
    v_name := 'Lustre ' || initcap(v_cat) || ' No. ' || v_i || ' Collection';
    v_price := 4999 + (v_i * 850);

    INSERT INTO products (
      slug, name, sku, category, "collectionName", occasion, price, "oldPrice",
      badge, finish, material, "availableColors", "availableSizes", availability,
      "stockQuantity", "salesCount", image, gallery, description, details, care,
      shipping, returns, tags, "isActive", "isFeatured", rating, reviews
    )
    VALUES (
      v_slug,
      v_name,
      'LC-VIP-' || upper(substring(v_cat from 1 for 3)) || '-' || lpad(v_i::text, 3, '0'),
      v_cat,
      v_occasions[1 + (v_i % 5)],
      v_occasions[1 + ((v_i + 1) % 5)],
      v_price,
      v_price + 2500,
      CASE WHEN v_i % 3 = 0 THEN 'Trending' WHEN v_i % 4 = 0 THEN 'Bestseller' ELSE NULL END,
      v_metals[1 + (v_i % 5)],
      'Hallmarked 925 Sterling Silver & Micro-Pavé Crystals',
      ARRAY['Yellow Gold', 'Rose Gold', 'Silver'],
      ARRAY['Standard', 'Adjustable'],
      CASE WHEN v_i = 10 THEN 'out-of-stock' ELSE 'in-stock' END,
      CASE WHEN v_i = 10 THEN 0 ELSE 25 + (v_i * 3) END,
      v_i * 12,
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
      ARRAY['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80'],
      'An exquisite piece blending contemporary minimalism with royal artistry.',
      ARRAY['Hand-finished craftsmanship', 'Hypoallergenic & lead free'],
      ARRAY['Keep away from chemicals and water'],
      ARRAY['Ships within 24-48 hours'],
      ARRAY['15-day replacement policy'],
      ARRAY['luxury', v_cat, 'exclusive', 'handcrafted'],
      true,
      (v_i % 4 = 0),
      4.5 + ((v_i % 5) * 0.1),
      15 + (v_i * 2)
    )
    ON CONFLICT (slug) DO NOTHING;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. USERS (At least 35 Customers & Admins with Addresses)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_i integer;
  v_names text[] := ARRAY[
    'Aarav Sharma', 'Diya Patel', 'Rohan Mehta', 'Ananya Iyer', 'Vikram Malhotra',
    'Pooja Nair', 'Kabir Sengupta', 'Ishita Verma', 'Siddharth Rao', 'Neha Joshi',
    'Aditya Kulkarni', 'Sneha Kapoor', 'Arjun Singhania', 'Rhea Bansal', 'Karan Saxena',
    'Tanvi Deshmukh', 'Yash Chopra', 'Meera Nambiar', 'Devansh Agrawal', 'Kavya Pillai',
    'Varun Dhawan', 'Simran Kaur', 'Harsh Goel', 'Tara Sutaria', 'Pranav Menon',
    'Avani Bhatia', 'Manish Reddy', 'Swati Trivedi', 'Nikhil Choudhary', 'Anushka Sen',
    'Gaurav Mittal', 'Pallavi Shinde', 'Rishi Oberoi', 'Kritika Roy', 'Sanjay Dutt'
  ];
  v_cities text[] := ARRAY['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];
  v_states text[] := ARRAY['Maharashtra', 'Delhi', 'Karnataka', 'Telangana', 'Tamil Nadu', 'West Bengal', 'Maharashtra', 'Gujarat', 'Rajasthan', 'Uttar Pradesh'];
  v_pincodes text[] := ARRAY['400050', '110001', '560001', '500001', '600001', '700001', '411001', '380001', '302001', '226001'];
  v_email text;
  v_addr jsonb;
BEGIN
  -- Admin User
  INSERT INTO users (
    name, email, password, role, phone, "isActive", addresses, "createdAt"
  )
  VALUES (
    'Store Administrator',
    'admin@lustre.com',
    '$2a$10$8s5R/y31v3.2gX1wz7qBhuT.zQ5mJqO2y5y4R/Q9e9gX1wz7qBhuT', -- Admin@123
    'admin',
    '+91 98765 00001',
    true,
    '[{"street": "104 Zaveri Bazaar", "city": "Mumbai", "state": "Maharashtra", "pincode": "400002", "isDefault": true}]'::jsonb,
    NOW() - INTERVAL '60 days'
  ) ON CONFLICT (email) DO NOTHING;

  -- 34 Customers
  FOR v_i IN 2..35 LOOP
    v_email := lower(replace(v_names[v_i], ' ', '.')) || '@example.com';
    v_addr := jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'name', v_names[v_i],
        'phone', '+91 98' || lpad(v_i::text, 8, '0'),
        'street', (10 + v_i)::text || ', Luxury Crescent, Sector ' || (v_i % 15)::text,
        'city', v_cities[1 + (v_i % 10)],
        'state', v_states[1 + (v_i % 10)],
        'pincode', v_pincodes[1 + (v_i % 10)],
        'isDefault', true
      )
    );

    INSERT INTO users (
      name, email, password, role, phone, "isActive", addresses, "createdAt", "updatedAt"
    )
    VALUES (
      v_names[v_i],
      v_email,
      '$2a$10$8s5R/y31v3.2gX1wz7qBhuT.zQ5mJqO2y5y4R/Q9e9gX1wz7qBhuT',
      'customer',
      '+91 98' || lpad(v_i::text, 8, '0'),
      true,
      v_addr,
      NOW() - ((36 - v_i) * INTERVAL '1 day'),
      NOW() - ((36 - v_i) * INTERVAL '1 day')
    )
    ON CONFLICT (email) DO UPDATE
    SET name = EXCLUDED.name,
        addresses = EXCLUDED.addresses;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ORDERS & PAYMENTS (35 Complete Commercial Orders with Payments)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_i integer;
  v_oid uuid;
  v_order_num text;
  v_user record;
  v_prod record;
  v_subtotal numeric;
  v_tax numeric;
  v_shipping numeric;
  v_discount numeric;
  v_total numeric;
  v_status text;
  v_pay_status text;
  v_method text;
  v_statuses text[] := ARRAY['Delivered', 'Delivered', 'In Transit', 'Processing', 'Delivered', 'Cancelled', 'Delivered'];
  v_pay_methods text[] := ARRAY['razorpay', 'razorpay', 'cod', 'razorpay', 'card'];
  v_created_at timestamptz;
BEGIN
  FOR v_i IN 1..35 LOOP
    v_oid := gen_random_uuid();
    v_order_num := 'LC-ORD-2026-' || lpad((1000 + v_i)::text, 5, '0');

    -- Pick a user
    SELECT * INTO v_user FROM users WHERE email LIKE '%@example.com' ORDER BY id OFFSET (v_i % 30) LIMIT 1;
    -- Pick a product
    SELECT * INTO v_prod FROM products WHERE availability = 'in-stock' ORDER BY id OFFSET (v_i % 25) LIMIT 1;

    v_subtotal := COALESCE(v_prod.price, 14999);
    v_tax := round(v_subtotal * 0.03, 2); -- 3% GST on jewellery
    v_shipping := CASE WHEN v_subtotal > 20000 THEN 0 ELSE 250 END;
    v_discount := CASE WHEN v_i % 4 = 0 THEN 1000 ELSE 0 END;
    v_total := GREATEST(999, round(v_subtotal + v_tax + v_shipping - v_discount, 2));

    v_status := v_statuses[1 + (v_i % 7)];
    v_method := v_pay_methods[1 + (v_i % 5)];
    v_pay_status := CASE WHEN v_status = 'Cancelled' THEN 'failed' ELSE 'paid' END;
    v_created_at := NOW() - ((36 - v_i) * INTERVAL '1 day' + (v_i * 45) * INTERVAL '1 minute');

    INSERT INTO orders (
      id, "orderId", "user", customer, "shippingAddress", items, subtotal, discount,
      "promoCode", "shippingFee", "deliverySurcharge", tax, total, "deliveryOption",
      notes, status, "statusHistory", payment, carrier, "trackingNumber",
      "estimatedDeliveryDate", "stockRestored", "createdAt", "updatedAt"
    )
    VALUES (
      v_oid,
      v_order_num,
      v_user.id,
      jsonb_build_object(
        'name', v_user.name,
        'email', v_user.email,
        'phone', v_user.phone
      ),
      COALESCE(v_user.addresses->0, '{"city": "Mumbai", "state": "Maharashtra", "pincode": "400050"}'::jsonb),
      jsonb_build_array(
        jsonb_build_object(
          'id', v_prod.id,
          'productId', v_prod.id,
          'name', v_prod.name,
          'slug', v_prod.slug,
          'sku', v_prod.sku,
          'price', v_prod.price,
          'quantity', 1,
          'total', v_prod.price,
          'image', v_prod.image
        )
      ),
      v_subtotal,
      v_discount,
      CASE WHEN v_discount > 0 THEN 'LUSTRE10' ELSE NULL END,
      v_shipping,
      0,
      v_tax,
      v_total,
      'standard',
      'Client ordered from direct web session.',
      v_status,
      jsonb_build_array(
        jsonb_build_object('status', 'Confirmed', 'at', v_created_at),
        jsonb_build_object('status', v_status, 'at', v_created_at + INTERVAL '2 hours')
      ),
      jsonb_build_object('method', v_method, 'status', v_pay_status),
      'Bluedart Air Express',
      'SR2026IN' || lpad(v_i::text, 6, '0'),
      to_char(v_created_at + INTERVAL '3 days', 'YYYY-MM-DD'),
      false,
      v_created_at,
      v_created_at
    )
    ON CONFLICT ("orderId") DO NOTHING;

    -- Ensure Order Items
    INSERT INTO order_items (order_id, product_id, quantity, price, created_at)
    VALUES (
      v_oid,
      v_prod.id,
      1,
      v_prod.price,
      v_created_at
    )
    ON CONFLICT DO NOTHING;

    -- Insert Payment record
    INSERT INTO payments (
      "order", "orderId", "user", amount, currency, method, status,
      "razorpayOrderId", "razorpayPaymentId", "paidAt", "createdAt", "updatedAt"
    )
    VALUES (
      v_oid,
      v_order_num,
      v_user.id,
      v_total,
      'INR',
      v_method,
      v_pay_status,
      'order_rp_' || lpad(v_i::text, 10, '0'),
      'pay_rp_' || lpad(v_i::text, 10, '0'),
      CASE WHEN v_pay_status = 'paid' THEN v_created_at ELSE NULL END,
      v_created_at,
      v_created_at
    )
    ON CONFLICT ("orderId") DO NOTHING;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ORDER INVOICES & LEGAL DOCUMENTS (35 Tax Invoices)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_order record;
  v_i integer := 0;
BEGIN
  FOR v_order IN SELECT * FROM orders ORDER BY "createdAt" ASC LIMIT 35 LOOP
    v_i := v_i + 1;
    INSERT INTO order_invoices (
      invoice_number, order_id, order_number, invoice_date, due_date, status,
      buyer_details, billing_address, shipping_address,
      items, subtotal, discount, shipping_fee, taxable_amount, total_tax, total_amount,
      created_at, updated_at
    )
    VALUES (
      'INV-2026-' || lpad(v_i::text, 5, '0'),
      v_order.id,
      v_order."orderId",
      v_order."createdAt",
      v_order."createdAt" + INTERVAL '15 days',
      CASE WHEN v_order.status = 'Cancelled' THEN 'cancelled' ELSE 'paid' END,
      v_order.customer,
      v_order."shippingAddress",
      v_order."shippingAddress",
      v_order.items,
      v_order.subtotal,
      v_order.discount,
      v_order."shippingFee",
      v_order.subtotal - v_order.discount,
      v_order.tax,
      v_order.total,
      v_order."createdAt",
      v_order."createdAt"
    )
    ON CONFLICT (invoice_number) DO NOTHING;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SHIPMENTS & CARRIER DISPATCH LOGS (35 Shipments)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_order record;
  v_i integer := 0;
  v_carriers text[] := ARRAY['shiprocket', 'delhivery', 'bluedart'];
  v_carrier text;
BEGIN
  FOR v_order IN SELECT * FROM orders ORDER BY "createdAt" ASC LIMIT 35 LOOP
    v_i := v_i + 1;
    v_carrier := v_carriers[1 + (v_i % 3)];

    IF NOT EXISTS (SELECT 1 FROM shipments WHERE order_id = v_order.id) THEN
      INSERT INTO shipments (
        order_id, tracking_number, tracking_url, status, courier_name,
        service_name, delivery_address, shipping_cost, shipped_at, delivered_at, created_at
      )
      VALUES (
        v_order.id,
        upper(v_carrier) || '-AWB-' || lpad(v_i::text, 8, '0'),
        'https://track.' || v_carrier || '.com/' || upper(v_carrier) || '-AWB-' || lpad(v_i::text, 8, '0'),
        CASE WHEN v_order.status = 'Delivered' THEN 'delivered' ELSE 'in_transit' END,
        initcap(v_carrier),
        'Express Air',
        v_order."shippingAddress",
        v_order."shippingFee",
        v_order."createdAt" + INTERVAL '6 hours',
        CASE WHEN v_order.status = 'Delivered' THEN v_order."createdAt" + INTERVAL '2 days' ELSE NULL END,
        v_order."createdAt"
      );
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. REVIEWS (At least 35 Verified Customer Reviews)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_i integer;
  v_user record;
  v_prod record;
  v_comments text[] := ARRAY[
    'Beyond breathtaking. The gold polish has that true bridal heirloom warmth.',
    'Exquisite sparkle! Looks far more expensive than it is. Super comfortable.',
    'The craftsmanship is pristine. Secure packaging and fast insured delivery.',
    'Wore this for my brother reception and received endless compliments.',
    'Delicate yet durable. The finish is radiant and allergy-safe.',
    'A staple in my everyday fine jewelry rotation. 10/10 recommended.',
    'The packaging velvet box feels truly royal. Flawless unboxing experience.'
  ];
BEGIN
  FOR v_i IN 1..35 LOOP
    SELECT * INTO v_user FROM users WHERE role = 'customer' ORDER BY id OFFSET (v_i % 30) LIMIT 1;
    SELECT * INTO v_prod FROM products ORDER BY id OFFSET (v_i % 25) LIMIT 1;

    INSERT INTO reviews (
      product, "user", author, rating, title, comment, status, "verifiedPurchase", "createdAt"
    )
    VALUES (
      v_prod.id,
      v_user.id,
      v_user.name,
      CASE WHEN v_i % 5 = 0 THEN 4 ELSE 5 END,
      'Magnificent Piece & Flawless Finish',
      v_comments[1 + (v_i % 7)],
      'approved',
      true,
      NOW() - ((40 - v_i) * INTERVAL '1 day')
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. ORDER RETURNS (30 Customer RMA & Refund Requests)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_order record;
  v_i integer := 0;
  v_reasons text[] := ARRAY['Wrong size ordered', 'Want a different finish', 'Exchange for higher carat', 'Ring sizer mismatch', 'Gift recipient preferred necklace'];
  v_statuses text[] := ARRAY['Approved', 'Completed', 'Requested', 'Inspected', 'Completed'];
BEGIN
  FOR v_order IN SELECT * FROM orders WHERE status = 'Delivered' ORDER BY "createdAt" DESC LIMIT 30 LOOP
    v_i := v_i + 1;
    INSERT INTO order_returns (
      return_number, order_id, order_number, user_id, customer, request_type,
      status, reason, items, calculated_refund_amount, actual_refund_amount,
      refund_status, created_at, updated_at
    )
    VALUES (
      'RMA-2026-' || lpad(v_i::text, 4, '0'),
      v_order.id,
      v_order."orderId",
      v_order."user",
      v_order.customer,
      CASE WHEN v_i % 2 = 0 THEN 'exchange' ELSE 'return' END,
      v_statuses[1 + (v_i % 5)],
      v_reasons[1 + (v_i % 5)],
      v_order.items,
      v_order.total,
      v_order.total,
      CASE WHEN v_statuses[1 + (v_i % 5)] = 'Completed' THEN 'Completed' ELSE 'Pending' END,
      v_order."createdAt" + INTERVAL '5 days',
      NOW()
    )
    ON CONFLICT (return_number) DO NOTHING;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. CARTS & ABANDONED CARTS (30 Active & Recoverable Carts)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_user record;
  v_prod record;
  v_i integer := 0;
BEGIN
  FOR v_user IN SELECT * FROM users WHERE role = 'customer' ORDER BY id LIMIT 30 LOOP
    v_i := v_i + 1;
    SELECT * INTO v_prod FROM products ORDER BY id OFFSET (v_i % 25) LIMIT 1;

    INSERT INTO carts (
      "user", items, "recoveryEmail", "customerName", phone, "createdAt", "updatedAt"
    )
    VALUES (
      v_user.id,
      jsonb_build_array(
        jsonb_build_object(
          'id', v_prod.id,
          'productId', v_prod.id,
          'name', v_prod.name,
          'price', v_prod.price,
          'quantity', 1,
          'image', v_prod.image
        )
      ),
      v_user.email,
      v_user.name,
      v_user.phone,
      NOW() - (v_i * INTERVAL '2 hours'),
      NOW() - (v_i * INTERVAL '2 hours')
    )
    ON CONFLICT ("user") DO UPDATE
    SET "updatedAt" = EXCLUDED."updatedAt",
        "recoveryEmail" = EXCLUDED."recoveryEmail";
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. COUPONS & PROMO CODES (30 Active Promo Campaigns)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_i integer;
  v_codes text[] := ARRAY[
    'SHINE10', 'LUSTRE20', 'FREESHIP', 'BRIDAL25', 'FESTIVE15',
    'ROYAL30', 'DIAMOND50', 'GOLD100', 'WELCOME10', 'VALENTINE',
    'DIWALI24', 'AKSHAYATRITIYA', 'WEDDING50', 'SPARKLE15', 'HERITAGE20',
    'EXCLUSIVE10', 'GLAMOUR25', 'SOLITAIRE5', 'SUMMER10', 'WINTER20',
    'FIRSTBUY', 'VIPMEMBER', 'CARTRECOVER', 'BDAYSPECIAL', 'ANNIVERSARY',
    'LUXURYDEAL', 'TIMELESS15', 'PEARL20', 'EMERALD30', 'PLATINUM'
  ];
BEGIN
  FOR v_i IN 1..30 LOOP
    INSERT INTO coupons (
      code, type, value, description, "minOrderAmount",
      "usageLimit", "usedCount", "expiresAt", "isActive", "createdAt"
    )
    VALUES (
      v_codes[v_i],
      CASE WHEN v_i % 2 = 0 THEN 'percentage' ELSE 'fixed' END,
      CASE WHEN v_i % 2 = 0 THEN 10 + (v_i % 15) ELSE 500 + (v_i * 50) END,
      'Exclusive luxury promotional discount code ' || v_codes[v_i],
      3000 + (v_i * 200),
      1000,
      v_i * 7,
      NOW() + INTERVAL '180 days',
      true,
      NOW()
    )
    ON CONFLICT (code) DO NOTHING;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. INVENTORY: WAREHOUSES, SUPPLIERS, & STOCK MOVEMENTS (35+ Records)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO inventory_warehouses (code, name, address, city, state, postal_code, is_active, is_default)
VALUES
  ('WH-BOM-01', 'Mumbai Central Vault', '104 Zaveri Bazaar', 'Mumbai', 'Maharashtra', '400002', true, true),
  ('WH-DEL-02', 'Delhi Heritage Hub', '44 Chandni Chowk Jewels Enclave', 'Delhi', 'Delhi', '110006', true, false),
  ('WH-BLR-03', 'Bengaluru Southern Dispatch', '12 Commercial Street', 'Bengaluru', 'Karnataka', '560001', true, false),
  ('WH-JAI-04', 'Jaipur Artisanal Workshop', '88 Johari Bazaar', 'Jaipur', 'Rajasthan', '302003', true, false),
  ('WH-HYD-05', 'Hyderabad Nizam Vault', '19 Charminar Pearl Plaza', 'Hyderabad', 'Telangana', '500002', true, false)
ON CONFLICT (code) DO NOTHING;

INSERT INTO inventory_suppliers (code, name, contact_name, email, phone, is_active)
VALUES
  ('SUP-JAI-01', 'Surat Diamond Craft Ltd', 'Rajesh Choksi', 'rajesh@suratcraft.com', '+91 98250 11223', true),
  ('SUP-JAI-02', 'Jaipur Heritage Polki Guild', 'Mahesh Rathore', 'mahesh@jaipurguild.com', '+91 94140 33445', true),
  ('SUP-MUM-03', 'Zaveri Gold Refinery Pvt Ltd', 'Kunal Mehta', 'kunal@zaverirefinery.in', '+91 98200 55667', true),
  ('SUP-BLR-04', 'Deccan Gems & Precious Metals', 'Suresh Reddy', 'suresh@deccangems.com', '+91 98450 77889', true),
  ('SUP-KOL-05', 'Bengal Filigree Masters', 'Subhash Sen', 'subhash@filigreemasters.com', '+91 98310 99001', true)
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE
  v_i integer;
  v_prod record;
  v_wh record;
BEGIN
  SELECT * INTO v_wh FROM inventory_warehouses LIMIT 1;
  FOR v_i IN 1..35 LOOP
    SELECT * INTO v_prod FROM products ORDER BY id OFFSET (v_i % 25) LIMIT 1;
    INSERT INTO inventory_movements (
      product_id, warehouse_id, movement_type, quantity, stock_before, stock_after,
      reserved_before, reserved_after, reference_type, idempotency_key, reason, created_at
    )
    VALUES (
      v_prod.id,
      v_wh.id,
      CASE WHEN v_i % 3 = 0 THEN 'purchase_received' WHEN v_i % 3 = 1 THEN 'reservation_commit' ELSE 'manual_adjustment' END,
      CASE WHEN v_i % 3 = 1 THEN -1 ELSE 15 END,
      v_prod."stockQuantity",
      v_prod."stockQuantity" + (CASE WHEN v_i % 3 = 1 THEN -1 ELSE 15 END),
      0,
      0,
      'purchase_order',
      'idemp_mov_' || lpad(v_i::text, 10, '0'),
      'Quarterly inventory audit batch ' || v_i,
      NOW() - ((36 - v_i) * INTERVAL '1 day')
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. MARKETING: TEMPLATES, CAMPAIGNS & RECIPIENTS (35+ Records)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO marketing_email_templates (name, slug, campaign_type, subject, preview_text, html_body, variables, is_active)
VALUES
  ('Welcome to Lustre & Co.', 'welcome-series', 'newsletter', 'Welcome to a world of royal sparkle, {{customerName}}', 'Exclusive royal rewards await your first order', '<h1>Welcome {{customerName}}</h1><p>Thank you for entering the regal world of {{storeName}}. Discover hand-set diamonds and heritage bridal jewels.</p><p><a href="{{unsubscribeLink}}">Unsubscribe</a></p>', '["customerName", "storeName", "unsubscribeLink"]'::jsonb, true),
  ('Abandoned Bag Reminder', 'abandoned-bag', 'abandoned_cart', 'You left something radiant in your bag, {{customerName}}', 'Your pieces are reserved for the next 24 hours', '<h1>Your bag is waiting</h1><p>We saved your favorite jewelry. Complete your order using code <strong>{{couponCode}}</strong>.</p><p><a href="{{unsubscribeLink}}">Unsubscribe</a></p>', '["customerName", "couponCode", "unsubscribeLink"]'::jsonb, true),
  ('Back In Stock Notification', 'back-in-stock-notice', 'back_in_stock', '{{productName}} is back in stock!', 'Secure yours before the limited vault runs out', '<h1>Good news, {{customerName}}</h1><p>{{productName}} has returned to stock.</p><p><a href="{{productLink}}">Shop Now</a></p><p><a href="{{unsubscribeLink}}">Unsubscribe</a></p>', '["customerName", "productName", "productLink", "unsubscribeLink"]'::jsonb, true),
  ('Diwali Festive Sale', 'festive-sale', 'sale', 'Exclusive Diwali Festive Vault is Open', 'Enjoy up to 25% off heirloom Polki & Kundan bangles', '<h1>Festive Sparkle</h1><p>Celebrate auspicious moments with pure hallmarked gold.</p><p><a href="{{unsubscribeLink}}">Unsubscribe</a></p>', '["customerName", "storeName", "unsubscribeLink"]'::jsonb, true),
  ('Post Purchase Review Request', 'review-request', 'review_request', 'How do you love your new jewelry piece, {{customerName}}?', 'Share your radiance and earn 50 loyalty points', '<h1>Tell us about your piece</h1><p>Your feedback helps our master karigars craft even finer jewels.</p><p><a href="{{reviewLink}}">Leave a Review</a></p>', '["customerName", "reviewLink"]'::jsonb, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO marketing_templates (id, name, template_key, campaign_type, subject, preheader, html_body, variables, is_active)
SELECT id, name, slug, campaign_type, subject, preview_text, html_body, variables, is_active
FROM marketing_email_templates
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  v_i integer;
  v_tmpl record;
  v_camp_types text[] := ARRAY['newsletter', 'new_product', 'sale', 'order_update', 'abandoned_cart', 'review_request', 'back_in_stock'];
  v_camp_statuses text[] := ARRAY['sent', 'sent', 'scheduled', 'draft', 'sending'];
BEGIN
  SELECT * INTO v_tmpl FROM marketing_templates LIMIT 1;
  FOR v_i IN 1..30 LOOP
    INSERT INTO marketing_campaigns (
      name, campaign_type, template_id, status, total_recipients, sent_count,
      scheduled_at, started_at, completed_at, created_at
    )
    VALUES (
      'Seasonal Campaign Vol. ' || v_i,
      v_camp_types[1 + (v_i % 7)],
      v_tmpl.id,
      v_camp_statuses[1 + (v_i % 5)],
      40,
      CASE WHEN v_i % 5 IN (0, 1) THEN 40 ELSE 0 END,
      NOW() - ((35 - v_i) * INTERVAL '1 day'),
      NOW() - ((35 - v_i) * INTERVAL '1 day'),
      NOW() - ((35 - v_i) * INTERVAL '1 day' - INTERVAL '1 hour'),
      NOW() - ((35 - v_i) * INTERVAL '1 day')
    );
  END LOOP;
END $$;

-- 35 Back in stock subscriptions
DO $$
DECLARE
  v_i integer;
  v_user record;
  v_prod record;
BEGIN
  FOR v_i IN 1..35 LOOP
    SELECT * INTO v_user FROM users WHERE role = 'customer' ORDER BY id OFFSET (v_i % 30) LIMIT 1;
    SELECT * INTO v_prod FROM products ORDER BY id OFFSET (v_i % 25) LIMIT 1;

    INSERT INTO back_in_stock_subscriptions (
      product_id, email, phone, user_id, status, notify_by_email, notify_by_sms, created_at
    )
    VALUES (
      v_prod.id,
      'bis.' || v_i || '.' || v_user.email,
      v_user.phone,
      v_user.id,
      CASE WHEN v_i % 3 = 0 THEN 'notified' ELSE 'active' END,
      true,
      (v_i % 2 = 0),
      NOW() - (v_i * INTERVAL '12 hours')
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. ANALYTICS: EVENTS & DAILY SNAPSHOTS (100+ Events & 30 Days of Metrics)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_i integer;
  v_order record;
  v_user record;
  v_devices text[] := ARRAY['mobile', 'desktop', 'tablet', 'mobile'];
  v_browsers text[] := ARRAY['Chrome', 'Safari', 'Firefox', 'Edge'];
  v_cities text[] := ARRAY['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'];
  v_paths text[] := ARRAY['/', '/catalog', '/product/celestial-diamond-pendant', '/cart', '/checkout'];
  v_evt_types text[] := ARRAY['session_start', 'page_view', 'add_to_cart', 'page_view', 'purchase'];
BEGIN
  FOR v_i IN 1..100 LOOP
    SELECT * INTO v_user FROM users WHERE role = 'customer' ORDER BY id OFFSET (v_i % 30) LIMIT 1;
    SELECT * INTO v_order FROM orders ORDER BY id OFFSET (v_i % 30) LIMIT 1;

    INSERT INTO analytics_events (
      user_id, session_id, event_type, product_id, order_id, page_path,
      device_type, browser, operating_system, country, state, city, created_at
    )
    VALUES (
      v_user.id,
      'sess_' || lpad((v_i % 20)::text, 8, '0'),
      v_evt_types[1 + (v_i % 5)],
      (v_order.items->0->>'productId')::uuid,
      CASE WHEN v_evt_types[1 + (v_i % 5)] = 'purchase' THEN v_order.id ELSE NULL END,
      v_paths[1 + (v_i % 5)],
      v_devices[1 + (v_i % 4)],
      v_browsers[1 + (v_i % 4)],
      'iOS',
      'India',
      'Maharashtra',
      v_cities[1 + (v_i % 8)],
      NOW() - ((100 - v_i) * INTERVAL '6 hours')
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- 30 Daily Snapshots
DO $$
DECLARE
  v_i integer;
  v_day date;
  v_rev numeric;
BEGIN
  FOR v_i IN 1..30 LOOP
    v_day := (CURRENT_DATE - (30 - v_i));
    v_rev := 35000 + (v_i * 2400) + ((v_i % 7) * 4500);

    INSERT INTO analytics_daily_snapshots (
      snapshot_date, gross_revenue, net_revenue, refund_total,
      order_count, customer_count, created_at
    )
    VALUES (
      v_day,
      v_rev,
      v_rev * 0.95,
      v_rev * 0.05,
      2 + (v_i % 4),
      2 + (v_i % 3),
      v_day + TIME '23:59:59'
    )
    ON CONFLICT (snapshot_date) DO NOTHING;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. LOYALTY & REWARDS: ACCOUNTS, LEDGER & REFERRALS (35+ Records)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_user record;
  v_i integer := 0;
  v_pts integer;
BEGIN
  FOR v_user IN SELECT * FROM users WHERE role = 'customer' ORDER BY id LIMIT 35 LOOP
    v_i := v_i + 1;
    v_pts := 500 + (v_i * 150);

    INSERT INTO loyalty_accounts (
      user_id, available_points, lifetime_points, redeemed_points,
      wallet_balance, lifetime_spend, referral_code, created_at
    )
    VALUES (
      v_user.id,
      v_pts,
      v_pts + 250,
      250,
      (v_pts * 0.5)::numeric(12,2),
      (v_i * 18500)::numeric(12,2),
      'REF' || upper(substring(v_user.name from 1 for 3)) || lpad(v_i::text, 3, '0'),
      NOW() - ((36 - v_i) * INTERVAL '1 day')
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Add Ledger entry
    INSERT INTO loyalty_ledger (
      user_id, transaction_type, points, wallet_amount,
      idempotency_key, description, created_at
    )
    VALUES (
      v_user.id,
      'purchase',
      v_pts,
      (v_pts * 0.5)::numeric(12,2),
      'idemp_loyalty_' || lpad(v_i::text, 10, '0'),
      'Points earned from order milestone reward',
      NOW() - ((36 - v_i) * INTERVAL '1 day')
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. PRODUCT BUNDLES (10 Curated Sets with 30 Items)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_i integer;
  v_bid uuid;
  v_prod1 record;
  v_prod2 record;
  v_bnames text[] := ARRAY[
    'Royal Wedding Grand Choker & Earring Set', 'Everyday Minimalist Office Glow Kit',
    'Diamond Tennis Bracelet & Solitaire Ring Duo', 'Jaipur Polki Meenakari Kada Ensemble',
    'Cocktail Emerald Twilight Sparkle Pack', 'Rose Gold Romance Gift Hamper',
    'Temple Heritage Bridal Trunk Set', 'Celestial Star Pendant & Earring Pair',
    'Modern Geometric Silver Everyday Set', 'Lustre Signature Collector Crown Bundle'
  ];
BEGIN
  FOR v_i IN 1..10 LOOP
    v_bid := gen_random_uuid();
    SELECT * INTO v_prod1 FROM products ORDER BY id OFFSET ((v_i * 2) % 25) LIMIT 1;
    SELECT * INTO v_prod2 FROM products ORDER BY id OFFSET (((v_i * 2) + 1) % 25) LIMIT 1;

    INSERT INTO product_bundles (
      id, name, slug, description, bundle_type, discount_type, discount_value,
      min_items, is_active, is_featured, created_at
    )
    VALUES (
      v_bid,
      v_bnames[v_i],
      'bundle-' || v_i || '-' || lower(replace(substring(v_bnames[v_i] from 1 for 15), ' ', '-')),
      'Hand-paired jewelry set curated by royal stylists for maximum elegance and savings.',
      'fixed_bundle',
      'percentage',
      15.00,
      2,
      true,
      (v_i <= 4),
      NOW() - INTERVAL '20 days'
    )
    ON CONFLICT (slug) DO NOTHING;

    -- Add Bundle Items
    INSERT INTO product_bundle_items (bundle_id, product_id, quantity, is_required)
    VALUES
      (v_bid, v_prod1.id, 1, true),
      (v_bid, v_prod2.id, 1, true)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. SEARCH ANALYTICS, AUDIT LOGS, FAQS, MESSAGES & SUBSCRIBERS (35+ Each)
-- ─────────────────────────────────────────────────────────────────────────────
-- Search Analytics
DO $$
DECLARE
  v_i integer;
  v_queries text[] := ARRAY[
    'diamond necklace', 'solitaire ring', 'gold bangles', 'polki choker', 'tennis bracelet',
    'emerald drops', 'rose gold ring', 'kundan kada', 'bridal jewelry set', 'daily wear earrings',
    'pearl chain', 'mangalsutra modern', 'evil eye bracelet', 'platinum band', 'chandelier earrings',
    'engagement ring', 'gold coin', 'ruby pendant', 'silver anklet', 'oxidized jhumka',
    'temple choker', 'cocktail ring', 'sapphire studs', 'hallmarked gold', 'diamond bracelet',
    'gift for wife', 'anniversary ring', 'minimalist chain', 'statement bangles', 'uncut polki',
    'gemstone pendant', 'navratna ring', 'cuff bracelet', 'choker necklace', 'pearl drops'
  ];
BEGIN
  FOR v_i IN 1..35 LOOP
    INSERT INTO search_analytics (
      query, normalized_query, results_count, session_id, created_at
    )
    VALUES (
      v_queries[v_i],
      lower(v_queries[v_i]),
      4 + (v_i % 12),
      'sess_' || lpad(v_i::text, 6, '0'),
      NOW() - ((36 - v_i) * INTERVAL '8 hours')
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Security & Admin Audit Logs
DO $$
DECLARE
  v_i integer;
  v_actions text[] := ARRAY['auth.login', 'product.update', 'order.status_change', 'coupon.create', 'inventory.adjust', 'shipping.dispatch', 'refund.approve'];
BEGIN
  FOR v_i IN 1..35 LOOP
    INSERT INTO audit_logs (
      user_email, user_role, action, resource, resource_id, status, ip_address, details, created_at
    )
    VALUES (
      'admin@lustre.com',
      'admin',
      v_actions[1 + (v_i % 7)],
      'system',
      'res_' || v_i,
      'success',
      '192.168.1.' || (10 + (v_i % 20))::text,
      jsonb_build_object('client', 'Admin Web Portal', 'actionCode', v_actions[1 + (v_i % 7)]),
      NOW() - ((36 - v_i) * INTERVAL '12 hours')
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- FAQs (30 Detailed Inquiries)
DO $$
DECLARE
  v_i integer;
  v_topics text[] := ARRAY['Materials & Purity', 'Shipping & Delivery', 'Returns & Lifetime Guarantee', 'Ring Sizing & Fit', 'Customization'];
BEGIN
  FOR v_i IN 1..30 LOOP
    INSERT INTO faqs (
      question, answer, "group", "sortOrder", "isActive", "createdAt", "updatedAt"
    )
    VALUES (
      'Frequently Asked Question No. ' || v_i || ' regarding Lustre & Co. pieces?',
      'All our diamonds are certified by international grading laboratories (GIA/IGI) and our gold bears official government hallmarking stamps. We provide certificates with every delivery.',
      v_topics[1 + (v_i % 5)],
      v_i,
      true,
      NOW() - INTERVAL '30 days',
      NOW()
    );
  END LOOP;
END $$;

-- Contact Enquiries
DO $$
DECLARE
  v_i integer;
  v_user record;
BEGIN
  FOR v_i IN 1..30 LOOP
    SELECT * INTO v_user FROM users WHERE role = 'customer' ORDER BY id OFFSET (v_i % 30) LIMIT 1;
    INSERT INTO contact_messages (
      name, email, phone, reason, message, status, "user", "createdAt", "updatedAt"
    )
    VALUES (
      v_user.name,
      v_user.email,
      COALESCE(v_user.phone, '+91 98201 1100' || (v_i % 10)),
      CASE (v_i % 4)
        WHEN 0 THEN 'Custom Jewellery Design'
        WHEN 1 THEN 'Order Status Enquiry'
        WHEN 2 THEN 'Bespoke Bridal Consultation'
        ELSE 'Ring Resizing & Maintenance'
      END,
      'I am looking for a custom 18K yellow gold necklace set for my wedding in November. Do you offer virtual video appointments?',
      CASE WHEN v_i % 2 = 0 THEN 'replied' ELSE 'new' END,
      v_user.id,
      NOW() - (v_i * INTERVAL '1 day'),
      NOW() - (v_i * INTERVAL '1 day')
    );
  END LOOP;
END $$;

-- Newsletter Subscribers (35 Subscribers)
DO $$
DECLARE
  v_i integer;
BEGIN
  FOR v_i IN 1..35 LOOP
    INSERT INTO subscribers (email, "isActive", source, "createdAt")
    VALUES (
      'vip.subscriber.' || v_i || '@lustre-lifestyle.in',
      true,
      'footer',
      NOW() - (v_i * INTERVAL '1 day')
    )
    ON CONFLICT (email) DO NOTHING;
  END LOOP;
END $$;
