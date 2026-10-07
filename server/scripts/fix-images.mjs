import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env manually
const envPath = path.resolve(process.cwd(), '.env');
const envText = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
}

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const VERIFIED_IMAGES = {
  necklaces: [
    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1590548784585-643d2b9f2925?auto=format&fit=crop&w=1000&q=85",
  ],
  earrings: [
    "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1589128777073-263566ae5e4d?auto=format&fit=crop&w=1000&q=85",
  ],
  rings: [
    "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1598560917505-59a3ad559071?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&w=1000&q=85",
  ],
  bracelets: [
    "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1611042553365-9b101441c135?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1600003014755-ba31aa59c4b6?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=1000&q=85",
  ],
  bangles: [
    "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1611042553365-9b101441c135?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1600003014755-ba31aa59c4b6?auto=format&fit=crop&w=1000&q=85",
  ]
};

async function run() {
  console.log("Checking all products in Supabase...");
  const { data: products, error } = await sb.from('products').select('id, name, slug, category, image, gallery');
  if (error) {
    console.error("Supabase error:", error);
    return;
  }
  console.log(`Found ${products.length} products total.`);

  let updatedCount = 0;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const cat = (p.category || 'necklaces').toLowerCase();
    const catPool = VERIFIED_IMAGES[cat] || VERIFIED_IMAGES.necklaces;
    const primaryImg = catPool[i % catPool.length];
    const galleryImgs = [
      primaryImg,
      catPool[(i + 1) % catPool.length],
      catPool[(i + 2) % catPool.length],
    ];

    const isBroken = !p.image ||
      p.image.includes('photo-1594913785162') ||
      p.image.includes('photo-1584308666744') ||
      p.image.includes('photo-1543290108-5f8e71ecb80a') ||
      p.image.includes('photo-1596944924616-7b38e7cfac37') ||
      p.image.includes('photo-1630019852942') ||
      p.image.includes('photo-1586104195538') ||
      p.image.includes('photo-1543290108-5f8e71ecb809') ||
      p.image.includes('photo-1569397288884') ||
      p.image.includes('photo-1617038220319-276d3cfab639') ||
      p.image.includes('photo-1539185441755') ||
      p.image.includes('photo-1600003014608') ||
      p.image.includes('photo-1611591475836');

    if (isBroken) {
      const { error: updateErr } = await sb.from('products').update({
        image: primaryImg,
        gallery: galleryImgs,
      }).eq('id', p.id);

      if (updateErr) {
        console.error(`Failed to update ${p.name}:`, updateErr.message);
      } else {
        updatedCount++;
        console.log(`Updated [${p.name}] (${cat}) with verified image: ${primaryImg.split('?')[0]}`);
      }
    }
  }

  console.log(`\nFinished! Successfully updated ${updatedCount} products.`);
}

run();
