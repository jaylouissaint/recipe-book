"use client";

import { useState } from "react";
import { ShareIcon } from "./Icons";

// The share sheet where the browser has one (iPad, iPhone); otherwise copies the link.
export default function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // dismissed
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" onClick={share} aria-label="Share" className="relative rounded-full p-2 text-fg hover:bg-field">
      <ShareIcon />
      {copied && (
        <span role="status" className="absolute top-full right-0 mt-1 rounded-lg bg-fg px-2 py-1 text-xs whitespace-nowrap text-white">
          Link copied
        </span>
      )}
    </button>
  );
}
