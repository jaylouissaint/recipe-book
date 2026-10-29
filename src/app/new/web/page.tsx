import type { Metadata } from "next";
import WebImport from "@/components/WebImport";

export const metadata: Metadata = { title: "Save from the web" };

// /new/web?url=… starts reading that link straight away (handy from a bookmark or a shortcut).
export default async function SaveFromWeb({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const { url } = await searchParams;
  return <WebImport initialUrl={typeof url === "string" ? url : ""} />;
}
