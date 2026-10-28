// Public URL of a file in one of the public storage buckets (photos, originals, handwriting).
export function publicFileUrl(bucket: "photos" | "originals" | "handwriting", path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
