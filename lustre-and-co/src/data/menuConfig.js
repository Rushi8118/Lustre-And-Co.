/** Links shown in each category's mega-menu panel. Only routes that exist in the app. */
export function categoryMenuLinks(category) {
  return [
    { label: `All ${category.name}`, to: `/category/${category.slug}` },
    { label: "New arrivals", to: "/new-arrivals" },
    { label: "Best sellers", to: "/best-sellers" },
    { label: "Bridal edit", to: "/collections/bridal" },
  ];
}

/** Plain links after the category items in the main bar. */
export const UTILITY_NAV = [
  { label: "Bundles", to: "/bundles" },
  { label: "Sale", to: "/collections/sale" },
  { label: "About", to: "/about" },
];
