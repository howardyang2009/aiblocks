"use client";

import { useState } from "react";
import { MAX_BODY_LENGTH } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Spinner } from "@/components/ui/spinner";
import type { PublicProfile } from "@/lib/identity/public-profile";
import { requiresDeleteConfirmation, type CommentNode } from "@/lib/engagement/comments-section-state";
import { runPostCommentFlow, runRemoveCommentFlow } from "@/lib/engagement/comments-flow";
import { postCommentEffect, removeCommentEffect } from "@/lib/engagement/comments-effects";
import { useRowMutation } from "@/lib/use-row-mutation";

const COMPOSE = "compose";
// A top-level comment's own id doubles as its delete action's row key; its
// reply composer gets a separate, namespaced key so replying to a comment
// and deleting that same comment never share a busy/error slot.
const replyKey = (parentId: string) => `reply:${parentId}`;

export type { CommentNode } from "@/lib/engagement/comments-section-state";

// Open comments section (V2), rendered on the component detail page
// below the reviews. Unlike reviews, comments are ungated: any
// signed-in user can ask a question or reply. The seller's messages
// carry a `seller` badge so their answers read as authoritative.
//
// Threading is one level: replies attach to top-level comments only
// (enforced server-side in /api/components/[id]/comments).
// This component is the UX layer — the API re-checks every rule.


function AuthorLine({ c }: { c: CommentNode }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <a
        href={`/sellers/${c.author.username}`}
        className="text-sm font-medium hover:text-accent truncate"
      >
        {c.author.display_name ?? `@${c.author.username}`}
      </a>
      {c.isSeller && (
        <span className="font-mono text-[10px] rounded-[3px] border px-1 py-0.5 text-accent">
          seller
        </span>
      )}
      {c.mine && <span className="font-mono text-[10px] text-subtle">(you)</span>}
      <span className="font-mono text-[10px] text-subtle">{formatDate(c.created_at)}</span>
    </div>
  );
}

