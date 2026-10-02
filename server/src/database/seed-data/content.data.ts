/** Initial storefront content. Seeded once; afterwards it is managed from the admin panel. */

export const SEED_CATEGORIES = [
  {
    name: 'Necklaces',
    slug: 'necklaces',
    eyebrow: 'Necklace Collection',
    title: 'Necklaces & Chokers',
    description: 'Layered chains, bridal chokers, and delicate pendants for every neckline.',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=85',
    sortOrder: 1,
    isActive: true,
    showInMenu: true,
    showOnHome: true,
  },
  {
    name: 'Earrings',
    slug: 'earrings',
    eyebrow: 'Earring Collection',
    title: 'Earrings & Drops',
    description: 'From understated studs to bridal chandbalis, discover the ideal pair.',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=85',
    sortOrder: 2,
    isActive: true,
    showInMenu: true,
    showOnHome: true,
  },
  {
    name: 'Rings',
    slug: 'rings',
    eyebrow: 'Ring Collection',
    title: 'Rings & Bands',
    description: 'Sculpted signets, adjustable statement bands, and cocktail rings.',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=85',
    sortOrder: 3,
    isActive: true,
    showInMenu: true,
    showOnHome: true,
  },
  {
    name: 'Bracelets',
    slug: 'bracelets',
    eyebrow: 'Bracelet Collection',
    title: 'Bracelets & Cuffs',
    description: 'Luminous tennis bracelets, sculpted cuffs, and delicate pearl links.',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=85',
    sortOrder: 4,
    isActive: true,
    showInMenu: true,
    showOnHome: true,
  },
  {
    name: 'Bangles',
    slug: 'bangles',
    eyebrow: 'Bangle Collection',
    title: 'Bangles & Kadas',
    description: 'Festive stacks, antique temple kadas, and faceted single bangles.',
    image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=85',
    sortOrder: 5,
    isActive: true,
    showInMenu: true,
    showOnHome: false,
  },
];

export const SEED_COUPONS = [
  { code: 'SHINE10', type: 'percentage', value: 0.1, minOrderAmount: 0, usageLimit: 0, usedCount: 0, isActive: true, description: 'Newsletter welcome offer' },
  { code: 'LUSTRE20', type: 'percentage', value: 0.2, minOrderAmount: 1999, usageLimit: 0, usedCount: 0, isActive: true, description: '20% off orders above ₹1,999' },
  { code: 'FREESHIP', type: 'free_shipping', value: 0, minOrderAmount: 0, usageLimit: 0, usedCount: 0, isActive: true, description: 'Free standard delivery' },
  { code: 'BRIDAL25', type: 'percentage', value: 0.25, minOrderAmount: 4999, usageLimit: 0, usedCount: 0, isActive: true, description: 'Bridal edit offer' },
];

