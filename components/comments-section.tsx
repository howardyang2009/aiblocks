"use client";

import { useState } from "react";
import { MAX_BODY_LENGTH } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";

// Open comments section (V2), rendered on the component detail page
// below the reviews. Unlike reviews, comments are ungated: any
// signed-in user can ask a question or reply. The seller's messages
// carry a `seller` badge so their answers read as authoritative.
//
// Threading is one level: replies attach to top-level comments only
// (enforced server-side in /api/components/[id]/comments).
// This component is the UX layer — the API re-checks every rule.

export type CommentNode = {
  id: string;
  body: string;
  created_at: string;
  author: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  isSeller: boolean;
  mine: boolean;
  replies: CommentNode[];
};


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
  viewer: { username: string; display_name: string | null; avatar_url: string | null } | null;
  isSeller: boolean;
}) {
  const [comments, setComments] = useState<CommentNode[]>(initialComments);

  // Top-level composer.
  const [body, setBody] = useState("");
  // Inline reply composer (one open at a time).
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = comments.reduce((n, c) => n + 1 + c.replies.length, 0);

  async function post(parentId: string | null) {
    const text = (parentId ? replyBody : body).trim();
    if (!text) {
      setError("Comment text is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/components/${componentId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, parentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not post the comment. Try again.");
        return;
      }
      const node: CommentNode = {
        id: data.comment.id,
        body: data.comment.body,
        created_at: data.comment.created_at,
        author: viewer ?? { username: "you", display_name: "You", avatar_url: null },
        isSeller,
        mine: true,
        replies: [],
      };
      if (parentId) {
        setComments((prev) =>
          prev.map((c) => (c.id === parentId ? { ...c, replies: [...c.replies, node] } : c))
        );
        setReplyingTo(null);
        setReplyBody("");
      } else {
        setComments((prev) => [...prev, node]); // conversation order: oldest first
        setBody("");
      }
    } catch {
      setError("Network error — the comment was not posted.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(commentId: string, replyCount: number) {
    if (
      replyCount > 0 &&
      !window.confirm(
        `Deleting this comment also deletes its ${replyCount} ${replyCount === 1 ? "reply" : "replies"}. Continue?`
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete the comment. Try again.");
        return;
      }
      setComments((prev) =>
        prev
          .filter((c) => c.id !== commentId)
          .map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== commentId) }))
      );
    } catch {
      setError("Network error — the comment was not deleted.");
    } finally {
      setBusy(false);
    }
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
            className="w-full rounded-block border bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {error && !replyingTo && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <div className="mt-3">
            <button
              onClick={() => post(null)}
              disabled={busy}
              className="rounded-block bg-accent px-4 py-1.5 text-sm text-accent-ink disabled:opacity-50"
            >
              {busy && !replyingTo ? "Posting…" : "Post comment"}
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
                          setError(null);
                        }}
                        className="font-mono text-[11px] text-subtle hover:text-accent"
                      >
                        reply
                      </button>
                    )}
                    {c.mine && (
                      <button
                        onClick={() => remove(c.id, c.replies.length)}
                        disabled={busy}
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
                                  onClick={() => remove(r.id, 0)}
                                  disabled={busy}
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
                      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          onClick={() => post(c.id)}
                          disabled={busy}
                          className="rounded-block bg-accent px-3 py-1.5 text-sm text-accent-ink disabled:opacity-50"
                        >
                          {busy ? "Posting…" : "Post reply"}
                        </button>
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setError(null);
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
