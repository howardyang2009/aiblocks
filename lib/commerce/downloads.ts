import type { Result } from "@/lib/result";
import type { ApiError } from "@/lib/api-errors";
import { isFreeComponent } from "@/lib/utils";

// THE PAYWALL. Releases a short-lived signed URL for a Component's zip ONLY
// after confirming the Profile holds an Entitlement to it:
//   Free Component -> any signed-in Profile; the download grants the
//                     Entitlement (a library entry) on the way out.
//   Paid Component -> requires an existing Entitlement (granted by the
//                     Stripe webhook once the Purchase succeeds).
// Never returns zip_path itself; the bucket stays private.
//
// Every dependency is a plain function so the whole rule is testable with
// fakes; the route wires in the Supabase-backed ones.

export type DownloadDeps = {
  findComponent: (id: string) => Promise<{ id: string; price_cents: number; zip_path: string | null } | null>;
  hasEntitlement: (profileId: string, componentId: string) => Promise<boolean>;
  grantEntitlement: (profileId: string, componentId: string) => Promise<{ error: string | null }>;
  signZipUrl: (zipPath: string) => Promise<string | null>;
};

export async function authorizeDownload(
  deps: DownloadDeps,
  args: { profileId: string; componentId: string }
): Promise<Result<{ url: string }>> {
  const component = await deps.findComponent(args.componentId);
  if (!component || !component.zip_path) {
    return { ok: false, status: 404, error: "componentUnavailable" satisfies ApiError };
  }

  if (isFreeComponent(component.price_cents)) {
    // Idempotent; the downloads trigger bumps download_count on first insert.
    const { error } = await deps.grantEntitlement(args.profileId, component.id);
    if (error) return { ok: false, status: 500, error: "downloadFailed" satisfies ApiError };
  } else if (!(await deps.hasEntitlement(args.profileId, component.id))) {
    return { ok: false, status: 402, error: "purchaseRequired" satisfies ApiError };
  }

  const url = await deps.signZipUrl(component.zip_path);
  if (!url) return { ok: false, status: 500, error: "downloadFailed" satisfies ApiError };
  return { ok: true, url };
}
