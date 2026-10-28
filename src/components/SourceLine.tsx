import { sourceLabel } from "@/lib/format";
import type { Recipe } from "@/lib/types";
import { BookIcon, CameraIcon, PencilIcon } from "./Icons";

const ICONS = { hand: PencilIcon, photo: CameraIcon, typed: BookIcon };

export default function SourceLine({ recipe, className = "" }: { recipe: Recipe; className?: string }) {
  const { kind, text } = sourceLabel(recipe);
  const Icon = ICONS[kind];
  return (
    <p className={`flex items-center gap-1.5 text-[13px] text-muted ${className}`}>
      <Icon className="size-4" />
      {text}
    </p>
  );
}
