import Link from "next/link";
import { TAGS, categoryBySlug } from "@/lib/book";
import { siteName } from "@/lib/format";
import { publicFileUrl } from "@/lib/storage";
import type { Recipe } from "@/lib/types";
import CoverPhoto from "./CoverPhoto";
import EditOnly from "./EditOnly";
import { BackIcon, MenuIcon } from "./Icons";
import KitchenButtons, { MarkCooked } from "./kitchen/KitchenButtons";
import { ScaledIngredients, ScaleProvider, ServingsStat } from "./kitchen/Scale";
import RememberRecipe from "./RememberRecipe";
import ShareButton from "./ShareButton";
import SourceLine from "./SourceLine";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-2xl bg-surface px-3 py-2.5 text-center shadow-card">
      <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className="font-hand text-xl text-ink">{value}</p>
    </div>
  );
}

// The reading view: the Deglaze recipe layout, with the recipe itself in handwriting on cream.
export default function RecipeView({ recipe }: { recipe: Recipe }) {
  const category = categoryBySlug(recipe.category);
  const handwrittenOnly =
    Boolean(recipe.handwritingPath?.endsWith(".png")) && !recipe.ingredientGroups.length && !recipe.stepGroups.length;
  const tagLabels = TAGS.filter((t) => recipe.tags.includes(t.id)).map((t) => t.label);
  const stats = [
    recipe.prepMin != null && { label: "Prep", value: `${recipe.prepMin} min` },
    recipe.cookMin != null && { label: "Cook", value: `${recipe.cookMin} min` },
  ].filter((s): s is { label: string; value: string } => Boolean(s));

  return (
    <ScaleProvider base={recipe.servings}>
    <article className="mx-auto max-w-5xl px-4 pb-32 md:px-8">
      <header className="no-print sticky top-0 z-10 -mx-4 flex items-center justify-between bg-page px-2 py-2 md:-mx-8 md:px-6 md:py-3.5 navside:md:py-2">
        <Link href="/library" aria-label="Back to library" className="rounded-full p-2 hover:bg-field">
          <BackIcon />
        </Link>
        <div className="flex items-center">
          <ShareButton title={recipe.title} />
          <details className="relative">
            <summary aria-label="Recipe menu" className="list-none rounded-full p-2 hover:bg-field [&::-webkit-details-marker]:hidden">
              <MenuIcon />
            </summary>
            <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-2xl bg-surface py-1 shadow-card">
              <Link href={`/book#${recipe.slug}`} className="block px-4 py-3 text-[15px] hover:bg-field">
                Open in the book
              </Link>
              {recipe.handwritingPath?.endsWith(".png") && (
                <a
                  href={publicFileUrl("handwriting", recipe.handwritingPath)}
                  target="_blank"
                  rel="noreferrer"
                  className="block px-4 py-3 text-[15px] hover:bg-field"
                >
                  View handwritten page
                </a>
              )}
              {recipe.originalFilePath && (
                <a
                  href={publicFileUrl("originals", recipe.originalFilePath)}
                  target="_blank"
                  rel="noreferrer"
                  className="block px-4 py-3 text-[15px] hover:bg-field"
                >
                  View the original
                </a>
              )}
              <EditOnly>
                <Link href={`/recipe/${recipe.slug}/edit`} className="block px-4 py-3 text-[15px] hover:bg-field">
                  Edit recipe
                </Link>
                <MarkCooked id={recipe.id} />
              </EditOnly>
            </div>
          </details>
        </div>
      </header>

      <CoverPhoto recipe={recipe} handwriting={!handwrittenOnly} className="mt-2 aspect-[16/9] max-h-72 w-full md:aspect-auto md:h-64" />

      <h1 className="mt-6 font-hand text-4xl leading-tight text-ink md:text-5xl">
        {recipe.title}
      </h1>

      {recipe.imported && (
        <p className="mt-3 inline-block rounded-2xl bg-field px-4 py-2 text-[14px] text-fg">
          Check this import against the original before cooking.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {recipe.author && <span className="text-[15px] text-muted">by {recipe.author}</span>}
        {recipe.sourceUrl ? (
          <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="text-[15px] text-muted underline underline-offset-4">
            from {recipe.sourceName || siteName(recipe.sourceUrl) || "the original"}
          </a>
        ) : (
          <SourceLine recipe={recipe} className="!text-[15px]" />
        )}
        {category && (
          <Link href={`/library?category=${category.slug}`} className="text-[15px] text-muted underline underline-offset-4">
            in {category.name}
          </Link>
        )}
        {recipe.timesCooked > 0 && (
          <span className="text-[15px] text-muted">
            cooked {recipe.timesCooked} {recipe.timesCooked === 1 ? "time" : "times"}
          </span>
        )}
      </div>

      {recipe.description && <p className="mt-4 max-w-2xl font-hand text-xl leading-8 text-ink">{recipe.description}</p>}

      <div className="mt-5 flex max-w-md gap-3">
        <ServingsStat />
        {stats.map((s) => (
          <Stat key={s.label} {...s} />
        ))}
      </div>

      {tagLabels.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Tags">
          {tagLabels.map((t) => (
            <li key={t} className="rounded-full bg-field px-3 py-1 text-[13px] text-fg">
              {t}
            </li>
          ))}
        </ul>
      )}

      {handwrittenOnly ? (
        // Written on the page with the Pencil: the page itself is the recipe.
        <section aria-label="Handwritten page" className="mt-8 border-t border-divider pt-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- a Supabase public URL, shown as is */}
          <img
            src={publicFileUrl("handwriting", recipe.handwritingPath!)}
            alt={`${recipe.title}, written by hand`}
            className="w-full max-w-3xl rounded-sm shadow-[0_2px_12px_rgba(0,0,0,0.12)]"
          />
        </section>
      ) : (
        <div className="mt-8 grid gap-x-12 gap-y-8 border-t border-divider pt-6 lg:grid-cols-[2fr_3fr]">
          <section aria-labelledby="ingredients">
            <h2 id="ingredients" className="text-2xl font-medium">
              Ingredients
            </h2>
            <ScaledIngredients groups={recipe.ingredientGroups} />
          </section>

          <section aria-labelledby="directions">
            <h2 id="directions" className="text-2xl font-medium">
              Directions
            </h2>
            <ol className="mt-4 space-y-5">
              {recipe.stepGroups.map((g, i) => (
                <li key={i} className="flex gap-4">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-hand text-xl leading-8 text-ink">{g.title}</p>
                    {g.steps.length > 0 && (
                      <ul className="mt-1 space-y-1">
                        {g.steps.map((s, j) => (
                          <li key={j} className="-indent-4 pl-4 font-hand text-lg leading-7 text-ink/90">
                            <span aria-hidden>– </span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}

      {recipe.notes && (
        <section aria-labelledby="notes" className="mt-8 border-t border-divider pt-6">
          <h2 id="notes" className="text-2xl font-medium">
            Notes
          </h2>
          <p className="mt-3 font-hand text-xl leading-8 text-ink">{recipe.notes}</p>
        </section>
      )}

      {handwrittenOnly ? <TypeTheLines slug={recipe.slug} /> : <KitchenButtons recipe={recipe} />}
      <RememberRecipe slug={recipe.slug} title={recipe.title} />
    </article>
    </ScaleProvider>
  );
}

// In place of Add to Groceries and Start Cooking on a recipe written only on the Pencil page:
// those need typed lines, so offer to type them (beside the handwritten page).
function TypeTheLines({ slug }: { slug: string }) {
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-surface/95 px-4 navside:md:left-60 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
      <div className="mx-auto flex max-w-xl flex-wrap items-center gap-x-4 gap-y-2">
        <p className="min-w-0 flex-1 text-[14px] text-muted">Type the lines to scale it, add it to Groceries and use Start Cooking.</p>
        <EditOnly>
          <Link
            href={`/recipe/${slug}/edit?lines=1`}
            className="flex h-[48px] items-center justify-center rounded-full bg-accent px-6 text-[16px] font-semibold text-white"
          >
            Type the lines
          </Link>
        </EditOnly>
      </div>
    </div>
  );
}
