"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Spinner } from "@/components/ui/spinner";
import { MAX_BODY_LENGTH } from "@/lib/constants";
import type { Review } from "@/lib/engagement/reviews-section-state";
import {
  runSubmitReviewFlow,
  runRemoveReviewFlow,
  runSaveReplyFlow,
  runRemoveReplyFlow,
} from "@/lib/engagement/reviews-flow";
import {
  submitReviewEffect,
  removeReviewEffect,
  saveReplyEffect,
  removeReplyEffect,
} from "@/lib/engagement/reviews-effects";

export type { Review } from "@/lib/engagement/reviews-section-state";

// Verified-buyer reviews section (V2), rendered on the component
// detail page below the README.
//
// The server page decides who can review (signed in + owns the
// component + not the seller) and passes the initial data down;
// this component only handles the interactive layer:
//   * 1–5 star picker + optional text
//   * create / update (upsert) via POST /api/components/[id]/reviews
//   * delete own review via DELETE on the same route
// The API re-checks every rule server-side — this is UX, not security.

function Stars({ value, size = "text-sm" }: { value: number; size?: string }) {
  return (
    <span className={`${size} leading-none`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? "text-accent" : "text-line"}>★</span>
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className={`text-xl leading-none transition-colors ${
            n <= shown ? "text-accent" : "text-line hover:text-subtle"
          }`}
        >
          ★
        </button>
      ))}
      <span className="ml-2 font-mono text-[11px] text-subtle">
        {shown ? `${shown}/5` : "select"}
      </span>
    </div>
  );
}

