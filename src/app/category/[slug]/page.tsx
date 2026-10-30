import { redirect } from "next/navigation";

// Category pages became the Library's category filters (2026-10-29); old links still work.
type Props = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Props) {
  redirect(`/library?category=${encodeURIComponent((await params).slug)}`);
}
