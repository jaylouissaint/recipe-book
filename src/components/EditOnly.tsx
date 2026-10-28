"use client";

import { useSyncExternalStore } from "react";

// "rb_unlocked" is set next to the httpOnly write-key cookie by Unlock editing (src/app/actions.ts).
function readUnlocked() {
  return document.cookie.split("; ").some((c) => c === "rb_unlocked=1");
}

// Cookies have no change event; pages re-check whenever they're shown again.
function subscribe(onChange: () => void) {
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

export function useUnlocked() {
  return useSyncExternalStore(subscribe, readUnlocked, () => false);
}

// Shows its children only in a browser that has been unlocked for editing.
export default function EditOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return useUnlocked() ? children : fallback;
}
