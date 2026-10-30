"use client";

import Link from "next/link";
import { useRef } from "react";
import EditOnly from "./EditOnly";
import { CameraIcon, LinkIcon, PlusIcon } from "./Icons";
import { useBook } from "./BookContext";

// The floating green + and its Add sheet (docs/DESIGN.md). Only on unlocked devices.
export default function AddButton() {
  const { path } = useBook();
  const dialog = useRef<HTMLDialogElement>(null);
  const row = "flex items-center gap-4 px-6 py-5 text-[17px] hover:bg-field";
  const close = () => dialog.current?.close();

  return (
    <EditOnly>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label="Add a recipe"
        className="no-print fixed right-5 bottom-24 z-20 flex size-16 items-center justify-center rounded-full bg-accent text-white shadow-[0_6px_20px_rgb(0_0_0/0.25)] lg:right-10 lg:bottom-10"
      >
        <PlusIcon className="size-8" />
      </button>
      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
        aria-label="Add a recipe"
        className="mx-auto mt-auto mb-0 w-full max-w-lg rounded-t-[28px] bg-surface p-0 text-fg backdrop:bg-black/30 md:mb-auto md:rounded-[28px]"
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-divider" />
        <ul className="divide-y divide-divider pb-[env(safe-area-inset-bottom)]">
          <li>
            <Link href={path("/new/web")} onClick={close} className={row}>
              <LinkIcon />
              Save a recipe from the web
            </Link>
          </li>
          <li>
            <Link href={path("/new/photo")} onClick={close} className={row}>
              <CameraIcon />
              Add from recipe photos
            </Link>
          </li>
          <li>
            <Link href={path("/new")} onClick={close} className={row}>
              <PlusIcon className="size-6 rounded-full border border-current p-0.5" />
              Enter your own recipe
            </Link>
          </li>
        </ul>
      </dialog>
    </EditOnly>
  );
}
