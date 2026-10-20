import { isFreeComponent } from "@/lib/utils";

// The download-button flow: sign-in and withdrawal-waiver consent are pure
// pre-checks, run before either network effect — the same shape as
// validatePublishForm running before runPublishFlow's I/O
// (lib/commerce/component-form-flow.ts). getDownloadState is exported separately so
// the component derives the same isFree/canDownload/needsConsent/label used
// to decide what to render from the one place that computes them, instead of
// recomputing the branch a second time.
//
// Copy is the caller's: `label` is a message key, and the pre-check errors
// arrive in `messages` already translated, so this file holds no UI text.

export type DownloadState = {
  isFree: boolean;
  canDownload: boolean;
  needsConsent: boolean;
  label: "download" | "buyToDownload";
};

export function getDownloadState(priceCents: number, owned: boolean): DownloadState {
  const isFree = isFreeComponent(priceCents);
  const canDownload = isFree || owned;
  return {
    isFree,
    canDownload,
    needsConsent: !canDownload,
    label: canDownload ? "download" : "buyToDownload",
  };
}

type EffectResult = { ok: true; url: string } | { ok: false; error: string };

export type DownloadFlowDeps = {
  requestDownload: () => Promise<EffectResult>;
  requestCheckout: (withdrawalWaived: boolean) => Promise<EffectResult>;
};

export type DownloadFlowResult =
  | { status: "error"; error: string }
  | { status: "redirect"; url: string };

export async function runDownloadFlow(
  deps: DownloadFlowDeps,
  args: {
    signedIn: boolean;
    priceCents: number;
    owned: boolean;
    withdrawalWaived: boolean;
    messages: { signInRequired: string; consentRequired: string };
  }
): Promise<DownloadFlowResult> {
  if (!args.signedIn) return { status: "error", error: args.messages.signInRequired };

  const { canDownload, needsConsent } = getDownloadState(args.priceCents, args.owned);
  if (needsConsent && !args.withdrawalWaived) {
    return { status: "error", error: args.messages.consentRequired };
  }

  const result = canDownload
    ? await deps.requestDownload()
    : await deps.requestCheckout(args.withdrawalWaived);

  if (!result.ok) return { status: "error", error: result.error };
  return { status: "redirect", url: result.url };
}
