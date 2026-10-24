// The fixed parts of a recipe page: tag checkboxes and the colored side tabs.

export const TAGS = [
  { id: "quick-easy", label: "Quick & Easy" },
  { id: "slow-cooker", label: "Slow Cooker" },
  { id: "one-pot", label: "One Pot/Pan" },
  { id: "kid-chef", label: "Kid Chef Friendly" },
  { id: "everyday", label: "Everyday" },
  { id: "make-ahead", label: "Make Ahead" },
  { id: "pressure-cooker", label: "Pressure Cooker" },
  { id: "air-fryer", label: "Air Fryer" },
  { id: "family-favorite", label: "Family Favorite" },
  { id: "special-occasion", label: "Special Occasion" },
  { id: "veg", label: "Veg" },
  { id: "vegan", label: "Vegan" },
  { id: "gluten-free", label: "Gluten Free" },
  { id: "dairy-free", label: "Dairy Free" },
  { id: "nut-free", label: "Nut Free" },
  { id: "kosher", label: "Kosher" },
] as const;

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