export function ReviewsSection({
  componentId,
  initialReviews,
  canReview,
  signedIn,
  isSeller,
  sellerUsername,
}: {
  componentId: string;
  initialReviews: Review[];
  canReview: boolean;
  signedIn: boolean;
  isSeller: boolean;
  sellerUsername?: string | null;
}) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const mine = reviews.find((r) => r.mine) ?? null;

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [body, setBody] = useState(mine?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Seller reply state (one open editor at a time) ----
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  function openReplyEditor(review: Review) {
    setReplyingTo(review.id);
    setReplyBody(review.reply?.body ?? "");
    setReplyError(null);
  }

  async function saveReply(reviewId: string) {
    setReplyBusy(true);
    setReplyError(null);
    const result = await runSaveReplyFlow(
      { saveReply: (id, body) => saveReplyEffect(fetch, id, body) },
      { reviews, reviewId, body: replyBody }
    );
    setReplyBusy(false);
    if (result.status === "error") {
      setReplyError(result.error);
      return;
    }
    setReviews(result.reviews);
    setReplyingTo(null);
    setReplyBody("");
  }

  async function removeReply(reviewId: string) {
    setReplyBusy(true);
    setReplyError(null);
    const result = await runRemoveReplyFlow(
      { removeReply: (id) => removeReplyEffect(fetch, id) },
      { reviews, reviewId }
    );
    setReplyBusy(false);
    if (result.status === "error") {
      setReplyError(result.error);
      return;
    }
    setReviews(result.reviews);
    setReplyingTo(null);
  }

  const count = reviews.length;
  const average = count ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

  const showForm = canReview && (!mine || editing);

  async function submit() {
    setBusy(true);
    setError(null);
    const result = await runSubmitReviewFlow(
      { submitReview: (r, b) => submitReviewEffect(fetch, componentId, r, b) },
      { reviews, rating, body, mine }
    );
    setBusy(false);
    if (result.status === "error") {
      setError(result.error);
      return;
    }
    setReviews(result.reviews);
    setEditing(false);
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const result = await runRemoveReviewFlow(
      { removeReview: () => removeReviewEffect(fetch, componentId) },
      { reviews }
    );
    setBusy(false);
    if (result.status === "error") {
      setError(result.error);
      return;
    }
    setReviews(result.reviews);
    setRating(0);
    setBody("");
    setEditing(false);
  }

  return (
    <section className="mt-10" id="reviews">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h2 className="font-display font-bold text-xl">Reviews</h2>
        {count > 0 && (
          <div className="flex items-center gap-2">
            <Stars value={Math.round(average)} />
            <span className="font-mono text-xs text-subtle">
              {average.toFixed(1)} · {count} verified {count === 1 ? "review" : "reviews"}
            </span>
          </div>
        )}
      </div>
      <p className="text-xs text-subtle mt-1">
        Every review comes from someone who downloaded or purchased this component.
      </p>

      {/* ---- Write / edit form ---- */}
      {showForm && (
        <div className="mt-5 rounded-block border bg-surface p-4">
          <p className="font-mono text-[11px] text-subtle mb-3">
            {mine ? "update your review" : "write a verified review"}
          </p>
          <StarPicker value={rating} onChange={setRating} />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={MAX_BODY_LENGTH}
            rows={3}
            placeholder="What worked, what didn't, how you used it (optional)"
            data-testid="review-body"
            className="mt-3 w-full rounded-block border bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={submit}
              disabled={busy}
              data-testid="review-submit"
              className="rounded-block bg-accent px-4 py-1.5 text-sm text-accent-ink disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {busy && <Spinner className="h-3.5 w-3.5" />}
              {busy ? "Saving…" : mine ? "Save changes" : "Publish review"}
            </button>
            {editing && (
              <button
                onClick={() => {
                  setEditing(false);
                  setRating(mine?.rating ?? 0);
                  setBody(mine?.body ?? "");
                  setError(null);
                }}
                className="text-sm text-subtle hover:text-muted"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* ---- State hints ---- */}
      {!signedIn && (
        <p className="mt-5 text-sm text-subtle">
          <a href="/sign-in" className="text-accent hover:underline">Sign in</a> and download this
          component to leave a verified review.
        </p>
      )}
      {signedIn && !canReview && !isSeller && (
        <p className="mt-5 text-sm text-subtle">
          Download this component to leave a verified review.
        </p>
      )}
      {isSeller && (
        <p className="mt-5 font-mono text-[11px] text-subtle">
          Sellers can't review their own components — but you can respond to each review below.
        </p>
      )}

      {/* ---- Review list ---- */}
      {count === 0 ? (
        <p className="mt-5 text-sm text-subtle">No reviews yet.</p>
      ) : (
        <ul className="mt-5 space-y-5">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-line pb-5 last:border-b-0">
              <div className="flex items-center gap-2.5">
                <UserAvatar user={r.reviewer} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={`/sellers/${r.reviewer.username}`}
                      className="text-sm font-medium hover:text-accent truncate"
                    >
                      {r.reviewer.display_name ?? `@${r.reviewer.username}`}
                    </a>
                    <span className="font-mono text-[10px] rounded-[3px] border px-1 py-0.5 text-free border-free">
                      verified
                    </span>
                    {r.mine && (
                      <span className="font-mono text-[10px] text-subtle">(you)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Stars value={r.rating} size="text-xs" />
                    <span className="font-mono text-[10px] text-subtle">{formatDate(r.created_at)}</span>
                  </div>
                </div>
              </div>
              {r.body && <p className="mt-2 text-sm text-muted whitespace-pre-wrap">{r.body}</p>}

              {/* ---- Seller response (visible to everyone) ---- */}
              {r.reply && replyingTo !== r.id && (
                <div className="mt-3 ml-4 rounded-block border-l-2 border-accent bg-surface px-3 py-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] rounded-[3px] border px-1 py-0.5 text-accent">
                      seller response
                    </span>
                    {sellerUsername && (
                      <span className="font-mono text-[10px] text-subtle">@{sellerUsername}</span>
                    )}
                    <span className="font-mono text-[10px] text-subtle">{formatDate(r.reply.created_at)}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-muted whitespace-pre-wrap">{r.reply.body}</p>
                  {isSeller && (
                    <div className="mt-2 flex gap-3">
                      <button
                        onClick={() => openReplyEditor(r)}
                        className="font-mono text-[11px] text-subtle hover:text-accent"
                      >
                        edit
                      </button>
                      <button
                        onClick={() => removeReply(r.id)}
                        disabled={replyBusy}
                        className="font-mono text-[11px] text-subtle hover:text-red-600"
                      >
                        delete
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ---- Seller: write a reply ---- */}
              {isSeller && !r.reply && replyingTo !== r.id && (
                <button
                  onClick={() => openReplyEditor(r)}
                  className="mt-2 font-mono text-[11px] text-subtle hover:text-accent"
                >
                  reply
                </button>
              )}
              {isSeller && replyingTo === r.id && (
                <div className="mt-3 ml-4 rounded-block border bg-surface p-3">
                  <p className="font-mono text-[11px] text-subtle mb-2">
                    {r.reply ? "update your response" : "respond as the seller — this is public"}
                  </p>
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    maxLength={MAX_BODY_LENGTH}
                    rows={3}
                    placeholder="Thank the reviewer, answer their question, or explain a fix"
                    className="w-full rounded-block border bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  {replyError && <p className="mt-2 text-xs text-red-600">{replyError}</p>}
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      onClick={() => saveReply(r.id)}
                      disabled={replyBusy}
                      className="rounded-block bg-accent px-3 py-1.5 text-sm text-accent-ink disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {replyBusy && <Spinner className="h-3.5 w-3.5" />}
                      {replyBusy ? "Saving…" : r.reply ? "Save changes" : "Publish response"}
                    </button>
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyError(null);
                      }}
                      className="text-sm text-subtle hover:text-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {r.mine && !editing && (
                <div className="mt-2 flex gap-3">
                  <button
                    onClick={() => {
                      setEditing(true);
                      setRating(r.rating);
                      setBody(r.body ?? "");
                    }}
                    className="font-mono text-[11px] text-subtle hover:text-accent"
                  >
                    edit
                  </button>
                  <button
                    onClick={remove}
                    disabled={busy}
                    className="font-mono text-[11px] text-subtle hover:text-red-600"
                  >
                    delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
