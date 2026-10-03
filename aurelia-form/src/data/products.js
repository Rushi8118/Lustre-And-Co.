/**
 * Original sample catalogue. Products have no photos; each one is shown as a 3D
 * piece built from `kind`. To use photography later, add an `image` path to a product.
 */
export const COLLECTIONS = [
  {
    slug: "solis",
    name: "Solis",
    mood: "Sunlit, warm and open",
    description: "Round forms that gather daylight. Built for slow mornings and long dinners.",
    background: "#f3e7cf",
    accent: "#c8a45d",
  },
  {
    slug: "tidal",
    name: "Tidal",
    mood: "Soft, layered, unhurried",
    description: "Pearls set on fluid lines, inspired by the tide pulling back over sand.",
    background: "#e9eef2",
    accent: "#8d9aaa",
  },
  {
    slug: "arc",
    name: "Arc",
    mood: "Clean, sculptural, precise",
    description: "A single continuous curve, cut to sit close and move with you.",
    background: "#f6e6e1",
    accent: "#c9847b",
  },
  {
    slug: "nocturne",
    name: "Nocturne",
    mood: "Deep, quiet, after dark",
    description: "Ink-blue tones and restrained gold for evenings that need no explanation.",
    background: "#dfe4ec",
    accent: "#172033",
  },
];

/** Category keys match the product `kind` mapping in categoryFor(). */
export const CATEGORIES = [
  { slug: "rings", name: "Rings" },
  { slug: "necklaces", name: "Necklaces" },
  { slug: "earrings", name: "Earrings" },
  { slug: "bracelets", name: "Bracelets" },
];

const KIND_TO_CATEGORY = {
  ring: "rings",
  pendant: "necklaces",
  earring: "earrings",
  bracelet: "bracelets",
};

export function categoryFor(kind) {
  return KIND_TO_CATEGORY[kind];
}

const description = {
  ring: "A sculpted band rising to a single stone, set in a fine open collar.",
  pendant: "A drop-shaped form that hangs with weight and quiet movement.",
  earring: "Light, balanced and made to be worn all day without fuss.",
  bracelet: "An open band that follows the wrist and catches light as you move.",
};

const care = [
  "Store flat in the pouch provided, away from direct sun.",
  "Wipe gently with a soft dry cloth after wear.",
  "Remove before swimming, showering or using fragrance.",
];

export const PRODUCTS = [
  { id: "solis-sun-ring", name: "Solis Sun Ring", collection: "solis", kind: "ring", price: 18500, stock: 6, sizes: ["6", "7", "8", "9"], tagline: "The stone rests high, like a warm noon." },
  { id: "solis-halo-pendant", name: "Solis Halo Pendant", collection: "solis", kind: "pendant", price: 14200, stock: 0, sizes: [], tagline: "A rounded drop that sits softly at the collarbone." },
  { id: "solis-stud", name: "Solis Stud Earrings", collection: "solis", kind: "earring", price: 6400, stock: 12, sizes: [], tagline: "Small bright points for everyday light." },
  { id: "tidal-pearl-bracelet", name: "Tidal Pearl Bracelet", collection: "tidal", kind: "bracelet", price: 11800, stock: 4, sizes: ["Small", "Medium", "Large"], tagline: "Pearls strung on a fine open band." },
  { id: "tidal-drop-pendant", name: "Tidal Drop Pendant", collection: "tidal", kind: "pendant", price: 9600, stock: 9, sizes: [], tagline: "A single pearl, softened at the edges." },
  { id: "tidal-pearl-earring", name: "Tidal Pearl Drop Earrings", collection: "tidal", kind: "earring", price: 7200, stock: 0, sizes: [], tagline: "A pearl hangs from a hook of gold." },
  { id: "arc-band-ring", name: "Arc Band Ring", collection: "arc", kind: "ring", price: 12900, stock: 8, sizes: ["5", "6", "7", "8"], tagline: "One unbroken curve, polished to a soft gleam." },
  { id: "arc-hoop", name: "Arc Hoop Earrings", collection: "arc", kind: "earring", price: 8700, stock: 5, sizes: [], tagline: "A hoop that reads as a single line." },
  { id: "arc-cuff", name: "Arc Cuff Bracelet", collection: "arc", kind: "bracelet", price: 15600, stock: 3, sizes: ["Small", "Medium", "Large"], tagline: "A sculpted cuff with a rose-tinged edge." },
  { id: "nocturne-signet", name: "Nocturne Signet Ring", collection: "nocturne", kind: "ring", price: 21400, stock: 2, sizes: ["7", "8", "9", "10"], tagline: "Dark stone, quiet gold, made for evenings." },
  { id: "nocturne-pendant", name: "Nocturne Pendant", collection: "nocturne", kind: "pendant", price: 17800, stock: 4, sizes: [], tagline: "A deep drop for the hollow of the throat." },
  { id: "nocturne-chain", name: "Nocturne Chain Bracelet", collection: "nocturne", kind: "bracelet", price: 19300, stock: 0, sizes: ["Small", "Medium", "Large"], tagline: "Fine links that move as one." },
].map((product) => ({
  ...product,
  category: categoryFor(product.kind),
  material: product.kind === "pendant" ? "Pearl and gold" : "Gold plated, sterling core",
  description: description[product.kind],
  care,
  inStock: product.stock > 0,
}));

export const JOURNAL = [
  {
    slug: "language-of-curves",
    title: "The language of curves",
    excerpt: "Why a continuous line feels calm to the eye, and how we draw it by hand before it is ever modelled.",
    body: [
      "Every piece begins as a line we draw without lifting the pen. The line should read as one breath, not as a series of joins.",
      "We test each curve in three lights: morning, office and candle. A curve that holds in all three is a curve we keep.",
    ],
  },
  {
    slug: "why-jewellery-catches-the-eye",
    title: "Why jewellery catches the eye",
    excerpt: "Light is the material you cannot hold. A short look at polish, angle and the moment a surface turns bright.",
    body: [
      "A metal surface is only as beautiful as the reflections it carries. We polish to a level where the room itself appears in the gold.",
      "Movement matters too. A piece that turns slightly on the hand gives the eye a reason to return.",
    ],
  },
  {
    slug: "designed-for-everyday-rituals",
    title: "Designed for everyday rituals",
    excerpt: "Pieces that survive the morning routine, the commute and the dinner table without asking for attention.",
    body: [
      "We design for the hours a piece actually spends on the body: typing, washing hands, reaching for a cup.",
      "So the clasps are secure, the edges are soft, and the weight sits where it should.",
    ],
  },
];

export const TESTIMONIALS = [
  { quote: "It catches the window light in a way that makes me look twice each morning.", name: "Meera S.", place: "Bengaluru" },
  { quote: "Lighter than I expected and still striking. The rose finish is quietly beautiful.", name: "Anika R.", place: "Mumbai" },
  { quote: "Sent it as a gift. The packaging felt like part of the story.", name: "Daniel K.", place: "London" },
];

export const SHIPPING_NOTE = "Complimentary insured delivery on orders over ₹5,000. Returns accepted within 14 days.";
