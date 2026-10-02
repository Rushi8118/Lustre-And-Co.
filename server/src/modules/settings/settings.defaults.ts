export const DEFAULT_SETTINGS = {
  store: {
    name: 'Lustre & Co.',
    tagline: 'Everyday elegance, made to shine.',
    description:
      'Modern imitation jewelry crafted for everyday elegance, memorable celebrations, and timeless gifting. Designed with hypoallergenic materials, 18K gold tones, and enduring brilliance.',
    supportEmail: 'concierge@lustreandco.com',
    supportPhone: '+1 (555) 234-5878',
    whatsappNumber: '',
    address: '742 Evergreen Terrace, Suite 4B, San Francisco, CA 94107',
    hours: 'Mon – Sat: 9:00 AM – 7:00 PM EST',
  },
  social: {
    instagram: 'https://instagram.com',
    facebook: 'https://facebook.com',
    youtube: 'https://youtube.com',
    whatsapp: 'https://wa.me',
  },
  commerce: {
    currency: 'INR',
    freeShippingThreshold: 1999,
    shippingFee: 99,
    expressShippingFee: 199,
    taxPercent: 3,
    codEnabled: true,
    returnWindowDays: 7,
    dispatchTime: '1–2 business days',
    standardDelivery: '3–5 business days',
    expressDelivery: '1–2 business days',
    lowStockThreshold: 15,
    autoApproveReviews: false,
  },
  announcement: {
    enabled: true,
    messages: ['Complimentary shipping on orders over ₹1,999', 'Easy returns within 7 days'],
  },
  homepage: {
    hero: {
      eyebrow: 'The new everyday edit',
      title: 'Every day deserves a little',
      highlight: 'lustre.',
      subtitle:
        'Modern imitation jewelry designed to bring polished style, thoughtful detail, and accessible sparkle to every moment.',
      primaryCtaLabel: 'Shop new arrivals',
      primaryCtaLink: '/new-arrivals',
      secondaryCtaLabel: 'Explore bridal',
      secondaryCtaLink: '/collections/bridal',
      cardEyebrow: 'New season',
      cardTitle: 'Made to shine',
      cardText: 'Minimal pieces. Maximum mood.',
    },
    categoriesSection: {
      eyebrow: 'Find your style',
      title: 'Made for every mood',
      description: 'From quiet daily sparkle to statement pieces for your most memorable occasions.',
    },
    newArrivalsSection: {
      eyebrow: 'Just in',
      title: 'New arrivals',
      description: 'Fresh pieces selected to make your everyday styling feel new again.',
    },
    bestSellersSection: {
      eyebrow: 'Most loved',
      title: 'Best sellers',
      description: 'The pieces customers keep coming back to.',
    },
    editorial: {
      enabled: true,
      eyebrow: 'The bridal edit',
      title: 'For the moments you will remember forever.',
      text: 'Discover statement jewelry designed for celebrations, ceremonies, and every beautiful detail in between.',
      ctaLabel: 'Explore bridal',
      ctaLink: '/collections/bridal',
      image:
        'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1300&q=85',
    },
    promo: {
      enabled: true,
      eyebrow: 'Limited Time Offer',
      heading: 'More Shine,',
      highlight: 'More Savings',
      text: 'Use code LUSTRE20 at checkout for 20% off orders above ₹1,999.',
      ctaLabel: 'Shop the Offer',
      ctaLink: '/shop',
      image:
        'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=85',
      tagTitle: 'LUSTRE20',
      tagText: '20% off orders above ₹1,999',
    },
    testimonial: {
      enabled: true,
      eyebrow: 'Kind words',
      quote: 'The little details are what make every piece feel so special.',
      author: 'Meera, verified customer',
    },
  },
  newsletter: {
    enabled: true,
    kicker: 'THE LUSTRE CLUB',
    heading: 'Get 10% Off Your First Order',
    description:
      'Subscribe to receive early access to new jewelry drops, seasonal styling edits, and private member events.',
    couponCode: 'SHINE10',
  },
  seo: {
    metaTitle: 'Lustre & Co. — Modern Imitation Jewelry',
    metaDescription:
      'Shop gold-plated necklaces, earrings, rings, bracelets, and bridal jewelry from Lustre & Co.',
  },
};

export type StoreSettings = typeof DEFAULT_SETTINGS;
export const SETTINGS_SECTIONS = Object.keys(DEFAULT_SETTINGS) as Array<keyof StoreSettings>;
