"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { lockEditing, unlockEditing } from "@/app/actions";
import { useUnlocked } from "./EditOnly";

export default function UnlockForm() {
  const unlocked = useUnlocked();
  const router = useRouter();
  const [state, unlock, unlocking] = useActionState(unlockEditing, null);
  const [locking, startLock] = useTransition();

  if (unlocked) {
    return (
      <div>
        <p className="text-[15px]">
          <span className="font-semibold text-accent">Editing is unlocked</span> on this device. You can add and edit
          recipes.
        </p>
        <button
          type="button"
          disabled={locking}
          onClick={() =>
            startLock(async () => {
              await lockEditing();
              router.refresh();
            })
          }
          className="mt-4 h-11 rounded-full border border-fg/30 px-5 text-[15px] font-semibold text-fg disabled:opacity-50"
        >
          {locking ? "Locking…" : "Lock editing on this device"}
        </button>
      </div>
    );
  }

  return (
    <form action={unlock}>
      <p className="text-[15px] text-muted">
        Paste your write key to add and edit recipes from this browser. It stays on this device for a year, and nobody
        else sees an Edit button.
      </p>
      <label className="mt-4 block">
        <span className="sr-only">Write key</span>
        <input
          name="key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="Write key"
          className="h-12 w-full rounded-full bg-field px-5 text-[16px] outline-none focus:ring-2 focus:ring-accent/30"
        />
      </label>
      {state && !state.ok && (
        <p role="alert" className="mt-2 text-[14px] text-cover">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={unlocking}
        className="mt-4 h-11 rounded-full bg-accent px-6 text-[15px] font-semibold text-white disabled:opacity-50"
      >
        {unlocking ? "Checking…" : "Unlock editing"}
      </button>
    </form>
  );
}