export const SEED_PAGES = [
  {
    slug: 'about',
    title: 'Beautiful details should feel effortless.',
    eyebrow: 'Our story',
    description: 'We create approachable jewelry for the way modern women actually live, dress, celebrate, and give.',
    isPublished: true,
    sections: [
      {
        eyebrow: 'Our point of view',
        heading: 'Jewelry is a small detail with a big feeling.',
        body:
          'Lustre & Co. began with a simple belief: beautiful style should not need to feel distant or difficult to reach.\n\nOur collections bring together modern silhouettes, soft feminine details, and occasion-ready sparkle at accessible prices. Every piece is selected to be worn, enjoyed, gifted, and remembered.',
        image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=85',
        ctaLabel: 'Explore the collection',
        ctaLink: '/shop',
      },
      {
        eyebrow: 'What guides us',
        heading: 'Simple values, thoughtfully applied.',
        items: [
          { title: 'Accessible elegance', text: 'Premium-looking pieces designed to make polished styling feel within reach.' },
          { title: 'Thoughtful selection', text: 'We choose designs that feel current today and easy to wear again tomorrow.' },
          { title: 'Human service', text: 'Clear communication, dependable support, and a shopping experience you can trust.' },
        ],
      },
    ],
  },
  {
    slug: 'shipping-returns',
    title: 'Shipping & returns',
    eyebrow: 'The useful details',
    description: 'Everything you need to know about delivery, returns, exchanges, and refunds.',
    isPublished: true,
    sections: [
      {
        eyebrow: '01 · Delivery',
        heading: 'Shipping',
        body: 'Orders are generally processed within 1–2 business days. Once dispatched, delivery usually takes approximately 3–5 business days, depending on your location.',
        bullets: [
          'Free shipping on orders above ₹1,999.',
          'Delivery estimates are shown at checkout.',
          'Tracking details are shared after dispatch.',
          'Please provide an accurate phone number and address.',
        ],
      },
      {
        eyebrow: '02 · Eligibility',
        heading: 'Returns',
        body: 'Eligible items can be returned within 7 days of delivery. Items must be unworn, unused, and in their original packaging.',
        bullets: [
          'Return requests should include your order number.',
          'Items must pass a quality inspection.',
          'Products damaged after use may not qualify.',
          'Sale items may have special return conditions.',
        ],
      },
      {
        eyebrow: '03 · Replacement',
        heading: 'Exchanges',
        body: 'If you receive a damaged, incorrect, or defective item, contact support as soon as possible with photographs and your order details.',
      },
      {
        eyebrow: '04 · Refunds',
        heading: 'Refunds',
        body: 'Approved refunds are processed to the original payment method. The time taken for the amount to appear can vary by bank or payment provider.',
      },
    ],
  },
  {
    slug: 'jewelry-care',
    title: 'Jewelry care guide',
    eyebrow: 'Keep your shine',
    description: 'A little thoughtful care helps your favorite pieces stay beautiful for longer.',
    isPublished: true,
    sections: [
      {
        eyebrow: 'The everyday ritual',
        heading: 'Treat your jewelry gently, and it will keep showing up beautifully.',
        body: 'Our imitation jewelry is made for enjoying. To help preserve its finish, protect it from moisture, cosmetics, friction, and harsh chemicals.',
      },
      {
        eyebrow: 'Care essentials',
        heading: 'Five habits that protect the finish.',
        items: [
          { title: 'Keep it dry', text: 'Remove jewelry before showering, swimming, exercising, or washing your hands.' },
          { title: 'Apply products first', text: 'Let perfume, lotion, sunscreen, and makeup settle before putting on your jewelry.' },
          { title: 'Store separately', text: 'Keep each piece in its pouch or a separate compartment to reduce scratches and tangling.' },
          { title: 'Clean gently', text: 'Use a soft, dry microfiber cloth. Avoid abrasive cleaners and harsh chemicals.' },
          { title: 'Put it on last', text: 'Make jewelry the final touch after dressing and the first accessory you remove.' },
        ],
      },
      {
        eyebrow: 'By jewelry type',
        heading: 'Small habits for every piece.',
        items: [
          { title: 'Necklaces', text: 'Fasten clasps before storing and keep chains flat or hanging to reduce tangling.' },
          { title: 'Earrings', text: 'Wipe posts and backs gently after wearing, especially after long celebrations.' },
          { title: 'Rings', text: 'Remove rings before using cleaning products or applying hand cream.' },
          { title: 'Bracelets & bangles', text: 'Store them separately and avoid stacking pieces that may rub against one another.' },
        ],
      },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    eyebrow: 'Trust & Transparency',
    description: 'This policy outlines how we collect, protect, and handle your personal information when you shop with us.',
    isPublished: true,
    sections: [
      {
        heading: '1. Information We Collect',
        body: 'When you browse our catalog, create an account, or complete a checkout, we collect the details needed to fulfil your orders, including:',
        bullets: [
          'Contact details: name, email address, phone number, and delivery address.',
          'Payment details: transaction identifiers from our payment gateway (we never store card numbers).',
          'Device and browsing data: preference data stored in your browser to remember your bag and wishlist.',
        ],
      },
      {
        heading: '2. How We Protect Your Data',
        body: 'Passwords are stored as one-way hashes, and access to customer records is restricted to authorized store staff.',
      },
      {
        heading: '3. Cookies & Personalization',
        body: 'We use local browser storage to remember your bag contents and wishlist. You can clear this at any time in your browser settings.',
      },
      {
        heading: '4. Your Rights',
        body: 'You may access, correct, or request deletion of your personal account information at any time by contacting our support team.',
      },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms & Conditions',
    eyebrow: 'Trust & Transparency',
    description: 'By accessing our store or purchasing our imitation jewelry, you agree to the following terms.',
    isPublished: true,
    sections: [
      {
        heading: '1. Product Descriptions & Materials',
        body: 'We specialize in imitation jewelry crafted with alloy cores, gold-tone plating, and cubic zirconia stones. While we make every effort to display accurate colors and finishes, subtle variations may occur due to screen calibration.',
      },
      {
        heading: '2. Pricing & Orders',
        body: 'All prices are listed in local currency. Applicable taxes and delivery charges are shown at checkout. We reserve the right to cancel orders in cases of pricing errors or stock exhaustion.',
      },
      {
        heading: '3. Delivery & Returns',
        body: 'Orders typically dispatch within 1–2 business days. Unused, unworn jewelry in its original packaging qualifies for return within the return window described in our Shipping & Returns policy.',
      },
      {
        heading: '4. Jewelry Care & Warranty',
        body: 'Imitation jewelry requires proper care to maintain its finish. Avoid direct exposure to perfume, sanitizers, chlorinated water, and abrasive chemicals. See our Jewelry Care Guide for recommendations.',
      },
    ],
  },
];

const faq = (group: string, sortOrder: number, question: string, answer: string) => ({
  group,
  sortOrder,
  question,
  answer,
  isActive: true,
});

export const SEED_FAQS = [
  faq('Orders', 1, 'How do I place an order?', 'Add your favorite pieces to your bag, proceed to checkout, add your delivery details, and select a payment method.'),
  faq('Orders', 2, 'Can I modify my order?', 'If your order has not entered processing, contact us as quickly as possible and we will do our best to help.'),
  faq('Orders', 3, 'Can I cancel my order?', 'Cancellation requests are handled before dispatch. Contact our support team with your order number.'),
  faq('Products', 1, 'What materials are used?', 'Our pieces use imitation pearls, stones, and alloy bases with gold-tone, champagne-gold, rose-gold, or antique finishes.'),
  faq('Products', 2, 'Are the products waterproof?', 'Our jewelry is not designed for prolonged exposure to water, perfumes, lotions, or harsh chemicals.'),
  faq('Products', 3, 'Is this fine jewelry?', 'We create imitation jewelry. Product pages include the relevant finish and material details.'),
  faq('Shipping and returns', 1, 'How long does delivery take?', 'Orders are usually dispatched within 1–2 business days and delivered within approximately 3–5 business days after dispatch.'),
  faq('Shipping and returns', 2, 'What is the return period?', 'Eligible items may be returned within 7 days of delivery in their original condition.'),
  faq('Shipping and returns', 3, 'How can I track my order?', 'Use the Track My Order page with your order number and email address.'),
  faq('Payments', 1, 'Which payment methods are available?', 'Cash on delivery is available for eligible orders, and online payment is offered at checkout when enabled.'),
  faq('Payments', 2, 'Are online payments secure?', 'Online payments are processed by our payment gateway. We never see or store your complete card details.'),
];
