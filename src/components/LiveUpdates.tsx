"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Instant refresh on every open device (docs/DESIGN.md "Live updates"): when a recipe, the grocery
// list or the week's meals change anywhere, the page on show reloads its data. Changes come from
// Supabase Realtime (migration 003); the page also refreshes when it comes back to the front or the
// connection comes back. A refresh keeps what's typed on the page and where it's scrolled to.
const TABLES = ["recipes", "grocery_items", "meal_plan"];

export default function LiveUpdates() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // A save can change several rows at once; refresh once for all of them.
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => navigator.onLine && router.refresh(), 400);
    };
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);

    let stop = () => {};
    let gone = false;
    import("@/lib/supabase").then(({ supabase }) => {
      if (gone) return;
      const channel = supabase.channel("recipe-book");
      for (const table of TABLES) channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
      channel.subscribe();
      stop = () => void supabase.removeChannel(channel);
    });

    return () => {
      gone = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
      stop();
    };
  }, [router]);

  return null;
}
