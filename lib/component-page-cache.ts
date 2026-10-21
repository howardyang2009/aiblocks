import "server-only";
import { revalidatePath } from "next/cache";

// The Component detail page is cached (ISR) and holds nothing per-Viewer;
// see app/[locale]/(public)/components/[id]/page.tsx. Every route that
// changes what it shows (the Component, its Translations, Stars, Reviews,
// Replies, Comments, download count) calls this after a successful write,
// so the next visitor gets a fresh render instead of waiting out the
// revalidate window. It drops every Component page, not just one: Comment
// and Reply routes are keyed by their own id, not the Component's, and the
// pages are cheap to rebuild on the next request.
export function revalidateComponentPages(): void {
  revalidatePath("/[locale]/(public)/components/[id]", "page");
}
