"use client";

import { useEffect } from "react";
import { setLastOpened } from "@/lib/remember";

// Notes the recipe on screen as the last one opened, for Home's "Last opened".
export default function RememberRecipe({ slug, title }: { slug: string; title: string }) {
  useEffect(() => setLastOpened({ slug, title, at: Date.now() }), [slug, title]);
  return null;
}
