import type { Metadata } from "next";
import PhotoImport from "@/components/PhotoImport";

export const metadata: Metadata = { title: "Add from photos" };

export default function AddFromPhotos() {
  return <PhotoImport />;
}
