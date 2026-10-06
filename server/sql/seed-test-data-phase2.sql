-- ============================================================================
-- Lustre & Co. - Phase 2 Comprehensive Test Data Seeding (At least 30 per table)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Document Sequences (30 rows)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_doc_types text[] := ARRAY['invoice', 'credit_note', 'return_request', 'purchase_order', 'transfer_note', 'shipment_waybill'];
  v_years integer[] := ARRAY[2022, 2023, 2024, 2025, 2026];
  v_dt text;
  v_yr integer;
BEGIN
  FOREACH v_dt IN ARRAY v_doc_types LOOP
    FOREACH v_yr IN ARRAY v_years LOOP
      INSERT INTO document_sequences (id, doc_type, year, last_number, updated_at)
      VALUES (v_dt || '-' || v_yr, v_dt, v_yr, 100 + (v_yr - 2020) * 15, NOW())
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Luxury Categories (Expand to at least 31 categories)
-- ---------------------------------------------------------------------------
INSERT INTO categories (name, slug, eyebrow, description, "sortOrder", "isActive")
VALUES
  ('Chokers', 'chokers', 'Royal Neckwear', 'Intricately handcrafted choker necklaces in 18K & 22K hallmarked gold and diamonds.', 7, true),
  ('Solitaire Rings', 'solitaires', 'Forever Diamonds', 'GIA & IGI certified conflict-free solitaire rings designed for unforgettable proposals.', 8, true),
  ('Cufflinks & Brooches', 'cufflinks-brooches', 'Gentlemen Prestige', 'Artisanal gold and diamond lapel pins, brooches, and tailored tuxedo cufflinks.', 9, true),
  ('Diamond Bangles', 'diamond-bangles', 'Radiant Wrists', 'Timeless diamond-studded bangles and eternity kadas with micro-prong settings.', 10, true),
  ('Anklets & Payals', 'anklets-payal', 'Subtle Melody', 'Delicate gold and diamond payals crafted for auspicious festive celebrations.', 11, true),
  ('Mangalsutras', 'mangalsutras', 'Sacred Vows', 'Contemporary and heritage gold mangalsutras celebrating modern matrimonial elegance.', 12, true),
  ('Temple Jewellery', 'temple-jewellery', 'Devine Heritage', 'Carved Nakshi and temple jewellery depicting celestial motifs in antique matte gold.', 13, true),
  ('Tennis Bracelets', 'tennis-bracelets', 'Continuous Sparkle', 'Seamless rows of brilliant-cut diamonds engineered in flexible 18K white gold.', 14, true),
  ('Emerald Drops', 'emerald-drops', 'Zambian Majesty', 'Vibrant natural emerald drops complemented by round and marquise diamonds.', 15, true),
  ('Pearl Strands', 'pearl-strands', 'Oceanic Lustre', 'Graduated South Sea and Tahitian cultured pearl necklaces with gold clasps.', 16, true),
  ('Kundan Sets', 'kundan-sets', 'Imperial Splendour', 'Centuries-old Rajasthani kundan craftsmanship featuring foil-backed gemstones.', 17, true),
  ('Polki Jadau', 'polki-jadau', 'Mughal Grandeur', 'Uncut diamonds set in pure 24K gold jadau bezel, preserving regal heirloom traditions.', 18, true),
  ('Nose Rings & Pins', 'nose-rings', 'Graceful Accents', 'Dainty diamond nose studs and ornate bridal naths with pearl chain attachments.', 19, true),
  ('Navratna Sets', 'navratna-sets', 'Cosmic Harmony', 'Nine sacred astrological gems meticulously balanced in certified 22K yellow gold.', 20, true),
  ('Cocktail Rings', 'cocktail-rings', 'Statement Glamour', 'Dramatic cluster rings showcasing vivid rubies, sapphires, and fancy-cut diamonds.', 21, true),
  ('Men Chains', 'mens-chains', 'Bold Distinction', 'Substantial Miami Cuban, rope, and Figaro chains forged in heavy 22K yellow gold.', 22, true),
  ('Platinum Bands', 'platinum-bands', 'Pure Indulgence', 'Hypoallergenic Pt950 wedding bands engineered for permanent brilliance and endurance.', 23, true),
  ('Gold Coins & Bars', 'gold-coins-bars', 'Auspicious Wealth', '999.9 pure certified fine gold coins and bars with tamper-proof mint packaging.', 24, true),
  ('Bespoke Bridal Sets', 'bespoke-bridal', 'Trousseau Couture', 'Custom-commissioned comprehensive bridal parures tailored for royalty.', 25, true),
  ('Vintage Estate', 'vintage-estate', 'Timeless Archival', 'Curated Art Deco and Victorian archival pieces restored to pristine collector quality.', 26, true),
  ('Ear Cuffs', 'ear-cuffs', 'Modern Silhouette', 'Contemporary wrap-around diamond ear cuffs designed for non-pierced elegance.', 27, true),
  ('Hair Ornaments', 'hair-ornaments', 'Bridal Adornment', 'Maang tikkas, passas, and diamond-studded jada billas for heritage bridal styling.', 28, true),
  ('Charms & Pendants', 'charms-pendants', 'Personalized Keepsakes', 'Whimsical gold talismans, zodiac medallions, and alphabet diamond pendants.', 29, true),
  ('Layered Chains', 'layered-chains', 'Effortless Chic', 'Multi-strand delicate diamond station chains ideal for sophisticated everyday layering.', 30, true),
  ('Ruby Creations', 'ruby-creations', 'Crimson Passion', 'Burmese rubies paired with radiant brilliant diamonds in dramatic royal arrangements.', 31, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. CMS Pages (Expand to at least 30 pages)
-- ---------------------------------------------------------------------------
INSERT INTO pages (title, slug, eyebrow, description, "isPublished")
VALUES
  ('Bespoke Bridal Concierge', 'bespoke-bridal-concierge', 'Custom Haute Joaillerie', 'Discover our private atelier service for customized bridal trousseau and heirlooms.', true),
  ('Conflict-Free Diamond Ethics', 'conflict-free-diamond-ethics', 'Responsible Luxury', 'Our strict adherence to the Kimberley Process and ethical sourcing standards.', true),
  ('Hallmark & Certification Guide', 'hallmark-certification-guide', 'Guaranteed Purity', 'Learn how BIS hallmarking and GIA/IGI diamond certifications protect your investment.', true),
  ('Ring Sizing Masterclass', 'ring-sizing-masterclass', 'The Perfect Fit', 'A comprehensive guide to accurately measuring ring size for surprise proposals.', true),
  ('Jewellery Care & Preservation', 'jewellery-care-and-cleaning', 'Enduring Radiance', 'Expert tips from master goldsmiths on cleaning, inspecting, and storing fine jewellery.', true),
  ('Old Gold Exchange Policy', 'gold-exchange-policy', 'Maximise Value', 'Transparent valuation policies for exchanging your legacy gold against modern designs.', true),
  ('Virtual Video Consultation', 'appointment-booking', 'VIP Experience', 'Book a private virtual appointment with our senior gemologist from the comfort of home.', true),
  ('About Our Heritage', 'about-our-heritage', 'Since 1988', 'Over three decades of uncompromised craftsmanship, integrity, and timeless luxury.', true),
  ('Artisan Craftsmanship', 'artisan-craftsmanship', 'Master Hands', 'Meet the generational karigars and master setters who bring Lustre & Co. sketches to life.', true),
  ('Virtual Try-On 3D Augmented Reality', 'virtual-try-on-guide', 'Modern Shopping', 'Experience real-time AR simulation of necklaces, rings, and earrings on your device.', true),
  ('Insurance & Appraisals', 'insurance-and-appraisals', 'Complete Peace of Mind', 'Comprehensive valuation certificates accepted by leading national underwriters.', true),
  ('Corporate Gifting & Commemorations', 'corporate-gifting-luxury', 'Milestone Celebrations', 'Tailored pure gold medallions and luxury gifts for distinguished corporate milestones.', true),
  ('Privilege Club Loyalty Program', 'privilege-club-loyalty', 'Rewards of Distinction', 'Earn points, unlock private vault viewings, and enjoy complimentary annual cleanings.', true),
  ('Armoured Vault Storage Services', 'secure-vault-storage', 'Fortress Security', 'Complimentary temporary insured vault storage for destination wedding jewellery.', true),
  ('International Shipping & Duties', 'international-shipping-customs', 'Global Delivery', 'Door-to-door fully insured express air transit across 45 countries worldwide.', true),
  ('Ethical Precious Metals Charter', 'ethical-sourcing-charter', 'Sustainable Future', 'Our commitment to recycled gold, carbon-neutral shipping, and fair artisan wages.', true),
  ('Complimentary Laser Engraving', 'custom-engraving-service', 'Personalized Love', 'Add dates, coordinates, or secret loving messages inside rings and medallions.', true),
  ('Investing in Fine Bullion', 'invest-in-gold-coins', 'Wealth Preservation', 'Everything you need to know about purchasing 24K 999.9 purity minted investment coins.', true),
  ('Celebrity Red Carpet Showcase', 'celebrity-red-carpet-looks', 'As Seen On Stars', 'Explore the high-jewellery masterpieces worn by cinema icons at international galas.', true),
  ('Vedic Gemstone Astrology Guide', 'gemstone-astrology-guide', 'Cosmic Energy', 'Scientific consultation on selecting untreated rubies, yellow sapphires, and blue sapphires.', true),
  ('Terms of Privilege Membership', 'terms-of-privilege', 'Legal', 'Rules, terms, and redemption policies governing our VIP Privilege Club tiers.', true),
  ('Cookie & Privacy Safeguards', 'cookie-preferences-security', 'Data Security', 'How we encrypt and protect your confidential payment and shipping information.', true),
  ('Press & Global Media Features', 'press-and-media', 'In The Spotlight', 'Editorial features from Vogue, Harper Bazaar, and Architectural Digest.', true),
  ('Careers at Lustre & Co.', 'careers-at-lustre', 'Join Our Atelier', 'Exciting opportunities for gemologists, CAD jewellery designers, and store directors.', true),
  ('Investor Relations & Annual Report', 'investor-relations', 'Governance', 'Financial performance, governance standards, and sustainability progress reports.', true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Settings (Expand to at least 32 configuration keys)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_keys text[] := ARRAY[
    'store_mumbai_flagship', 'store_delhi_boutique', 'store_bengaluru_lounge', 'store_hyderabad_palace',
    'store_kolkata_heritage', 'store_ahmedabad_bourse', 'store_chennai_salon', 'store_pune_corridor',
    'store_jaipur_atelier', 'store_goa_luxury', 'store_dubai_flagship', 'store_singapore_suite',
    'store_london_mayfair', 'store_newyork_madison', 'store_zurich_vault', 'season_diwali_festive',
    'season_akshaya_tritiya', 'season_wedding_bridal', 'season_summer_sparkle', 'season_winter_solitaire',
    'season_monsoon_pearls', 'season_valentines_romance', 'policy_gold_exchange', 'policy_insured_transit',
    'policy_return_guarantee', 'policy_white_glove_concierge', 'policy_bespoke_commissions',
    'policy_conflict_free_diamonds', 'policy_bis_hallmark_standards', 'policy_vip_privilege_rewards'
  ];
  v_key text;
BEGIN
  FOREACH v_key IN ARRAY v_keys LOOP
    INSERT INTO settings (key, store, social, commerce, announcement, homepage, newsletter, seo)
    VALUES (
      v_key,
      json_build_object('name', 'Lustre & Co. - ' || v_key, 'support_email', 'concierge@lustre.com', 'hotline', '+91 98201 11000')::jsonb,
      json_build_object('instagram', '@lustreandco', 'whatsapp', '+91 98201 11000', 'facebook', 'lustrejewels')::jsonb,
      json_build_object('currency', 'INR', 'free_shipping_min', 10000, 'min_order_value', 2500, 'tax_rate_gold', 3.0)::jsonb,
      json_build_object('text', 'Complimentary Insured Air Transit on all fine jewellery acquisitions across India.', 'enabled', true)::jsonb,
      json_build_object('hero_title', 'Crafting Regal Splendour', 'featured_collection', 'bridal-trousseau')::jsonb,
      json_build_object('welcome_discount_percent', 10, 'promo_code', 'WELCOME10')::jsonb,
      json_build_object('meta_title', 'Lustre & Co. - Certified Diamond & Hallmarked Gold Jewellery', 'meta_description', 'Discover handcrafted haute joaillerie, solitaires, and royal bridal parures.')::jsonb
    )
    ON CONFLICT (key) DO NOTHING;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Shipping Zones (30 Zones)
-- ---------------------------------------------------------------------------
INSERT INTO shipping_zones (name, description, countries, states, pincodes, is_active)
VALUES
  ('Mumbai Metropolitan Region', 'BKC, South Bombay, Bandra, Juhu, and Thane courier network.', ARRAY['India'], ARRAY['Maharashtra'], ARRAY['400001','400050','400051','400020','400076'], true),
  ('Delhi NCR Luxury Corridor', 'South Delhi, Lutyens, Gurugram Golf Course Rd, and Noida.', ARRAY['India'], ARRAY['Delhi','Haryana','Uttar Pradesh'], ARRAY['110001','110003','110021','122002','201301'], true),
  ('Bengaluru Tech Corridor', 'Indiranagar, Koramangala, Whitefield, and UB City.', ARRAY['India'], ARRAY['Karnataka'], ARRAY['560001','560034','560038','560066','560095'], true),
  ('Hyderabad Royal Zone', 'Jubilee Hills, Banjara Hills, and Gachibowli high-security delivery.', ARRAY['India'], ARRAY['Telangana'], ARRAY['500033','500034','500081','500084'], true),
  ('Chennai Metro Belt', 'Boat Club, Poes Garden, Nungambakkam, and Adyar corridor.', ARRAY['India'], ARRAY['Tamil Nadu'], ARRAY['600006','600020','600028','600034'], true),
  ('Kolkata Heritage Enclave', 'Alipore, Ballygunge, Park Street, and Salt Lake.', ARRAY['India'], ARRAY['West Bengal'], ARRAY['700016','700019','700027','700091'], true),
  ('Ahmedabad Diamond Circle', 'Bodakdev, Satellite, SG Highway, and Navrangpura.', ARRAY['India'], ARRAY['Gujarat'], ARRAY['380009','380015','380054','380059'], true),
  ('Pune Western Hub', 'Koregaon Park, Kalyani Nagar, and Aundh prestige corridors.', ARRAY['India'], ARRAY['Maharashtra'], ARRAY['411001','411006','411007','411014'], true),
  ('Jaipur Gemstone Corridor', 'C-Scheme, Civil Lines, and Malviya Nagar.', ARRAY['India'], ARRAY['Rajasthan'], ARRAY['302001','302005','302006','302017'], true),
  ('Surat Diamond Bourse', 'Adajan, Citylight, and Piplod diamond trading zones.', ARRAY['India'], ARRAY['Gujarat'], ARRAY['395007','395009','395003'], true),
  ('Chandigarh Tricity', 'Sector 8, Sector 9, Panchkula, and Mohali.', ARRAY['India'], ARRAY['Chandigarh','Punjab','Haryana'], ARRAY['160009','160017','134109','160071'], true),
  ('Goa Coastal Luxury', 'Candolim, Panaji, and Assagao boutique resort delivery.', ARRAY['India'], ARRAY['Goa'], ARRAY['403001','403515','403507'], true),
  ('Lucknow Nawabi Belt', 'Gomti Nagar, Hazratganj, and Mahanagar.', ARRAY['India'], ARRAY['Uttar Pradesh'], ARRAY['226001','226010','226006'], true),
  ('Kochi Port Zone', 'Marine Drive, Panampilly Nagar, and Willingdon Island.', ARRAY['India'], ARRAY['Kerala'], ARRAY['682011','682036','682003'], true),
  ('Indore Commercial Corridor', 'Vijay Nagar, New Palasia, and AB Road.', ARRAY['India'], ARRAY['Madhya Pradesh'], ARRAY['452001','452010','452011'], true),
  ('Bhopal Central', 'Arera Colony and Shamla Hills.', ARRAY['India'], ARRAY['Madhya Pradesh'], ARRAY['462016','462013'], true),
  ('Nagpur Logistics Hub', 'Civil Lines, Ramdaspeth, and Wardha Road.', ARRAY['India'], ARRAY['Maharashtra'], ARRAY['440001','440010','440015'], true),
  ('Coimbatore Diamond Zone', 'RS Puram, Race Course, and Peelamedu.', ARRAY['India'], ARRAY['Tamil Nadu'], ARRAY['641002','641018','641004'], true),
  ('Vadodara Royal Circle', 'Alkapuri, Gotri, and Vasna Road.', ARRAY['India'], ARRAY['Gujarat'], ARRAY['390007','390021','390015'], true),
  ('Visakhapatnam Coastal', 'Waltair Uplands, Beach Road, and MVP Colony.', ARRAY['India'], ARRAY['Andhra Pradesh'], ARRAY['530002','530003','530017'], true),
  ('UAE & Dubai Gold Souk Express', 'Dubai Downtown, Palm Jumeirah, and Emirates Hills.', ARRAY['United Arab Emirates'], ARRAY['Dubai','Abu Dhabi'], ARRAY['DXB-001','DXB-002'], true),
  ('Singapore ASEAN Gateway', 'Marina Bay, Orchard Road, and Sentosa Cove.', ARRAY['Singapore'], ARRAY['Central Region'], ARRAY['018956','238839','098267'], true),
  ('United Kingdom Luxury Express', 'Mayfair, Knightsbridge, Kensington, and Marylebone.', ARRAY['United Kingdom'], ARRAY['Greater London'], ARRAY['W1K','SW1X','SW7'], true),
  ('USA East Coast Air Hub', 'Manhattan, Upper East Side, Brooklyn, and Greenwich CT.', ARRAY['United States'], ARRAY['New York','Connecticut'], ARRAY['10021','10022','06830'], true),
  ('USA West Coast Silicon Hub', 'Palo Alto, Beverly Hills, and Presidio Heights.', ARRAY['United States'], ARRAY['California'], ARRAY['94301','90210','94118'], true),
  ('Canada Ontario Corridor', 'Yorkville Toronto and Oakville.', ARRAY['Canada'], ARRAY['Ontario'], ARRAY['M5R','L6J'], true),
  ('Australia Sydney & Melbourne', 'Double Bay Sydney and Toorak Melbourne.', ARRAY['Australia'], ARRAY['New South Wales','Victoria'], ARRAY['2028','3142'], true),
  ('European Union Schengen Gateway', 'Paris 1er, Geneva, and Zurich Bahnhofstrasse.', ARRAY['France','Switzerland'], ARRAY['Ile-de-France','Zurich'], ARRAY['75001','8001'], true),
  ('Hong Kong Central Hub', 'Victoria Peak and Central Financial District.', ARRAY['Hong Kong'], ARRAY['Hong Kong Island'], ARRAY['HK-01','HK-02'], true),
  ('Tokyo Asia-Pacific Hub', 'Ginza, Roppongi, and Omotesando.', ARRAY['Japan'], ARRAY['Tokyo'], ARRAY['104-0061','106-0032'], true)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Shipping Providers (Expand to at least 30 providers)
-- ---------------------------------------------------------------------------
INSERT INTO shipping_providers (code, name, provider_type, is_active, is_default, priority, config)
VALUES
  ('BVC_SECURE', 'BVC Logistics Secure High-Value', 'bluedart', true, false, 95, '{"armoured_car": true, "insurance_included": true}'::jsonb),
  ('SEQUEL_GLOBAL', 'Sequel Global Bullion Logistics', 'delhivery', true, false, 90, '{"vault_to_vault": true, "gps_armed_escort": true}'::jsonb),
  ('MALCA_AMIT', 'Malca-Amit Diamond Vaults', 'shiprocket', true, false, 85, '{"bonded_customs": true, "swiss_vaults": true}'::jsonb),
  ('BRINKS_INC', 'Brinks Global Bullion Services', 'shiprocket', true, false, 80, '{"armoured_freight": true}'::jsonb),
  ('LEMUIR_EXPRESS', 'Lemuir High Security Cargo', 'delhivery', true, false, 75, '{"diamond_specialist": true}'::jsonb),
  ('BLUEDART_APEX', 'BlueDart Apex Gold Air Express', 'bluedart', true, false, 70, '{"next_day_air": true}'::jsonb),
  ('DELHIVERY_VIP', 'Delhivery Express Direct High-Value', 'delhivery', true, false, 65, '{"priority_hub": true}'::jsonb),
  ('DTDC_PRIME', 'DTDC Prime Secure Air', 'easyship', true, false, 60, '{"insured": true}'::jsonb),
  ('SHADOWFAX_LUX', 'Shadowfax Luxury Same-Day', 'local_delivery', true, false, 55, '{"same_day_metro": true}'::jsonb),
  ('ECOM_EXPRESS_SAFE', 'Ecom Express Safe Box', 'delhivery', true, false, 50, '{"otp_delivery": true}'::jsonb),
  ('FEDEX_INTL', 'FedEx International Priority Insured', 'easyship', true, false, 88, '{"customs_clearance": true}'::jsonb),
  ('DHL_EXPRESS_WORLD', 'DHL Express Worldwide Precious', 'easyship', true, false, 87, '{"air_transit_global": true}'::jsonb),
  ('UPS_WORLDWIDE', 'UPS Worldwide Express Saver', 'shippo', true, false, 82, '{"signature_required": true}'::jsonb),
  ('ARAMEX_GULF', 'Aramex Gulf Precious Direct', 'easyship', true, false, 78, '{"middle_east_hub": true}'::jsonb),
  ('SPEED_POST_INSURED', 'India Post Insured Parcel', 'shiprocket', true, false, 40, '{"tier2_reach": true}'::jsonb),
  ('GATI_KWE', 'Gati KWE Precision Logistics', 'delhivery', true, false, 45, '{"surface_vault": true}'::jsonb),
  ('SAFECHEM_HIGHVALUE', 'Safechem Secure Precious Transit', 'bluedart', true, false, 35, '{"heavy_bullion": true}'::jsonb),
  ('NAVATA_EXPRESS', 'Navata Precious Express', 'delhivery', true, false, 30, '{"south_india_hub": true}'::jsonb),
  ('V_TRANS_VAULT', 'V-Trans Armoured Road Escort', 'local_delivery', true, false, 32, '{"highway_patrol": true}'::jsonb),
  ('RIVIGO_DIAMOND', 'Rivigo Diamond Swift Air-Truck', 'delhivery', true, false, 33, '{"relay_trucking": true}'::jsonb),
  ('ALLCARGO_BULLION', 'Allcargo Global Bullion Shipping', 'easyship', true, false, 48, '{"maritime_and_air": true}'::jsonb),
  ('KERRY_INDEV', 'Kerry Indev Secured Air Freight', 'easyship', true, false, 52, '{"airport_vault": true}'::jsonb),
  ('KERRY_VIP', 'Kerry Logistics VIP White Glove', 'store_pickup', true, false, 54, '{"chaperone_courier": true}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. Shipping Methods (Expand to at least 30 methods)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_prov_id uuid;
  v_zone_id uuid;
BEGIN
  SELECT id INTO v_prov_id FROM shipping_providers WHERE is_active = true LIMIT 1;
  SELECT id INTO v_zone_id FROM shipping_zones WHERE is_active = true LIMIT 1;

  INSERT INTO shipping_methods (code, name, shipping_type, provider_id, zone_id, min_order_value, base_rate, is_active, is_free)
  VALUES
    ('armoured-transit-mumbai', 'Armoured Transit Mumbai Direct', 'carrier', v_prov_id, v_zone_id, 50000, 0, true, true),
    ('white-glove-delhi', 'White Glove Concierge Delhi NCR', 'local_delivery', v_prov_id, v_zone_id, 100000, 0, true, true),
    ('same-day-vault-dispatch', 'Same-Day Vault Air Dispatch', 'carrier', v_prov_id, v_zone_id, 25000, 1500, true, false),
    ('air-courier-bluedart-gold', 'BlueDart Gold Insured Express', 'carrier', v_prov_id, v_zone_id, 10000, 0, true, true),
    ('sequel-high-value-armoured', 'Sequel Armoured Car Delivery', 'carrier', v_prov_id, v_zone_id, 150000, 0, true, true),
    ('bvc-secure-insured-courier', 'BVC Certified Courier', 'carrier', v_prov_id, v_zone_id, 20000, 0, true, true),
    ('saturday-morning-luxury', 'Saturday Morning VIP Delivery', 'local_delivery', v_prov_id, v_zone_id, 50000, 500, true, false),
    ('evening-concierge-handover', 'Evening Concierge Handover', 'local_delivery', v_prov_id, v_zone_id, 50000, 500, true, false),
    ('pan-india-express-insured', 'Pan-India 48h Insured Air Express', 'carrier', v_prov_id, v_zone_id, 10000, 0, true, true),
    ('international-dhl-priority', 'DHL Express Worldwide Insured', 'carrier', v_prov_id, v_zone_id, 100000, 3500, true, false),
    ('international-fedex-air', 'FedEx International Air Priority', 'carrier', v_prov_id, v_zone_id, 100000, 3500, true, false),
    ('store-pickup-bandra-flagship', 'Store Pickup: Bandra Atelier Flagship', 'store_pickup', v_prov_id, v_zone_id, 0, 0, true, true),
    ('store-pickup-south-delhi', 'Store Pickup: South Delhi Boutique', 'store_pickup', v_prov_id, v_zone_id, 0, 0, true, true),
    ('store-pickup-indiranagar', 'Store Pickup: Bangalore Indiranagar Salon', 'store_pickup', v_prov_id, v_zone_id, 0, 0, true, true),
    ('store-pickup-jubilee-hills', 'Store Pickup: Hyderabad Jubilee Hills', 'store_pickup', v_prov_id, v_zone_id, 0, 0, true, true),
    ('store-pickup-ub-city', 'Store Pickup: UB City High Luxury Lounge', 'store_pickup', v_prov_id, v_zone_id, 0, 0, true, true),
    ('store-pickup-phoenix-palladium', 'Store Pickup: Phoenix Palladium Lower Parel', 'store_pickup', v_prov_id, v_zone_id, 0, 0, true, true),
    ('midnight-surprise-anniversary', 'Midnight Surprise Anniversary Delivery', 'local_delivery', v_prov_id, v_zone_id, 75000, 2000, true, false),
    ('wedding-venue-direct-dispatch', 'Direct-to-Wedding-Venue Armoured Escort', 'local_delivery', v_prov_id, v_zone_id, 250000, 0, true, true),
    ('vault-to-vault-transit', 'Vault-to-Vault Secure Bank Transfer', 'carrier', v_prov_id, v_zone_id, 500000, 0, true, true),
    ('sunday-vip-delivery', 'Sunday Morning Private Delivery', 'local_delivery', v_prov_id, v_zone_id, 50000, 750, true, false),
    ('customs-precleared-gulf-air', 'Gulf Express Air (UAE / Oman / Qatar)', 'carrier', v_prov_id, v_zone_id, 150000, 4500, true, false),
    ('singapore-direct-flight-courier', 'Singapore Hand-Couried Delivery', 'carrier', v_prov_id, v_zone_id, 500000, 8500, true, false),
    ('us-express-insured-fedex', 'USA Insured Priority Direct Air', 'carrier', v_prov_id, v_zone_id, 150000, 5000, true, false),
    ('uk-london-courier-direct', 'London Mayfair Courier Direct', 'carrier', v_prov_id, v_zone_id, 150000, 4800, true, false),
    ('europe-express-schengen', 'Schengen Express High Value (Paris/Geneva)', 'carrier', v_prov_id, v_zone_id, 200000, 5500, true, false)
  ON CONFLICT (code) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- 8. Shipment Rate Quotes (30 quotes)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_order record;
  v_prov record;
  v_meth record;
BEGIN
  SELECT * INTO v_prov FROM shipping_providers WHERE is_active = true LIMIT 1;
  SELECT * INTO v_meth FROM shipping_methods WHERE is_active = true LIMIT 1;

  FOR v_i IN 1..30 LOOP
    SELECT * INTO v_order FROM orders ORDER BY id OFFSET (v_i % 30) LIMIT 1;
    INSERT INTO shipment_rate_quotes (
      quote_token, order_id, provider_id, shipping_method_id, courier_name, service_name,
      amount, currency, estimated_min_days, estimated_max_days, source_pincode, destination_pincode,
      request_hash, expires_at, created_at
    )
    VALUES (
      'QUOTE-TK-' || v_i || '-' || substring(gen_random_uuid()::text from 1 for 8),
      v_order.id,
      v_prov.id,
      v_meth.id,
      'BlueDart Gold Armoured',
      'Apex Next-Day Air',
      CASE WHEN v_i % 3 = 0 THEN 0.00 ELSE 650.00 END,
      'INR',
      1, 2,
      '400051',
      '110001',
      'hash_md5_req_' || v_i || '_' || substring(gen_random_uuid()::text from 1 for 6),
      NOW() + INTERVAL '7 days',
      NOW() - (v_i * INTERVAL '1 day')
    )
    ON CONFLICT (quote_token) DO NOTHING;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 9. Shipment Events (50 tracking checkpoint scan events)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_ship record;
  v_locations text[] := ARRAY[
    'Bandra Central Vault, Mumbai',
    'Chhatrapati Shivaji Maharaj International Airport (BOM), Mumbai',
    'Indira Gandhi International Airport (DEL), New Delhi',
    'Kempegowda International Sort Centre, Bengaluru',
    'Rajiv Gandhi Logistics Terminal, Hyderabad',
    'Destination Courier Hub Out-for-Delivery Hub'
  ];
  v_statuses text[] := ARRAY['picked_up', 'in_transit', 'in_transit', 'out_for_delivery', 'delivered'];
BEGIN
  FOR v_i IN 1..50 LOOP
    SELECT * INTO v_ship FROM shipments ORDER BY id OFFSET (v_i % 35) LIMIT 1;
    IF v_ship.id IS NOT NULL THEN
      INSERT INTO shipment_events (
        shipment_id, status, previous_status, location, description, event_time, raw_payload, created_at
      )
      VALUES (
        v_ship.id,
        v_statuses[1 + (v_i % array_length(v_statuses, 1))],
        'pending',
        v_locations[1 + (v_i % array_length(v_locations, 1))],
        'Package securely verified by armed tamper-evident security team. Weight checked 245.8g.',
        NOW() - (v_i * INTERVAL '6 hours'),
        json_build_object('scanner_id', 'SCN-BOM-' || v_i, 'vault_officer', 'Inspector R. Sharma')::jsonb,
        NOW() - (v_i * INTERVAL '6 hours')
      );
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 10. Shipment Webhook Events (30 events)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
BEGIN
  FOR v_i IN 1..30 LOOP
    INSERT INTO shipment_webhook_events (
      provider_code, external_event_id, event_type, payload, processed, created_at, processed_at
    )
    VALUES (
      CASE (v_i % 3) WHEN 0 THEN 'bluedart' WHEN 1 THEN 'delhivery' ELSE 'bvc_secure' END,
      'WH-EXT-' || v_i || '-' || substring(gen_random_uuid()::text from 1 for 8),
      CASE (v_i % 4)
        WHEN 0 THEN 'shipment.in_transit'
        WHEN 1 THEN 'shipment.out_for_delivery'
        WHEN 2 THEN 'shipment.delivered'
        ELSE 'shipment.pickup_scheduled'
      END,
      json_build_object(
        'awb', 'AWB-BLR-' || (100000 + v_i),
        'status', 'IN_TRANSIT',
        'checkpoint', 'Airport Air Freight Sorting Complex',
        'scanned_at', (NOW() - (v_i * INTERVAL '4 hours'))::text
      )::jsonb,
      true,
      NOW() - (v_i * INTERVAL '1 day'),
      NOW() - (v_i * INTERVAL '1 day') + INTERVAL '2 minutes'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 11. Return Shipments (30 reverse logistics shipments)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_order record;
  v_ship record;
BEGIN
  FOR v_i IN 1..30 LOOP
    SELECT * INTO v_order FROM orders ORDER BY id OFFSET (v_i % 35) LIMIT 1;
    SELECT * INTO v_ship FROM shipments WHERE order_id = v_order.id LIMIT 1;

    INSERT INTO return_shipments (
      order_id, original_shipment_id, reason, status, pickup_address, provider_response, created_at, updated_at
    )
    VALUES (
      v_order.id,
      v_ship.id,
      CASE (v_i % 3)
        WHEN 0 THEN 'Ring size requires resizing to US 6.5'
        WHEN 1 THEN 'Customer requested exchange for yellow gold variant'
        ELSE 'Minor clasp adjustment under complimentary 30-day warranty'
      END,
      CASE (v_i % 5)
        WHEN 0 THEN 'requested'
        WHEN 1 THEN 'approved'
        WHEN 2 THEN 'pickup_scheduled'
        WHEN 3 THEN 'in_transit'
        ELSE 'received'
      END,
      json_build_object('name', 'VIP Return Customer', 'city', 'Mumbai', 'pincode', '400050')::jsonb,
      json_build_object('return_awb', 'RET-AWB-998' || v_i, 'courier', 'BlueDart Reverse Air')::jsonb,
      NOW() - (v_i * INTERVAL '1 day'),
      NOW() - (v_i * INTERVAL '1 day')
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 12. Inventory Warehouses (Expand to at least 30 warehouses)
-- ---------------------------------------------------------------------------
INSERT INTO inventory_warehouses (code, name, address, city, state, country, postal_code, is_active, is_default)
VALUES
  ('WH-DEL-01', 'Delhi Aerocity Bullion Vault', 'GMR Aerocity Logistics Block B', 'New Delhi', 'Delhi', 'India', '110037', true, false),
  ('WH-BLR-01', 'Bengaluru Devanahalli Secure Depository', 'BIAL Cargo Village Terminal 2', 'Bengaluru', 'Karnataka', 'India', '560300', true, false),
  ('WH-HYD-01', 'Hyderabad Shamshabad Armoured Facility', 'GMR Cargo Complex RGIA', 'Hyderabad', 'Telangana', 'India', '500108', true, false),
  ('WH-CCU-01', 'Kolkata Rajarhat Precious Vault', 'Chinar Park Logistics Zone', 'Kolkata', 'West Bengal', 'India', '700136', true, false),
  ('WH-AMD-01', 'Ahmedabad Gift City High-Security Vault', 'GIFT SEZ Tower 1B', 'Gandhinagar', 'Gujarat', 'India', '382355', true, false),
  ('WH-PUN-01', 'Pune Hinjewadi Regional Depository', 'Phase 1 Quadron Tech Park', 'Pune', 'Maharashtra', 'India', '411057', true, false),
  ('WH-JAI-01', 'Jaipur Sitapura Gemstones Vault', 'SEZ Phase 2 Gem Park', 'Jaipur', 'Rajasthan', 'India', '302022', true, false),
  ('WH-SUR-01', 'Surat Diamond Bourse Vault 1', 'Khajod Diamond City Terminal A', 'Surat', 'Gujarat', 'India', '395007', true, false),
  ('WH-SUR-02', 'Surat Diamond Bourse Vault 2', 'Khajod Diamond City Terminal B', 'Surat', 'Gujarat', 'India', '395007', true, false),
  ('WH-IXC-01', 'Chandigarh Aerotropolis Depot', 'Aerotropolis Cargo Corridor', 'Mohali', 'Punjab', 'India', '140306', true, false),
  ('WH-GOI-01', 'Goa Mopa Airport Logistics Vault', 'Manohar International Airport Cargo Area', 'Pernem', 'Goa', 'India', '403512', true, false),
  ('WH-LKO-01', 'Lucknow Amausi Cargo Terminal', 'Chaudhary Charan Singh Airport Zone', 'Lucknow', 'Uttar Pradesh', 'India', '226009', true, false),
  ('WH-COK-01', 'Kochi Nedumbassery Air Depot', 'CIAL Air Cargo Complex', 'Kochi', 'Kerala', 'India', '683111', true, false),
  ('WH-IDR-01', 'Indore Super Corridor Depository', 'TCS Square Logistics Enclave', 'Indore', 'Madhya Pradesh', 'India', '452005', true, false),
  ('WH-BHO-01', 'Bhopal Raja Bhoj Airport Vault', 'Gandhi Nagar Air Freight Zone', 'Bhopal', 'Madhya Pradesh', 'India', '462036', true, false),
  ('WH-NAG-01', 'Nagpur MIHAN SEZ Cargo Hub', 'Multi-modal International Cargo Hub', 'Nagpur', 'Maharashtra', 'India', '441108', true, false),
  ('WH-CJB-01', 'Coimbatore Peelamedu Gold Hub', 'Avinashi Road Logistics Park', 'Coimbatore', 'Tamil Nadu', 'India', '641014', true, false),
  ('WH-BDQ-01', 'Vadodara Harni Air Cargo Vault', 'Airport Road High Security Complex', 'Vadodara', 'Gujarat', 'India', '390022', true, false),
  ('WH-VTZ-01', 'Visakhapatnam Port Free Trade Vault', 'Visakhapatnam SEZ Duvvada', 'Visakhapatnam', 'Andhra Pradesh', 'India', '530046', true, false),
  ('WH-DXB-01', 'Dubai Multi Commodities Centre (DMCC) Vault', 'Almas Tower JLT', 'Dubai', 'Dubai', 'United Arab Emirates', 'DXB-001', true, false),
  ('WH-SIN-01', 'Singapore Le Freeport Depository', '32 Changi North Crescent', 'Singapore', 'East Region', 'Singapore', '499643', true, false),
  ('WH-LHR-01', 'London Heathrow Bonded Bullion Vault', 'Hatton Cross Security Zone', 'London', 'Greater London', 'United Kingdom', 'TW6 2GW', true, false),
  ('WH-JFK-01', 'New York JFK International Vault', 'Building 23 Cargo Area', 'New York', 'New York', 'United States', '11430', true, false),
  ('WH-SFO-01', 'San Francisco International Precious Depot', 'North Access Rd Cargo Complex', 'San Francisco', 'California', 'United States', '94128', true, false),
  ('WH-ZRH-01', 'Zurich Airport Swiss Bullion Depository', 'Flughafenstrasse Fracht West', 'Zurich', 'Zurich', 'Switzerland', '8058', true, false)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 13. Inventory Suppliers (Expand to at least 30 verified suppliers)
-- ---------------------------------------------------------------------------
INSERT INTO inventory_suppliers (code, name, contact_name, email, phone, city, state, country, is_active)
VALUES
  ('SUP-DIA-001', 'Rosy Blue Fine Diamonds', 'Russell Mehta', 'sales@rosyblue.com', '+91 22 6666 1111', 'Mumbai', 'Maharashtra', 'India', true),
  ('SUP-DIA-002', 'Kiran Gems Private Limited', 'Vallabhbhai Patel', 'supply@kirangems.com', '+91 22 4004 2222', 'Surat', 'Gujarat', 'India', true),
  ('SUP-DIA-003', 'Hari Krishna Exports Diamond Atelier', 'Ghanshyam Dholakia', 'orders@hk.co', '+91 22 2829 3333', 'Surat', 'Gujarat', 'India', true),
  ('SUP-GLD-001', 'MMTC-PAMP India Gold Refinery', 'Vikas Singh', 'bullion@mmtcpamp.com', '+91 124 440 4444', 'Gurugram', 'Haryana', 'India', true),
  ('SUP-GLD-002', 'C. Hafner Precious Metals Refining', 'Dr. Philipp Reisert', 'metals@hafner.de', '+49 7044 9030', 'Pforzheim', 'Baden-Württemberg', 'Germany', true),
  ('SUP-PLK-001', 'Surana Jewellers of Jaipur Polki Heritage', 'Prakash Surana', 'polki@suranajewellers.com', '+91 141 236 5555', 'Jaipur', 'Rajasthan', 'India', true),
  ('SUP-PLK-002', 'Kaldhar Polki & Jadau Masters', 'Vikramaditya Rathore', 'jadau@kaldhar.in', '+91 141 257 6666', 'Bikaner', 'Rajasthan', 'India', true),
  ('SUP-EMR-001', 'Gemfields Zambian Emeralds Consortium', 'Adrian Banks', 'emeralds@gemfields.com', '+44 20 7518 3400', 'London', 'Greater London', 'United Kingdom', true),
  ('SUP-PRL-001', 'Paspaley South Sea Pearl Harvesters', 'James Paspaley', 'pearls@paspaley.com.au', '+61 2 9232 7633', 'Darwin', 'Northern Territory', 'Australia', true),
  ('SUP-PRL-002', 'Mikimoto Cultured Pearl Guild', 'Kenichi Sato', 'pearls-export@mikimoto.co.jp', '+81 3 3535 4611', 'Tokyo', 'Kanto', 'Japan', true),
  ('SUP-CHN-001', 'Unoaerre Italian Gold Chain Makers', 'Marco Bazzocchi', 'exports@unoaerre.it', '+39 0575 9251', 'Arezzo', 'Tuscany', 'Italy', true),
  ('SUP-CHN-002', 'Chimet S.p.A Precision Casting Alloys', 'Luca Chimet', 'alloys@chimet.it', '+39 0575 5311', 'Arezzo', 'Tuscany', 'Italy', true),
  ('SUP-PLT-001', 'Anglo American Platinum Guild Refining', 'Natascha Viljoen', 'platinum@angloamerican.com', '+27 11 373 6111', 'Johannesburg', 'Gauteng', 'South Africa', true),
  ('SUP-RBY-001', 'Fura Gems Colombian & Mozambican Rubies', 'Dev Shetty', 'rubies@furagems.com', '+971 4 447 9999', 'Dubai', 'Dubai', 'United Arab Emirates', true),
  ('SUP-SAP-001', 'Ceylon Sapphire Mines Guild', 'Rohan Fernando', 'sapphires@ceylongems.lk', '+94 11 258 7777', 'Ratnapura', 'Sabaragamuwa', 'Sri Lanka', true),
  ('SUP-TAN-001', 'Tanzanite One Mining Ltd', 'Bernard Olivier', 'sales@tanzaniteone.com', '+255 27 250 8888', 'Arusha', 'Arusha', 'Tanzania', true),
  ('SUP-BOX-001', 'Gunther Mele Luxury Velvet Packaging', 'David Mele', 'packaging@gunthermele.com', '+1 519 756 4330', 'Brantford', 'Ontario', 'Canada', true),
  ('SUP-BOX-002', 'Dahlinger Prestige Jewellery Displays', 'Frank Dahlinger', 'displays@dahlinger.com', '+49 7821 2890', 'Lahr', 'Baden-Württemberg', 'Germany', true),
  ('SUP-MCH-001', 'Heimerle + Meule Precious Plating Tech', 'Thomas Rapp', 'finishing@heimerle-meule.com', '+49 7231 9400', 'Pforzheim', 'Baden-Württemberg', 'Germany', true),
  ('SUP-CAD-001', 'MatrixGold CAD Gemological Stuller', 'Matthew Stuller', 'cad@stuller.com', '+1 337 262 7700', 'Lafayette', 'Louisiana', 'United States', true),
  ('SUP-CER-001', 'Gemological Institute of America (GIA)', 'GIA Lab Direct', 'labservice@gia.edu', '+1 760 603 4000', 'Carlsbad', 'California', 'United States', true),
  ('SUP-CER-002', 'International Gemological Institute (IGI)', 'Tehmasp Printer', 'mumbai@igi.org', '+91 22 4035 2550', 'Mumbai', 'Maharashtra', 'India', true),
  ('SUP-TLM-001', 'Legor Group Master Alloys Italy', 'Massimo Poliero', 'masteralloys@legor.com', '+39 0444 467911', 'Bressanvido', 'Veneto', 'Italy', true),
  ('SUP-DIA-004', 'Dharmanandan Diamonds Private Limited', 'Hitesh Patel', 'sales@dnadiamonds.com', '+91 22 2829 4444', 'Surat', 'Gujarat', 'India', true),
  ('SUP-GLD-003', 'Valcambi Suisse Fine Bullion Refinery', 'Michael Mesaric', 'bullion@valcambi.com', '+41 91 695 5311', 'Balerna', 'Ticino', 'Switzerland', true)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 14. Inventory Locations (35 Warehouse Bin/Aisle/Shelf Locations)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_wh record;
BEGIN
  FOR v_i IN 1..35 LOOP
    SELECT * INTO v_wh FROM inventory_warehouses ORDER BY id OFFSET (v_i % 25) LIMIT 1;
    INSERT INTO inventory_locations (
      warehouse_id, code, name, aisle, rack, shelf, bin, is_active
    )
    VALUES (
      v_wh.id,
      'LOC-VLT-' || v_i,
      'High Value Diamond Vault Bay ' || v_i,
      'Aisle-' || ((v_i % 5) + 1),
      'Rack-0' || ((v_i % 4) + 1),
      'Shelf-B' || ((v_i % 3) + 1),
      'Bin-T' || (100 + v_i),
      true
    )
    ON CONFLICT (warehouse_id, code) DO NOTHING;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 15. Inventory Product Locations (35 Product warehouse allocations)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_prod record;
  v_wh record;
  v_loc record;
BEGIN
  FOR v_i IN 1..35 LOOP
    SELECT * INTO v_prod FROM products ORDER BY id OFFSET (v_i % 35) LIMIT 1;
    SELECT * INTO v_wh FROM inventory_warehouses ORDER BY id OFFSET (v_i % 20) LIMIT 1;
    SELECT * INTO v_loc FROM inventory_locations WHERE warehouse_id = v_wh.id LIMIT 1;

    INSERT INTO inventory_product_locations (
      product_id, warehouse_id, location_id, stock_quantity, reserved_stock, damaged_stock, reorder_level, reorder_quantity
    )
    VALUES (
      v_prod.id,
      v_wh.id,
      v_loc.id,
      15 + (v_i * 2),
      (v_i % 4),
      0,
      5,
      10
    )
    ON CONFLICT (product_id, warehouse_id) DO NOTHING;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 16. Inventory Reservations & Reservation Items (30 Reservations)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_order record;
  v_prod record;
  v_wh record;
  v_res_id uuid;
BEGIN
  FOR v_i IN 1..30 LOOP
    SELECT * INTO v_order FROM orders ORDER BY id OFFSET (v_i % 35) LIMIT 1;
    SELECT * INTO v_prod FROM products ORDER BY id OFFSET (v_i % 35) LIMIT 1;
    SELECT * INTO v_wh FROM inventory_warehouses ORDER BY id OFFSET (v_i % 20) LIMIT 1;

    INSERT INTO inventory_reservations (
      reservation_token, order_id, user_id, status, expires_at, created_at, committed_at
    )
    VALUES (
      'RES-TK-' || v_i || '-' || substring(gen_random_uuid()::text from 1 for 8),
      v_order.id,
      v_order."user",
      'committed',
      NOW() + INTERVAL '24 hours',
      NOW() - (v_i * INTERVAL '1 day'),
      NOW() - (v_i * INTERVAL '1 day') + INTERVAL '5 minutes'
    )
    ON CONFLICT (reservation_token) DO NOTHING
    RETURNING id INTO v_res_id;

    IF v_res_id IS NOT NULL THEN
      INSERT INTO inventory_reservation_items (
        reservation_id, product_id, warehouse_id, quantity, created_at
      )
      VALUES (
        v_res_id,
        v_prod.id,
        v_wh.id,
        1,
        NOW() - (v_i * INTERVAL '1 day')
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 17. Inventory Alerts (30 stock warnings)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_prod record;
  v_wh record;
BEGIN
  FOR v_i IN 1..30 LOOP
    SELECT * INTO v_prod FROM products ORDER BY id OFFSET (v_i % 35) LIMIT 1;
    SELECT * INTO v_wh FROM inventory_warehouses ORDER BY id OFFSET (v_i % 20) LIMIT 1;

    INSERT INTO inventory_alerts (
      product_id, warehouse_id, alert_type, status, available_quantity, reorder_level, message, created_at
    )
    VALUES (
      v_prod.id,
      v_wh.id,
      CASE WHEN v_i % 4 = 0 THEN 'out_of_stock' ELSE 'low_stock' END,
      CASE WHEN v_i % 2 = 0 THEN 'resolved' ELSE 'open' END,
      (v_i % 4),
      5,
      'Automated replenishment trigger: stock fallen below minimum safety threshold (5 units).',
      NOW() - (v_i * INTERVAL '1 day')
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 18. Purchase Orders & PO Items (30 POs & Items)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_sup record;
  v_wh record;
  v_prod record;
  v_po_id uuid;
BEGIN
  FOR v_i IN 1..30 LOOP
    SELECT * INTO v_sup FROM inventory_suppliers ORDER BY id OFFSET (v_i % 25) LIMIT 1;
    SELECT * INTO v_wh FROM inventory_warehouses ORDER BY id OFFSET (v_i % 20) LIMIT 1;
    SELECT * INTO v_prod FROM products ORDER BY id OFFSET (v_i % 35) LIMIT 1;

    INSERT INTO purchase_orders (
      purchase_order_number, supplier_id, warehouse_id, status, expected_delivery_date,
      notes, subtotal, tax, shipping, total, created_at, updated_at
    )
    VALUES (
      'PO-2026-VIP-' || lpad(v_i::text, 4, '0'),
      v_sup.id,
      v_wh.id,
      CASE (v_i % 3) WHEN 0 THEN 'received' WHEN 1 THEN 'submitted' ELSE 'draft' END,
      CURRENT_DATE + 15,
      'Pre-season festive bridal replenishment consignment of hallmarked bullion and certified gems.',
      150000.00,
      4500.00,
      1200.00,
      155700.00,
      NOW() - (v_i * INTERVAL '1 day'),
      NOW() - (v_i * INTERVAL '1 day')
    )
    ON CONFLICT (purchase_order_number) DO NOTHING
    RETURNING id INTO v_po_id;

    IF v_po_id IS NOT NULL THEN
      INSERT INTO purchase_order_items (
        purchase_order_id, product_id, ordered_quantity, received_quantity, unit_cost, created_at
      )
      VALUES (
        v_po_id,
        v_prod.id,
        10,
        CASE WHEN (v_i % 3) = 0 THEN 10 ELSE 0 END,
        15000.00,
        NOW() - (v_i * INTERVAL '1 day')
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 19. Inventory Transfers & Transfer Items (30 Transfers)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_wh_from record;
  v_wh_to record;
  v_prod record;
  v_tr_id uuid;
BEGIN
  FOR v_i IN 1..30 LOOP
    SELECT * INTO v_wh_from FROM inventory_warehouses ORDER BY id OFFSET (v_i % 10) LIMIT 1;
    SELECT * INTO v_wh_to FROM inventory_warehouses ORDER BY id OFFSET ((v_i % 10) + 10) LIMIT 1;
    SELECT * INTO v_prod FROM products ORDER BY id OFFSET (v_i % 35) LIMIT 1;

    INSERT INTO inventory_transfers (
      transfer_number, from_warehouse_id, to_warehouse_id, status, notes, created_at, updated_at
    )
    VALUES (
      'TR-2026-VIP-' || lpad(v_i::text, 4, '0'),
      v_wh_from.id,
      v_wh_to.id,
      CASE (v_i % 2) WHEN 0 THEN 'received' ELSE 'in_transit' END,
      'Inter-depository stock balancing for high-demand wedding season regional demand.',
      NOW() - (v_i * INTERVAL '1 day'),
      NOW() - (v_i * INTERVAL '1 day')
    )
    ON CONFLICT (transfer_number) DO NOTHING
    RETURNING id INTO v_tr_id;

    IF v_tr_id IS NOT NULL THEN
      INSERT INTO inventory_transfer_items (
        transfer_id, product_id, quantity, created_at
      )
      VALUES (
        v_tr_id,
        v_prod.id,
        5,
        NOW() - (v_i * INTERVAL '1 day')
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 20. Order Returns (Add 15 records to reach > 35 returns)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_order record;
BEGIN
  FOR v_i IN 22..36 LOOP
    SELECT * INTO v_order FROM orders ORDER BY id OFFSET (v_i % 35) LIMIT 1;
    INSERT INTO order_returns (
      return_number, order_id, order_number, user_id, customer, request_type, status,
      items, calculated_refund_amount, actual_refund_amount, reason, inspection_notes,
      refund_status, created_at, updated_at
    )
    VALUES (
      'RET-2026-VIP-' || lpad(v_i::text, 4, '0'),
      v_order.id,
      v_order."orderId",
      v_order."user",
      COALESCE(v_order.customer, json_build_object('name', 'Royal Patron #' || v_i, 'email', 'patron.' || v_i || '@lustre.com')::jsonb),
      'return',
      'Completed',
      COALESCE(v_order.items, '[]'::jsonb),
      5000.00,
      5000.00,
      'Customer opted for diamond exchange upgrade under 15-day privilege guarantee.',
      'Jewellery examined by GIA gemologist: zero micro-abrasions, seals 100% intact.',
      'Completed',
      NOW() - (v_i * INTERVAL '1 day'),
      NOW() - (v_i * INTERVAL '1 day')
    )
    ON CONFLICT (return_number) DO NOTHING;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 21. Product Bundles, Bundle Items & Cart Bundles (Expand to 30 Bundles, 35 Items, 30 Cart Bundles)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_bndl_id uuid;
  v_prod1 record;
  v_prod2 record;
  v_cart record;
BEGIN
  INSERT INTO product_bundles (name, slug, description, bundle_type, discount_type, discount_value, min_items, is_active, is_featured, image) VALUES
    ('The Imperial Kundan Bridal Suite', 'the-imperial-kundan-bridal-suite', 'Grand heritage suite featuring uncut kundan choker, matching jhumkas, and royal maang tikka.', 'gift_set', 'percentage', 20.00, 2, true, true, 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1000&q=85'),
    ('Starlight Solitaire Diamond Trio', 'starlight-solitaire-diamond-trio', 'A coordinated ensemble of our best-selling solitaire pendant, pavé stud earrings, and eternity ring.', 'fixed_bundle', 'percentage', 15.00, 3, true, true, 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=85'),
    ('Celestial Emerald Gala Set', 'celestial-emerald-gala-set', 'Vibrant emerald teardrop pendant paired with sculpted emerald cascade drop earrings.', 'gift_set', 'percentage', 18.00, 2, true, false, 'https://images.unsplash.com/photo-1590548784585-643d2b9f2925?auto=format&fit=crop&w=1000&q=85'),
    ('Maharani Heritage Polki Suite', 'maharani-heritage-polki-suite', 'Traditional Rajasthani polki necklace paired with matching openable temple bangles.', 'gift_set', 'percentage', 25.00, 2, true, true, 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1000&q=85'),
    ('Vintage Rose Gold Evening Edit', 'vintage-rose-gold-evening-edit', 'Warm 18K rose gold necklace, cocktail ring, and sculpted hoop earrings for special evenings.', 'gift_set', 'percentage', 15.00, 3, true, false, 'https://images.unsplash.com/photo-1589128777073-263566ae5e4d?auto=format&fit=crop&w=1000&q=85'),
    ('Elysian Freshwater Pearl Ensemble', 'elysian-freshwater-pearl-ensemble', 'Lustrous freshwater pearl strand necklace paired with matching pearl huggie earrings.', 'gift_set', 'percentage', 12.00, 2, true, true, 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=85'),
    ('Modern Minimalist Gold Stacking Duo', 'modern-minimalist-gold-stacking-duo', 'Refined everyday gold herringbone chain necklace with matching curb chain bracelet.', 'fixed_bundle', 'percentage', 10.00, 2, true, false, 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&w=1000&q=85'),
    ('Royal Rajputana Temple Collection', 'royal-rajputana-temple-collection', 'Hand-finished antique matte gold temple necklace with carved peacock kadas.', 'gift_set', 'percentage', 20.00, 2, true, true, 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1000&q=85'),
    ('Gilded Lotus Festivity Set', 'gilded-lotus-festivity-set', 'Lotus petal stud earrings paired with gold floral cocktail ring and kada.', 'gift_set', 'percentage', 15.00, 3, true, false, 'https://images.unsplash.com/photo-1526045612212-70caf35c14df?auto=format&fit=crop&w=1000&q=85'),
    ('Noor Diamond Tennis & Studs Duo', 'noor-diamond-tennis-studs-duo', 'Timeless micro-pavé crystal tennis bracelet accompanied by brilliant solitaire studs.', 'fixed_bundle', 'percentage', 15.00, 2, true, true, 'https://images.unsplash.com/photo-1611591475152-47eac9806830?auto=format&fit=crop&w=1000&q=85'),
    ('Sunburst Champagne Cocktail Suite', 'sunburst-champagne-cocktail-suite', 'Champagne crystal cluster ring paired with dramatic chandelier drops for soirees.', 'gift_set', 'percentage', 18.00, 2, true, false, 'https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?auto=format&fit=crop&w=1000&q=85'),
    ('Kashi Filigree Heritage Ensemble', 'kashi-filigree-heritage-ensemble', 'Delicate wirework filigree bangles with matching intricate pendant necklace.', 'gift_set', 'percentage', 15.00, 2, true, false, 'https://images.unsplash.com/photo-1614713568397-b31b779d0499?auto=format&fit=crop&w=1000&q=85'),
    ('Zari Gold Bangle & Choker Pairing', 'zari-gold-bangle-choker-pairing', 'A glamorous pairing of textured gold choker and stackable wedding bangles.', 'gift_set', 'percentage', 20.00, 2, true, true, 'https://images.unsplash.com/photo-1600003014755-ba31aa59c4b6?auto=format&fit=crop&w=1000&q=85'),
    ('Sapphire Velvet Red Carpet Edit', 'sapphire-velvet-red-carpet-edit', 'Deep blue royal sapphire halo ring with complementary sapphire drop necklace.', 'gift_set', 'percentage', 22.00, 2, true, false, 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=1000&q=85'),
    ('Princess Cut Eternity Bridal Duo', 'princess-cut-eternity-bridal-duo', 'Princess cut solitaire engagement ring paired with matching eternity diamond band.', 'fixed_bundle', 'percentage', 15.00, 2, true, true, 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=1000&q=85'),
    ('Aura Micro-Pavé Daily Luxe Set', 'aura-micro-pave-daily-luxe-set', 'Dainty micro-pavé huggie hoops, stacking ring, and paperclip charm bracelet.', 'fixed_bundle', 'percentage', 15.00, 3, true, false, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1000&q=85'),
    ('Sultana Emerald Cascade Collection', 'sultana-emerald-cascade-collection', 'Heirloom Colombian emerald choker with multi-tiered emerald waterfall earrings.', 'gift_set', 'percentage', 25.00, 2, true, true, 'https://images.unsplash.com/photo-1622398925373-3f91b1e275f5?auto=format&fit=crop&w=1000&q=85'),
    ('Chandra Pearl Crescent Suite', 'chandra-pearl-crescent-suite', 'Hand-strung pearl choker with crescent-moon pendant and matching pearl drop earrings.', 'gift_set', 'percentage', 15.00, 2, true, false, 'https://images.unsplash.com/photo-1594913785162-e67852c0f2ee?auto=format&fit=crop&w=1000&q=85'),
    ('The Renaissance Antique Gold Set', 'the-renaissance-antique-gold-set', 'Carved antique gold cuff bracelet, heritage signet ring, and twisted rope necklace.', 'gift_set', 'percentage', 20.00, 3, true, false, 'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?auto=format&fit=crop&w=1000&q=85'),
    ('Opulent Wedding Day Grand Trousseau', 'opulent-wedding-day-grand-trousseau', 'The complete bridal ensemble: bridal kundan choker, haar, jhumkas, maang tikka, and kadas.', 'gift_set', 'percentage', 30.00, 5, true, true, 'https://images.unsplash.com/photo-1615655406736-b37c4fabf923?auto=format&fit=crop&w=1000&q=85')
  ON CONFLICT (slug) DO NOTHING;

  -- Bundle Items (Add items to reach at least 35)
  FOR v_i IN 1..35 LOOP
    SELECT id INTO v_bndl_id FROM product_bundles ORDER BY id OFFSET (v_i % 30) LIMIT 1;
    SELECT * INTO v_prod1 FROM products ORDER BY id OFFSET (v_i % 35) LIMIT 1;

    INSERT INTO product_bundle_items (
      bundle_id, product_id, quantity, group_key, is_required, sort_order
    )
    VALUES (
      v_bndl_id,
      v_prod1.id,
      1,
      'primary_jewel',
      true,
      v_i % 3
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Cart Bundle Items (Populate 30 cart bundles)
  FOR v_i IN 1..30 LOOP
    SELECT * INTO v_cart FROM carts ORDER BY id OFFSET (v_i % 30) LIMIT 1;
    SELECT id INTO v_bndl_id FROM product_bundles ORDER BY id OFFSET (v_i % 30) LIMIT 1;

    IF v_cart.id IS NOT NULL AND v_bndl_id IS NOT NULL THEN
      INSERT INTO cart_bundle_items (
        cart_id, bundle_id, quantity, selected_items, created_at, updated_at
      )
      VALUES (
        v_cart.id,
        v_bndl_id,
        1,
        '[{"item": "Choker"}, {"item": "Matching Drops"}]'::jsonb,
        NOW() - (v_i * INTERVAL '1 day'),
        NOW() - (v_i * INTERVAL '1 day')
      )
      ON CONFLICT (cart_id, bundle_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 22. Product Images (35 gallery images)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_prod record;
BEGIN
  FOR v_i IN 1..35 LOOP
    SELECT * INTO v_prod FROM products ORDER BY id OFFSET (v_i % 35) LIMIT 1;
    INSERT INTO product_images (
      product_id, url, storage_path, alt_text, display_order, is_primary, file_size, mime_type
    )
    VALUES (
      v_prod.id,
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&q=80',
      'products/' || v_prod.id || '/hero-' || v_i || '.webp',
      v_prod.name || ' - High Jewellery Macro Details in 18K Yellow Gold',
      1,
      true,
      245000,
      'image/webp'
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 23. Product Views (50 view records)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_prod record;
  v_user record;
BEGIN
  FOR v_i IN 1..50 LOOP
    SELECT * INTO v_prod FROM products ORDER BY id OFFSET (v_i % 35) LIMIT 1;
    SELECT * INTO v_user FROM users ORDER BY id OFFSET (v_i % 30) LIMIT 1;
    INSERT INTO product_views (
      product_id, user_id, session_id, viewed_at, duration_ms, source
    )
    VALUES (
      v_prod.id,
      v_user.id,
      'sess_view_' || v_i || '_' || substring(gen_random_uuid()::text from 1 for 8),
      NOW() - (v_i * INTERVAL '3 hours'),
      12000 + (v_i * 1500),
      CASE (v_i % 3) WHEN 0 THEN 'direct' WHEN 1 THEN 'recommendation' ELSE 'search' END
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 24. Curated Recommendations (35 pairs)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_prod1 record;
  v_prod2 record;
BEGIN
  FOR v_i IN 1..35 LOOP
    SELECT * INTO v_prod1 FROM products ORDER BY id OFFSET (v_i % 35) LIMIT 1;
    SELECT * INTO v_prod2 FROM products ORDER BY id OFFSET ((v_i + 3) % 35) LIMIT 1;

    INSERT INTO curated_recommendations (
      source_product_id, target_product_id, recommendation_type, position, is_active
    )
    VALUES (
      v_prod1.id,
      v_prod2.id,
      'you_may_also_like',
      v_i % 5,
      true
    )
    ON CONFLICT (source_product_id, target_product_id, recommendation_type) DO NOTHING;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 25. Product Co-Purchases (35 pairs)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_prod1 record;
  v_prod2 record;
BEGIN
  FOR v_i IN 1..35 LOOP
    SELECT * INTO v_prod1 FROM products ORDER BY id OFFSET (v_i % 35) LIMIT 1;
    SELECT * INTO v_prod2 FROM products ORDER BY id OFFSET ((v_i + 5) % 35) LIMIT 1;

    IF v_prod1.id <> v_prod2.id THEN
      INSERT INTO product_co_purchases (
        product_a_id, product_b_id, order_count, last_seen_at
      )
      VALUES (
        LEAST(v_prod1.id, v_prod2.id),
        GREATEST(v_prod1.id, v_prod2.id),
        1 + (v_i % 12),
        NOW() - (v_i * INTERVAL '12 hours')
      )
      ON CONFLICT (product_a_id, product_b_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 26. Recommendation Events (35 events)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_user record;
  v_prod1 record;
  v_prod2 record;
BEGIN
  FOR v_i IN 1..35 LOOP
    SELECT * INTO v_user FROM users ORDER BY id OFFSET (v_i % 30) LIMIT 1;
    SELECT * INTO v_prod1 FROM products ORDER BY id OFFSET (v_i % 35) LIMIT 1;
    SELECT * INTO v_prod2 FROM products ORDER BY id OFFSET ((v_i + 2) % 35) LIMIT 1;

    INSERT INTO recommendation_events (
      user_id, session_id, source_product_id, recommended_product_id,
      recommendation_type, event_type, position, created_at
    )
    VALUES (
      v_user.id,
      'sess_rec_' || v_i,
      v_prod1.id,
      v_prod2.id,
      'you_may_also_like',
      CASE (v_i % 3) WHEN 0 THEN 'click' WHEN 1 THEN 'add_to_cart' ELSE 'impression' END,
      v_i % 4,
      NOW() - (v_i * INTERVAL '4 hours')
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 27. Referral Events (30 events)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_inviter record;
  v_ref record;
BEGIN
  FOR v_i IN 1..30 LOOP
    SELECT * INTO v_inviter FROM users WHERE role = 'customer' ORDER BY id OFFSET (v_i % 15) LIMIT 1;
    SELECT * INTO v_ref FROM users WHERE role = 'customer' ORDER BY id OFFSET ((v_i % 15) + 15) LIMIT 1;

    INSERT INTO referral_events (
      inviter_user_id, referred_user_id, referral_code, email, status,
      landing_page, session_id, created_at, rewarded_at
    )
    VALUES (
      v_inviter.id,
      v_ref.id,
      'LUSTRE-VIP-' || (1000 + v_i),
      v_ref.email,
      CASE (v_i % 4)
        WHEN 0 THEN 'rewarded'
        WHEN 1 THEN 'qualified'
        WHEN 2 THEN 'registered'
        ELSE 'clicked'
      END,
      'https://lustre.com/collection/bridal',
      'sess_ref_' || v_i,
      NOW() - (v_i * INTERVAL '2 days'),
      CASE WHEN (v_i % 4) = 0 THEN NOW() - (v_i * INTERVAL '1 day') ELSE null END
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 28. Loyalty Redemptions (30 Redemptions)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_user record;
BEGIN
  FOR v_i IN 1..30 LOOP
    SELECT * INTO v_user FROM users WHERE role = 'customer' ORDER BY id OFFSET (v_i % 30) LIMIT 1;
    INSERT INTO loyalty_redemptions (
      user_id, points, wallet_amount, idempotency_key, status, created_at
    )
    VALUES (
      v_user.id,
      500 * (1 + (v_i % 4)),
      500.00 * (1 + (v_i % 4)),
      'REDEMP-IDEMP-' || v_i || '-' || substring(gen_random_uuid()::text from 1 for 8),
      'completed',
      NOW() - (v_i * INTERVAL '1 day')
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 29. Loyalty Tiers (Expand to at least 30 tiers)
-- ---------------------------------------------------------------------------
INSERT INTO loyalty_tiers (name, min_lifetime_points, min_lifetime_spend, points_multiplier, birthday_multiplier, benefits, sort_order, is_active)
VALUES
  ('Platinum Patron', 10000, 100000, 2.25, 2.25, '["2.25x multiplier", "Dedicated concierge", "Complimentary private suite viewings"]'::jsonb, 4, true),
  ('Crown Sovereign', 15000, 150000, 2.50, 2.50, '["2.5x multiplier", "Invitation to annual high-jewellery showcase"]'::jsonb, 5, true),
  ('Diamond Luminary', 20000, 200000, 2.75, 2.75, '["2.75x multiplier", "Custom jewel design consultation with head artisan"]'::jsonb, 6, true),
  ('Royal Connoisseur', 25000, 250000, 3.00, 3.00, '["3x multiplier", "Complimentary gold polishing for life"]'::jsonb, 7, true),
  ('Imperial Sovereign', 30000, 300000, 3.25, 3.25, '["Priority allocation on limited numbered editions"]'::jsonb, 8, true),
  ('Heritage Guild Member', 35000, 350000, 3.50, 3.50, '["Annual complimentary gemstone appraisal"]'::jsonb, 9, true),
  ('Solitaire Elite', 40000, 400000, 3.75, 3.75, '["Free laser inscription on all solitaires"]'::jsonb, 10, true),
  ('Emerald Sovereign', 45000, 450000, 4.00, 4.00, '["Access to Zambian emerald private vault"]'::jsonb, 11, true),
  ('Ruby Grandmaster', 50000, 500000, 4.25, 4.25, '["Exclusive invitations to red carpet gala dinners"]'::jsonb, 12, true),
  ('Sapphire Monarch', 55000, 550000, 4.50, 4.50, '["Private chauffeur service to flagship ateliers"]'::jsonb, 13, true),
  ('Pearls Sovereign', 60000, 600000, 4.75, 4.75, '["South Sea harvest first-pick rights"]'::jsonb, 14, true),
  ('Polki Custodian', 65000, 650000, 5.00, 5.00, '["Curated heritage estate acquisitions"]'::jsonb, 15, true),
  ('Kundan Archduke', 70000, 700000, 5.25, 5.25, '["Personal gemologist on call 24/7"]'::jsonb, 16, true),
  ('Gold Sovereign Chancellor', 75000, 750000, 5.50, 5.50, '["Direct bullion wholesale benchmark pricing"]'::jsonb, 17, true),
  ('Artisan Circle Patron', 80000, 800000, 5.75, 5.75, '["Quarterly masterclass with master goldsmiths"]'::jsonb, 18, true),
  ('Centenary Circle', 85000, 850000, 6.00, 6.00, '["Numbered commemorative pure gold medal"]'::jsonb, 19, true),
  ('Couture Ambassador', 90000, 900000, 6.25, 6.25, '["Bespoke wedding trousseau styling service"]'::jsonb, 20, true),
  ('High Jewellery Marquis', 95000, 950000, 6.50, 6.50, '["Geneva auction preview delegation"]'::jsonb, 21, true),
  ('Grand Sovereign VIP', 100000, 1000000, 7.00, 7.00, '["All-inclusive white glove services globally"]'::jsonb, 22, true),
  ('Atelier Benefactor', 110000, 1100000, 7.25, 7.25, '["Private atelier naming honors"]'::jsonb, 23, true),
  ('Golden Fleece Circle', 120000, 1200000, 7.50, 7.50, '["Heirloom vault custody free of charge"]'::jsonb, 24, true),
  ('Diamond Laureate', 130000, 1300000, 7.75, 7.75, '["Bespoke diamond cut trademark privileges"]'::jsonb, 25, true),
  ('Empress Suite Guild', 140000, 1400000, 8.00, 8.00, '["Full bridal suite courtesy security team"]'::jsonb, 26, true),
  ('Regal Sovereign Guild', 150000, 1500000, 8.25, 8.25, '["Worldwide personal delivery by atelier director"]'::jsonb, 27, true),
  ('Lustre Immortal Patron', 200000, 2000000, 10.00, 10.00, '["Lifetime highest honor & custom crest design"]'::jsonb, 28, true),
  ('Atelier Founder Circle', 250000, 2500000, 12.00, 12.00, '["Annual dividend rewards and bespoke family heirlooms"]'::jsonb, 29, true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 30. Marketing Templates & Marketing Email Templates (Expand to at least 30 each)
-- ---------------------------------------------------------------------------
INSERT INTO marketing_email_templates (name, slug, campaign_type, subject, preview_text, html_body, text_body)
VALUES
  ('Diwali Royal Sparkle Gala', 'diwali-sparkle-gala', 'sale', 'Celebrate Diwali with Shubh Muhurat Gold & Diamond Specials', 'Unlock 15% bonus rewards on Dhanteras purchases', '<h1>Diwali Shubh Muhurat Fine Jewellery</h1><p>Celebrate the festival of lights with certified 22K gold jewellery.</p>', 'Diwali Shubh Muhurat Fine Jewellery'),
  ('Akshaya Tritiya Auspicious Gold', 'akshaya-tritiya-gold', 'sale', 'Auspicious Akshaya Tritiya Gold Coins and Parures', 'Invest in purity with 0% making charges on 24K bars', '<h1>Akshaya Tritiya Auspicious Gold</h1><p>Invite eternal prosperity with certified fine bullion.</p>', 'Akshaya Tritiya Auspicious Gold'),
  ('Solitaire Anniversary Milestone', 'solitaire-anniversary', 'newsletter', 'Celebrating Love: Revisit Your Diamond Milestone', 'Special gift enclosed for your upcoming anniversary', '<h1>Anniversary Solitaire Collection</h1><p>Celebrate your eternal journey with timeless diamond brilliance.</p>', 'Anniversary Solitaire Collection'),
  ('Wedding Season Bridal Parure', 'wedding-season-parure', 'new_product', 'The Grand Bridal Parure: Crafted for Royal Brides', 'Discover bespoke royal trousseau suites for 2026', '<h1>The Royal Bridal Suite</h1><p>Exquisite bridal sets handcrafted with unblemished emeralds and uncut polki.</p>', 'The Royal Bridal Suite'),
  ('Valet Concierge Introduction', 'valet-concierge-intro', 'newsletter', 'Your Private Jewellery Concierge is at Your Service', 'Book your one-on-one virtual or boutique appointment', '<h1>White Glove Concierge Service</h1><p>Experience tailored luxury with your dedicated gemologist.</p>', 'White Glove Concierge Service'),
  ('High Jewellery Paris Preview', 'high-jewellery-preview', 'newsletter', 'Private View: The High Jewellery Capsule Collection', 'Strictly limited edition creations numbered 1 of 5', '<h1>High Jewellery Showcase</h1><p>Rare Colombian emeralds and D-Flawless solitaires.</p>', 'High Jewellery Showcase'),
  ('Bespoke Atelier Consultation', 'bespoke-consultation-followup', 'review_request', 'How was your Bespoke Consultation Appointment?', 'Share your experience with our master designer', '<h1>Bespoke Consultation Followup</h1><p>We would love your valuable thoughts on the sketches presented.</p>', 'Bespoke Consultation Followup'),
  ('Men Fine Jewellery Line', 'platinum-men-collection', 'new_product', 'Distinction & Prestige: The Men Platinum and Gold Collection', 'Featuring cufflinks, Cuban chains, and signet rings', '<h1>Men Fine Jewellery Line</h1><p>Understated power and enduring Pt950 craftsmanship.</p>', 'Men Fine Jewellery Line'),
  ('Emerald Spring Bloom', 'emerald-spring-bloom', 'new_product', 'Vibrant Zambian Emeralds in 18K Yellow Gold', 'Spring capsule featuring cocktail rings and drops', '<h1>Emerald Spring Bloom</h1><p>Radiant emerald creations inspired by royal botanical gardens.</p>', 'Emerald Spring Bloom'),
  ('South Sea Pearl Symphony', 'pearl-timeless-elegance', 'newsletter', 'Lustrous South Sea & Tahitian Cultured Pearls', 'Hand-strung necklaces of unmatched oceanic lustre', '<h1>South Sea Pearl Symphony</h1><p>Lustrous pearls harvested from untouched coral waters.</p>', 'South Sea Pearl Symphony'),
  ('Romantic Rose Gold Whisper', 'rose-gold-romantic', 'newsletter', 'Blush Romance: 18K Rose Gold & Pink Sapphires', 'Delicate everyday pendants and eternity rings', '<h1>Romantic Rose Gold Whisper</h1><p>Modern warm hues designed for contemporary daily elegance.</p>', 'Romantic Rose Gold Whisper'),
  ('Festive Gold Cashback Delight', 'festive-cashback-reward', 'sale', 'Exclusive Privilege Cashback on Gold Coin Purchases', 'Earn up to 5,000 bonus loyalty points today', '<h1>Festive Gold Cashback Delight</h1><p>Reinvest in certified purity with instant reward credits.</p>', 'Festive Gold Cashback Delight'),
  ('Private Vault Viewing Invitation', 'exclusive-vault-viewing', 'newsletter', 'You are Invited: Secret Vault Viewing in Mumbai Flagship', 'RSVP for private champagne reception and viewing', '<h1>Private Vault Viewing</h1><p>Inspect unreleased heirloom diamonds before the public debut.</p>', 'Private Vault Viewing'),
  ('Diamond Care & Maintenance PDF', 'diamond-care-guide-pdf', 'order_update', 'Your Complimentary Lustre & Co. Diamond Care Guide', 'Preserve the eternal shine of your new acquisition', '<h1>Diamond Care Guide</h1><p>Essential maintenance and inspection advice from our chief setter.</p>', 'Diamond Care Guide'),
  ('Complimentary Ring Sizing Alert', 'ring-sizing-assistance', 'order_update', 'Does Your Ring Fit Perfectly? Enjoy Free Sizing', 'Complimentary 30-day resizing service included', '<h1>Ring Sizing Assistance</h1><p>Our concierge will dispatch an insured return package at your request.</p>', 'Ring Sizing Assistance'),
  ('Wishlist Back In Stock Alert', 'wishlist-item-back-in-stock', 'back_in_stock', 'Your Desired Piece is Back in Stock!', 'Only 2 units remain of this popular handcrafted design', '<h1>Back In Stock Alert</h1><p>The masterpiece from your wishlist has returned to our vault.</p>', 'Back In Stock Alert'),
  ('VIP Private Salon Secret Sale', 'vip-private-sale-invite', 'sale', 'Strictly for VIP Members: Private Salon Savings', 'Save 20% on making charges for 48 hours only', '<h1>VIP Private Salon Sale</h1><p>Early access privilege reserved for our top tier patrons.</p>', 'VIP Private Salon Sale'),
  ('Milestone Anniversary Reminder', 'milestone-anniversary-gift', 'newsletter', 'Upcoming Milestone: Let Us Help You Celebrate', 'Discover anniversary eternity bands and diamond pendants', '<h1>Anniversary Celebration</h1><p>Make this year unforgettable with an engraved bespoke piece.</p>', 'Anniversary Celebration'),
  ('Unboxing Delight & Review', 'unboxing-delight-review', 'review_request', 'How was your Lustre & Co. Unboxing Experience?', 'Leave a review and receive 500 reward points', '<h1>Review Your Acquisition</h1><p>We take pride in every velvet box that leaves our atelier.</p>', 'Review Your Acquisition'),
  ('Referral Bonus Unlocked Notice', 'referral-bonus-unlocked', 'order_update', 'Great News! Your Friend Completed Their First Purchase', 'We have credited 500 points to your loyalty account', '<h1>Referral Reward Credited</h1><p>Thank you for introducing discerning friends to our atelier.</p>', 'Referral Reward Credited'),
  ('Birthday Sparkle Celebration', 'birthday-celebration-voucher', 'newsletter', 'Happy Birthday from Lustre & Co.! Here is Your Gift', 'Enjoy ₹2,500 off your birthday celebration jewel', '<h1>Happy Birthday Celebrations</h1><p>Wishing you joy and radiance on your special day.</p>', 'Happy Birthday Celebrations'),
  ('Abandoned Cart Curated Offer', 'abandoned-cart-curated-offer', 'abandoned_cart', 'Still Dreaming About Your Jewellery Piece?', 'We have reserved your cart with complimentary gift wrapping', '<h1>Your Reserved Cart</h1><p>Complete your purchase before vault reservation expires.</p>', 'Your Reserved Cart'),
  ('Auspicious Bullion Coin Launch', 'gold-coin-auspicious-purchase', 'new_product', 'New Minting: 24K Goddess Lakshmi & Lord Ganesha Coins', 'Certified 999.9 fine investment bullion coins', '<h1>Auspicious Gold Bullion</h1><p>Consecrated gold coins struck in ultra-high relief.</p>', 'Auspicious Gold Bullion'),
  ('Bridal Trousseau Styling Consultation', 'bridal-trousseau-styling', 'newsletter', 'Complete Trousseau Styling Guide for Indian Weddings', 'From Mehendi polki to Sangeet diamonds and Reception solitaires', '<h1>Bridal Trousseau Styling</h1><p>Curated bridal advice from celebrity fashion stylists.</p>', 'Bridal Trousseau Styling'),
  ('Polki Jadau Heritage Master Story', 'polki-heritage-story', 'newsletter', 'The Art of Uncut Diamonds: 400 Years of Jadau History', 'A behind-the-scenes journey into our Bikaner workshops', '<h1>The Art of Polki Jadau</h1><p>Explore the intricate art of 24K gold foil setting.</p>', 'The Art of Polki Jadau')
ON CONFLICT (slug) DO NOTHING;

-- Mirror to marketing_templates
INSERT INTO marketing_templates (name, template_key, campaign_type, subject, preheader, html_body, text_body)
SELECT name, slug, campaign_type, subject, preview_text, html_body, text_body
FROM marketing_email_templates
ON CONFLICT (template_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 31. Marketing Events (35 events)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_camp record;
  v_rec record;
  v_types text[] := ARRAY['sent', 'delivered', 'opened', 'clicked'];
BEGIN
  FOR v_i IN 1..35 LOOP
    SELECT * INTO v_camp FROM marketing_campaigns ORDER BY id OFFSET (v_i % 30) LIMIT 1;
    SELECT * INTO v_rec FROM marketing_campaign_recipients ORDER BY id OFFSET (v_i % 30) LIMIT 1;

    INSERT INTO marketing_events (
      campaign_id, recipient_id, event_type, metadata
    )
    VALUES (
      v_camp.id,
      v_rec.id,
      v_types[1 + (v_i % 4)],
      json_build_object('link_url', 'https://lustre.com/collection/bridal', 'client', 'Apple Mail on iOS 18', 'ip', '103.21.244.' || (v_i * 2))::jsonb
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 32. Marketing Unsubscribes (30 unsubscribes)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
BEGIN
  FOR v_i IN 1..30 LOOP
    INSERT INTO marketing_unsubscribes (
      email, reason, source, created_at
    )
    VALUES (
      'optout.patron.' || v_i || '@lux-domain.com',
      CASE (v_i % 3)
        WHEN 0 THEN 'Purchased wedding jewellery already'
        WHEN 1 THEN 'Too many email promotions'
        ELSE 'Prefer WhatsApp private channel updates'
      END,
      'email_footer_link',
      NOW() - (v_i * INTERVAL '1 day')
    )
    ON CONFLICT (email) DO NOTHING;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 33. Back In Stock Requests (30 requests)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_prod record;
BEGIN
  FOR v_i IN 1..30 LOOP
    SELECT * INTO v_prod FROM products ORDER BY id OFFSET (v_i % 35) LIMIT 1;
    INSERT INTO back_in_stock_requests (
      product_id, email, phone, channel, status, created_at
    )
    VALUES (
      v_prod.id,
      'stock.alert.' || v_i || '@gmail.com',
      '+91 98201 ' || (40000 + v_i),
      'email',
      CASE WHEN v_i % 2 = 0 THEN 'waiting' ELSE 'notified' END,
      NOW() - (v_i * INTERVAL '1 day')
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 34. Analytics Daily Metrics (35 daily records)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_date date;
BEGIN
  FOR v_i IN 1..35 LOOP
    v_date := CURRENT_DATE - v_i;
    INSERT INTO analytics_daily_metrics (
      metric_date, gross_revenue, net_revenue, refund_total,
      order_count, customer_count, new_customer_count, returning_customer_count,
      checkout_started_count, checkout_completed_count, abandoned_cart_count,
      cod_order_count, online_order_count
    )
    VALUES (
      v_date,
      250000.00 + (v_i * 7500),
      242000.00 + (v_i * 7200),
      8000.00,
      4 + (v_i % 5),
      4 + (v_i % 4),
      2 + (v_i % 3),
      2 + (v_i % 2),
      8 + (v_i % 6),
      4 + (v_i % 5),
      4 + (v_i % 3),
      1,
      3 + (v_i % 4)
    )
    ON CONFLICT (metric_date) DO NOTHING;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 35. Analytics Product Daily Metrics (35 daily product metrics)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_prod record;
BEGIN
  FOR v_i IN 1..35 LOOP
    SELECT * INTO v_prod FROM products ORDER BY id OFFSET (v_i % 35) LIMIT 1;
    INSERT INTO analytics_product_daily_metrics (
      metric_date, product_id, view_count, add_to_cart_count, purchase_count, revenue
    )
    VALUES (
      CURRENT_DATE - (v_i % 7),
      v_prod.id,
      45 + (v_i * 3),
      12 + (v_i % 5),
      2 + (v_i % 3),
      (v_prod.price * (2 + (v_i % 3)))
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 36. Analytics Export Jobs (30 export jobs)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_admin record;
  v_types text[] := ARRAY['orders', 'customers', 'products', 'revenue', 'inventory'];
BEGIN
  SELECT * INTO v_admin FROM users WHERE role = 'admin' LIMIT 1;

  FOR v_i IN 1..30 LOOP
    INSERT INTO analytics_export_jobs (
      requested_by, export_type, file_format, filters, status, file_url, created_at, completed_at
    )
    VALUES (
      v_admin.id,
      v_types[1 + (v_i % 5)],
      CASE WHEN v_i % 2 = 0 THEN 'csv' ELSE 'xlsx' END,
      json_build_object('date_range', 'last_30_days', 'channel', 'all')::jsonb,
      'completed',
      'https://storage.lustre.com/exports/lustre_export_' || v_types[1 + (v_i % 5)] || '_' || v_i || '.csv',
      NOW() - (v_i * INTERVAL '1 day'),
      NOW() - (v_i * INTERVAL '1 day') + INTERVAL '45 seconds'
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 37. Auth Refresh Tokens (30 tokens)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_i integer;
  v_user record;
BEGIN
  FOR v_i IN 1..30 LOOP
    SELECT * INTO v_user FROM users ORDER BY id OFFSET (v_i % 35) LIMIT 1;
    INSERT INTO auth_refresh_tokens (
      user_id, token_hash, device_info, ip_address, expires_at, revoked, created_at
    )
    VALUES (
      v_user.id,
      'refresh_token_sha256_' || v_i || '_' || substring(gen_random_uuid()::text from 1 for 16),
      CASE (v_i % 3)
        WHEN 0 THEN 'Safari 18 on iPhone 16 Pro Max (iOS 18.2)'
        WHEN 1 THEN 'Google Chrome 132 on MacBook Pro M3 Max (macOS Sequoia)'
        ELSE 'Mozilla Firefox 134 on Windows 11 Enterprise'
      END,
      '103.21.244.' || (v_i * 4),
      NOW() + INTERVAL '30 days',
      false,
      NOW() - (v_i * INTERVAL '1 day')
    )
    ON CONFLICT (token_hash) DO NOTHING;
  END LOOP;
END $$;
