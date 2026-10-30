"use client";

import { useEffect } from "react";
import { setLastOpened } from "@/lib/remember";
import { useBook } from "./BookContext";

// Notes the recipe on screen as the last one opened, for Home's "Last opened".
export default function RememberRecipe({ slug, title }: { slug: string; title: string }) {
  const { id: book } = useBook();
  useEffect(() => setLastOpened(book, { slug, title, at: Date.now() }), [book, slug, title]);
  return null;
}
