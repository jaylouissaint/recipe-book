import assert from "node:assert/strict";
import { test } from "node:test";
import { isoMinutes, recipeFromHtml } from "./schemaRecipe.ts";

const page = (ld: unknown, head = "") =>
  `<html><head><title>Page title</title>${head}<script type="application/ld+json">${JSON.stringify(ld)}</script></head><body></body></html>`;

test("a WordPress-style @graph with sections, entities and times", () => {
  const html = page(
    {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebSite", name: "Example Kitchen" },
        {
          "@type": ["Recipe"],
          name: "Mom&#39;s Chicken &amp; Rice",
          description: "<p>Cozy and quick.</p>",
          author: { "@type": "Person", name: "Jane Cook" },
          image: [{ "@type": "ImageObject", url: "/img/chicken.jpg" }],
          recipeYield: ["4", "4 servings"],
          prepTime: "PT15M",
          totalTime: "PT1H",
          recipeCategory: ["Dinner"],
          keywords: "one pot, gluten free",
          recipeIngredient: ["2 lbs chicken thighs", "1 &frac12; cups rice", "▢ salt"],
          recipeInstructions: [
            {
              "@type": "HowToSection",
              name: "Cook the chicken",
              itemListElement: [
                { "@type": "HowToStep", text: "Brown the chicken." },
                { "@type": "HowToStep", text: "Add the rice and water." },
              ],
            },
            { "@type": "HowToStep", name: "Let it sit", text: "Rest 5 minutes before serving." },
            // Many sites repeat the start of the text as the name: kept once
            { "@type": "HowToStep", name: "Serve with lime", text: "Serve with lime wedges." },
          ],
        },
      ],
    },
    `<meta property="og:site_name" content="Example Kitchen">`,
  );
  const r = recipeFromHtml(html, "https://www.example.com/recipes/chicken");
  assert.equal(r.found, true);
  assert.equal(r.title, "Mom's Chicken & Rice");
  assert.equal(r.description, "Cozy and quick.");
  assert.equal(r.author, "Jane Cook");
  assert.equal(r.sourceName, "Example Kitchen");
  assert.equal(r.imageUrl, "https://www.example.com/img/chicken.jpg");
  assert.equal(r.servings, 4);
  assert.equal(r.prepMin, 15);
  assert.equal(r.cookMin, 45); // total minus prep
  assert.equal(r.category, "mains");
  assert.deepEqual(r.tags, ["one-pot", "gluten-free"]);
  assert.deepEqual(r.ingredientGroups, [
    {
      name: "",
      items: [
        { quantity: "2", unit: "lbs", item: "chicken thighs" },
        { quantity: "1 ½", unit: "cups", item: "rice" },
        { quantity: "", unit: "", item: "salt" },
      ],
    },
  ]);
  assert.deepEqual(r.stepGroups, [
    { title: "Cook the chicken", steps: ["Brown the chicken.", "Add the rice and water."] },
    { title: "Let it sit", steps: ["Rest 5 minutes before serving."] },
    { title: "Serve with lime wedges.", steps: [] },
  ]);
});

test("instructions as one HTML string, a dessert, author list", () => {
  const r = recipeFromHtml(
    page([
      { "@type": "Organization", name: "Other" },
      {
        "@type": "http://schema.org/Recipe",
        name: "Brownies",
        author: [{ name: "A" }, "B"],
        recipeCategory: "Dessert",
        image: "https://cdn.example.com/b.jpg",
        cookTime: "PT25M",
        recipeIngredient: ["1 c sugar"],
        recipeInstructions: "<ol><li>1. Mix.</li><li>2. Bake.</li></ol>",
      },
    ]),
    "https://bakes.example.org/brownies",
  );
  assert.equal(r.author, "A & B");
  assert.equal(r.category, "desserts");
  assert.equal(r.sourceName, "bakes.example.org");
  assert.equal(r.cookMin, 25);
  assert.deepEqual(r.stepGroups, [
    { title: "Mix.", steps: [] },
    { title: "Bake.", steps: [] },
  ]);
});

test("a page without recipe data falls back to its meta tags", () => {
  const html = `<html><head><title>Blog post</title>
    <meta property="og:title" content="Grandma&#39;s Stew">
    <meta property="og:image" content="https://example.com/stew.jpg">
    <script type="application/ld+json">{ not json</script></head></html>`;
  const r = recipeFromHtml(html, "https://www.example.com/stew");
  assert.equal(r.found, false);
  assert.equal(r.title, "Grandma's Stew");
  assert.equal(r.imageUrl, "https://example.com/stew.jpg");
  assert.equal(r.sourceName, "example.com");
  assert.deepEqual(r.ingredientGroups, []);
});

test("ISO durations", () => {
  assert.equal(isoMinutes("PT1H30M"), 90);
  assert.equal(isoMinutes("PT45M"), 45);
  assert.equal(isoMinutes("P0DT2H"), 120);
  assert.equal(isoMinutes("PT0S"), null);
  assert.equal(isoMinutes("20 minutes"), null);
});
