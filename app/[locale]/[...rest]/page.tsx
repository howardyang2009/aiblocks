import { notFound } from "next/navigation";

// Unknown paths under a Locale prefix 404 inside the Locale layout, so the
// not-found page keeps its <html lang>, navbar and footer.
export default function CatchAllPage() {
  notFound();
}