export function CommentsSection({
  componentId,
  initialComments,
  signedIn,
  viewer,
  isSeller,
}: {
  componentId: string;
  initialComments: CommentNode[];
  signedIn: boolean;
  // The viewer's public identity, so freshly posted comments render
  // correctly without a page reload. Null when signed out.
  viewer: PublicProfile | null;
  isSeller: boolean;
}) {
  const [comments, setComments] = useState<CommentNode[]>(initialComments);

  // Top-level composer.
  const [body, setBody] = useState("");
  // Inline reply composer (one open at a time).
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  const { run, isBusy, errorFor, clear } = useRowMutation();

  const count = comments.reduce((n, c) => n + 1 + c.replies.length, 0);

  async function post(parentId: string | null) {
    const key = parentId ? replyKey(parentId) : COMPOSE;
    const result = await run(key, () =>
      runPostCommentFlow(
        { postComment: (text, parentId) => postCommentEffect(fetch, componentId, text, parentId) },
        { comments, body: parentId ? replyBody : body, parentId, viewer, isSeller }
      )
    );
    if (result.status === "error") return;
    setComments(result.comments);
    if (parentId) {
      setReplyingTo(null);
      setReplyBody("");
    } else {
      setBody("");
    }
  }

  async function remove(comment: CommentNode) {
    if (requiresDeleteConfirmation(comment)) {
      const replyCount = comment.replies.length;
      const confirmed = window.confirm(
        `Deleting this comment also deletes its ${replyCount} ${replyCount === 1 ? "reply" : "replies"}. Continue?`
      );
      if (!confirmed) return;
    }
    const result = await run(comment.id, () =>
      runRemoveCommentFlow(
        { removeComment: () => removeCommentEffect(fetch, comment.id) },
        { comments, comment, confirmed: true }
      )
    );
    if (result.status === "removed") setComments(result.comments);
  }

  return (
    <section className="mt-10" id="comments">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h2 className="font-display font-bold text-xl">Comments</h2>
        {count > 0 && (
          <span className="font-mono text-xs text-subtle">
            {count} {count === 1 ? "comment" : "comments"}
          </span>
        )}
      </div>
      <p className="text-xs text-subtle mt-1">
        Open discussion — ask questions before you download. Anyone can comment.
      </p>

      {/* ---- Top-level composer ---- */}
      {signedIn ? (
        <div className="mt-5 rounded-block border bg-surface p-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={MAX_BODY_LENGTH}
            rows={3}
            placeholder="Ask a question or share a tip"
            data-testid="comment-input"
            className="w-full rounded-block border bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {errorFor(COMPOSE) && <p className="mt-2 text-xs text-red-600">{errorFor(COMPOSE)}</p>}
          <div className="mt-3">
            <button
              onClick={() => post(null)}
              disabled={isBusy(COMPOSE)}
              data-testid="comment-submit"
              className="rounded-block bg-accent px-4 py-1.5 text-sm text-accent-ink disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {isBusy(COMPOSE) && <Spinner className="h-3.5 w-3.5" />}
              {isBusy(COMPOSE) ? "Posting…" : "Post comment"}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-5 text-sm text-subtle">
          <a href="/sign-in" className="text-accent hover:underline">Sign in</a> to join the
          discussion.
        </p>
      )}

      {/* ---- Thread ---- */}
      {count === 0 ? (
        <p className="mt-5 text-sm text-subtle">No comments yet.</p>
      ) : (
        <ul className="mt-5 space-y-5">
          {comments.map((c) => (
            <li key={c.id} className="border-b border-line pb-5 last:border-b-0">
              <div className="flex items-start gap-2.5">
                <UserAvatar user={c.author} />
                <div className="min-w-0 flex-1">
                  <AuthorLine c={c} />
                  <p className="mt-1 text-sm text-muted whitespace-pre-wrap">{c.body}</p>
                  <div className="mt-1.5 flex gap-3">
                    {signedIn && (
                      <button
                        onClick={() => {
                          setReplyingTo(replyingTo === c.id ? null : c.id);
                          setReplyBody("");
                          clear(replyKey(c.id));
                        }}
                        className="font-mono text-[11px] text-subtle hover:text-accent"
                      >
                        reply
                      </button>
                    )}
                    {c.mine && (
                      <button
                        onClick={() => remove(c)}
                        disabled={isBusy(c.id)}
                        className="font-mono text-[11px] text-subtle hover:text-red-600"
                      >
                        delete
                      </button>
                    )}
                  </div>

                  {/* ---- Replies (one level) ---- */}
                  {c.replies.length > 0 && (
                    <ul className="mt-3 ml-1 space-y-3 border-l-2 border-line pl-4">
                      {c.replies.map((r) => (
                        <li key={r.id}>
                          <div className="flex items-start gap-2.5">
                            <UserAvatar user={r.author} />
                            <div className="min-w-0 flex-1">
                              <AuthorLine c={r} />
                              <p className="mt-1 text-sm text-muted whitespace-pre-wrap">{r.body}</p>
                              {r.mine && (
                                <button
                                  onClick={() => remove(r)}
                                  disabled={isBusy(r.id)}
                                  className="mt-1 font-mono text-[11px] text-subtle hover:text-red-600"
                                >
                                  delete
                                </button>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* ---- Inline reply composer ---- */}
                  {replyingTo === c.id && (
                    <div className="mt-3 ml-1 rounded-block border bg-surface p-3">
                      <textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        maxLength={MAX_BODY_LENGTH}
                        rows={2}
                        placeholder={`Reply to ${c.author.display_name ?? `@${c.author.username}`}`}
                        className="w-full rounded-block border bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
                      />
                      {errorFor(replyKey(c.id)) && (
                        <p className="mt-2 text-xs text-red-600">{errorFor(replyKey(c.id))}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          onClick={() => post(c.id)}
                          disabled={isBusy(replyKey(c.id))}
                          className="rounded-block bg-accent px-3 py-1.5 text-sm text-accent-ink disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          {isBusy(replyKey(c.id)) && <Spinner className="h-3.5 w-3.5" />}
                          {isBusy(replyKey(c.id)) ? "Posting…" : "Post reply"}
                        </button>
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            clear(replyKey(c.id));
                          }}
                          className="text-sm text-subtle hover:text-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
