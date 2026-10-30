"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { lockEditing, unlockEditing } from "@/app/actions";
import { BOOKS, type BookId } from "@/lib/books";
import { useUnlocked } from "./EditOnly";

// Unlock editing for one book. Each book has its own write key, which only changes that book.
export default function UnlockForm({ book }: { book: BookId }) {
  const unlocked = useUnlocked(book);
  const router = useRouter();
  const [state, unlock, unlocking] = useActionState(unlockEditing, null);
  const [locking, startLock] = useTransition();
  const { name } = BOOKS[book];

  if (unlocked) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px]">
          <span className="font-semibold">{name}</span>: <span className="font-semibold text-accent">unlocked</span> on
          this device
        </p>
        <button
          type="button"
          disabled={locking}
          onClick={() =>
            startLock(async () => {
              await lockEditing(book);
              router.refresh();
            })
          }
          className="h-10 rounded-full border border-fg/30 px-4 text-[14px] font-semibold text-fg disabled:opacity-50"
        >
          {locking ? "Locking…" : "Lock"}
        </button>
      </div>
    );
  }

  return (
    <form action={unlock}>
      <input type="hidden" name="book" value={book} />
      <p className="text-[15px]">
        <span className="font-semibold">{name}</span>: <span className="text-muted">locked</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Write key for {name}</span>
          <input
            name="key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={`Write key for ${name}`}
            className="h-11 w-full rounded-full bg-field px-5 text-[16px] outline-none focus:ring-2 focus:ring-accent/30"
          />
        </label>
        <button
          type="submit"
          disabled={unlocking}
          className="h-11 rounded-full bg-accent px-5 text-[15px] font-semibold text-white disabled:opacity-50"
        >
          {unlocking ? "Checking…" : "Unlock"}
        </button>
      </div>
      {state && !state.ok && (
        <p role="alert" className="mt-2 text-[14px] text-cover">
          {state.error}
        </p>
      )}
    </form>
  );
}
