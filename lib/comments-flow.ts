import {
  buildCommentNode,
  insertComment,
  removeComment,
  requiresDeleteConfirmation,
  type CommentNode,
} from "@/lib/comments-section-state";
import type { PublicProfile } from "@/lib/public-profile";

// The comments-section flows: each takes the current thread and returns the
// next one, so posting/removing a comment is one tested interface end to
// end (validate -> network -> tree splice) rather than a splice the
// component has to remember to apply correctly after its own fetch call.
// window.confirm() itself stays in the component — see runRemoveCommentFlow.

export type PostCommentDeps = {
  postComment: (
    body: string,
    parentId: string | null
  ) => Promise<
    | { ok: true; comment: { id: string; body: string; created_at: string } }
    | { ok: false; error: string }
  >;
};

export type PostCommentResult =
  | { status: "error"; error: string }
  | { status: "posted"; comments: CommentNode[] };

export async function runPostCommentFlow(
  deps: PostCommentDeps,
  args: {
    comments: CommentNode[];
    body: string;
    parentId: string | null;
    viewer: PublicProfile | null;
    isSeller: boolean;
  }
): Promise<PostCommentResult> {
  const text = args.body.trim();
  if (!text) return { status: "error", error: "Comment text is required." };

  const result = await deps.postComment(text, args.parentId);
  if (!result.ok) return { status: "error", error: result.error };

  const node = buildCommentNode(result.comment, { viewer: args.viewer, isSeller: args.isSeller });
  return { status: "posted", comments: insertComment(args.comments, node, args.parentId) };
}

export type RemoveCommentDeps = {
  removeComment: () => Promise<{ ok: true } | { ok: false; error: string }>;
};

export type RemoveCommentResult =
  | { status: "needs-confirmation" }
  | { status: "error"; error: string }
  | { status: "removed"; comments: CommentNode[] };

// `confirmed` is whatever the component already resolved (e.g. via
// window.confirm()) by the time this runs — this flow only owns the RULE
// for whether confirmation is required, not the dialog itself.
export async function runRemoveCommentFlow(
  deps: RemoveCommentDeps,
  args: { comments: CommentNode[]; comment: CommentNode; confirmed: boolean }
): Promise<RemoveCommentResult> {
  if (requiresDeleteConfirmation(args.comment) && !args.confirmed) {
    return { status: "needs-confirmation" };
  }

  const result = await deps.removeComment();
  if (!result.ok) return { status: "error", error: result.error };

  return { status: "removed", comments: removeComment(args.comments, args.comment.id) };
}
