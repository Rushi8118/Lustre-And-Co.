/** The three finishes. `color` and `roughness` drive the metal; `tint` colours the page background. */
export const FINISHES = {
  warm: {
    id: "warm",
    name: "Warm Gold",
    color: "#d9b26a",
    roughness: 0.2,
    tint: "#f6efdf",
    note: "Champagne warmth with a soft, honeyed glow that suits daylight.",
  },
  moon: {
    id: "moon",
    name: "Moon Silver",
    color: "#d8dde4",
    roughness: 0.14,
    tint: "#eef1f5",
    note: "Cool and mirror-bright. It holds the light like polished water.",
  },
  rose: {
    id: "rose",
    name: "Rose Gold",
    color: "#e0a396",
    roughness: 0.22,
    tint: "#f8ebe6",
    note: "A muted rose flush that warms against skin and charcoal alike.",
  },
};

export const FINISH_LIST = Object.values(FINISHES);
export const DEFAULT_FINISH = "warm";
