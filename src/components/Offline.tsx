"use client";

import { useEffect, useSyncExternalStore } from "react";

// Offline support: registers the service worker (public/sw.js) that keeps opened pages for when
// there's no signal, and shows a note while offline. Production only: in development the saved
// copies would get in the way of seeing changes.
export default function Offline() {
  const online = useOnline();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not available (private browsing, or blocked): the site works as before, online only.
    });
  }, []);

  if (online) return null;
  return (
    <p
      role="status"
      className="no-print fixed inset-x-0 top-0 z-[60] bg-ink px-4 pt-[max(0.4rem,env(safe-area-inset-top))] pb-1.5 text-center text-[13px] text-white"
    >
      You’re offline. Pages you’ve opened before still work, and grocery check-offs save when you’re back online.
    </p>
  );
}

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
