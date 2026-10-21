"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { StarButton } from "@/components/star-button";
import { DownloadButton } from "@/components/download-button";
import { ReviewsSection } from "@/components/reviews-section";
import { CommentsSection } from "@/components/comments-section";
import {
  markMyComments,
  markMyReview,
  SIGNED_OUT,
  type ComponentViewerState,
} from "@/lib/engagement/component-viewer";
import type { Review, RatingTotals } from "@/lib/engagement/review-list";
import type { CommentNode } from "@/lib/engagement/comment-thread";

// The cached Component page renders as if signed out. This provider fetches
// who is looking (GET /api/components/[id]/viewer) once, and the parts below
// re-render with it. Each part is keyed by whether that answer has arrived,
// so it remounts once with the Viewer's state instead of keeping state it
// initialised from the signed-out render. Until then it shows the
// signed-out view; a failed fetch leaves it there.
type Loaded = { state: ComponentViewerState; loaded: boolean };

const ViewerContext = createContext<Loaded>({ state: SIGNED_OUT, loaded: false });

export function ComponentViewerProvider({ componentId, children }: { componentId: string; children: ReactNode }) {
  const [value, setValue] = useState<Loaded>({ state: SIGNED_OUT, loaded: false });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/components/${componentId}/viewer`)
      .then((res) => (res.ok ? (res.json() as Promise<ComponentViewerState>) : null))
      .then((state) => {
        if (!cancelled && state) setValue({ state, loaded: true });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [componentId]);

  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

function useComponentViewer() {
  const { state, loaded } = useContext(ViewerContext);
  return { state, key: loaded ? "viewer" : "anonymous" };
}

export function ViewerStarButton({ componentId, count }: { componentId: string; count: number }) {
  const { state, key } = useComponentViewer();
  return <StarButton key={key} componentId={componentId} initialCount={count} initialStarred={state.starred} />;
}

export function ViewerDownload({ componentId, priceCents }: { componentId: string; priceCents: number }) {
  const t = useTranslations("ComponentPage");
  const { state, key } = useComponentViewer();
  return (
    <>
      {state.owned && priceCents > 0 && <p className="font-mono text-[11px] text-free mt-1">{t("purchased")}</p>}
      <div className="mt-4">
        <DownloadButton
          key={key}
          componentId={componentId}
          priceCents={priceCents}
          owned={state.owned}
          signedIn={state.signedIn}
        />
      </div>
    </>
  );
}

export function ViewerEditLink({ componentId }: { componentId: string }) {
  const t = useTranslations("ComponentPage");
  const { state } = useComponentViewer();
  if (!state.isSeller) return null;
  return (
    <div className="mt-4">
      <Link
        href={`/dashboard/seller/${componentId}/edit`}
        className="inline-flex items-center gap-1.5 rounded-block border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent transition-colors"
      >
        <span aria-hidden>✎</span> {t("edit")}
      </Link>
    </div>
  );
}

export function ViewerReviews({
  componentId,
  reviews,
  unloadedRatings,
  sellerUsername,
}: {
  componentId: string;
  reviews: Review[];
  unloadedRatings: RatingTotals;
  sellerUsername: string | null;
}) {
  const { state, key } = useComponentViewer();
  return (
    <ReviewsSection
      key={key}
      componentId={componentId}
      initialReviews={markMyReview(reviews, state)}
      unloadedRatings={unloadedRatings}
      canReview={state.owned && !state.isSeller}
      signedIn={state.signedIn}
      isSeller={state.isSeller}
      sellerUsername={sellerUsername}
    />
  );
}

export function ViewerComments({ componentId, comments }: { componentId: string; comments: CommentNode[] }) {
  const { state, key } = useComponentViewer();
  return (
    <CommentsSection
      key={key}
      componentId={componentId}
      initialComments={markMyComments(comments, state)}
      signedIn={state.signedIn}
      viewer={state.viewer}
      isSeller={state.isSeller}
    />
  );
}
