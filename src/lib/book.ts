// The fixed parts of a recipe page: tag checkboxes and the colored side tabs.

// The tag checkboxes (trimmed 2026-10-29). Recipes may still carry ids of removed tags; they're
// kept in the database but not shown.
export const TAGS = [
  { id: "quick-easy", label: "Quick & Easy" },
  { id: "slow-cooker", label: "Slow Cooker" },
  { id: "one-pot", label: "One Pot/Pan" },
  { id: "air-fryer", label: "Air Fryer" },
  { id: "veg", label: "Veg" },
] as const;

// Favorites: the star on the recipe view (stored as a tag, so no database change).
export const FAVORITE = "family-favorite";

export function isFavorite(recipe: { tags: string[] }) {
  return recipe.tags.includes(FAVORITE);
}

// Every checkbox printed on the paper book's pages, so pasted Live Text of a page can skip them.
export const BOOK_TAG_LABELS = [
  "Quick & Easy", "Slow Cooker", "One Pot/Pan", "Kid Chef Friendly", "Everyday", "Make Ahead", "Pressure Cooker",
  "Air Fryer", "Family Favorite", "Special Occasion", "Veg", "Vegan", "Gluten Free", "Dairy Free", "Nut Free", "Kosher",
];

// Full class names live here so Tailwind can see them.
export const CATEGORIES = [
  { slug: "mains", name: "Mains", tabClass: "bg-tab-mustard" },
  { slug: "sides", name: "Sides", tabClass: "bg-tab-orange" },
  { slug: "desserts", name: "Desserts", tabClass: "bg-tab-pink" },
  { slug: "more", name: "More Recipes", tabClass: "bg-tab-blue" },
] as const;

export function categoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}
