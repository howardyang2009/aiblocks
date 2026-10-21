import { runClientAction, type ClientActionMessages } from "@/lib/client-action";
import { toPublicProfile, type PublicProfile } from "@/lib/identity/public-profile";

// The Comment thread on a Component page: building the one-level tree from
// rows (server), and posting/deleting a Comment (client). No React here.
//
// postComment and deleteComment return `apply`, a transition from the
// LATEST thread to the next one, never a finished thread. Callers hand it
// to a functional state update (`setComments(result.apply)`), so two
// requests in flight on different rows can't overwrite each other's result
// with a stale snapshot.

export type CommentNode = {
  id: string;
  body: string;
  created_at: string;
  author: PublicProfile;
  isSeller: boolean;
  mine: boolean;
  replies: CommentNode[];
};

type AuthorRow = { id: string; username: string; display_name: string | null; avatar_url: string | null };

// Rows arrive oldest first; a reply attaches to its top-level parent.
export function buildCommentTree(
  rows: { id: string; user_id: string; parent_id: string | null; body: string; created_at: string }[],
  context: { authors: AuthorRow[]; sellerId: string; viewerId: string | null }
): CommentNode[] {
  const authorById = new Map(context.authors.map((p) => [p.id, p]));
  const nodeById = new Map<string, CommentNode>();
  const tree: CommentNode[] = [];
  for (const r of rows) {
    const node: CommentNode = {
      id: r.id,
      body: r.body,
      created_at: r.created_at,
      author: toPublicProfile(authorById.get(r.user_id)),
      isSeller: r.user_id === context.sellerId,
      mine: context.viewerId !== null && r.user_id === context.viewerId,
      replies: [],
    };
    nodeById.set(r.id, node);
    if (!r.parent_id) tree.push(node);
  }
  for (const r of rows) {
    if (r.parent_id) nodeById.get(r.parent_id)?.replies.push(nodeById.get(r.id)!);
  }
  return tree;
}

// Top-level Comments go to the end (oldest first); a reply goes into its
// parent's `replies`. `parentId` is null for a top-level post.
export function insertComment(comments: CommentNode[], node: CommentNode, parentId: string | null): CommentNode[] {
  if (parentId) {
    return comments.map((c) => (c.id === parentId ? { ...c, replies: [...c.replies, node] } : c));
  }
  return [...comments, node];
}

// The id could be a top-level Comment or a reply, so both checks run.
export function removeComment(comments: CommentNode[], commentId: string): CommentNode[] {
  return comments
    .filter((c) => c.id !== commentId)
    .map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== commentId) }));
}

// `comments.parent_id` is ON DELETE CASCADE, so deleting a top-level
// Comment also deletes its replies. A reply never has replies of its own.
export function requiresDeleteConfirmation(comment: CommentNode): boolean {
  return comment.replies.length > 0;
}

type Transition = (latest: CommentNode[]) => CommentNode[];

export type PostCommentResult = { status: "error"; error: string } | { status: "posted"; apply: Transition };

export async function postComment(
  deps: { fetch: typeof fetch; messages: ClientActionMessages & { required: string } },
  args: { componentId: string; body: string; parentId: string | null; viewer: PublicProfile | null; isSeller: boolean }
): Promise<PostCommentResult> {
  const text = args.body.trim();
  if (!text) return { status: "error", error: deps.messages.required };

  const result = await runClientAction<{ id: string; body: string; created_at: string }>(
    deps.fetch,
    `/api/components/${args.componentId}/comments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text, parentId: args.parentId }),
    },
    deps.messages
  );
  if (!result.ok) return { status: "error", error: result.error };

  // The server doesn't echo the author's profile, so the poster's own
  // identity fills it in for rendering before a reload.
  const node: CommentNode = {
    id: result.data.id,
    body: result.data.body,
    created_at: result.data.created_at,
    author: toPublicProfile(args.viewer, "you", "You"),
    isSeller: args.isSeller,
    mine: true,
    replies: [],
  };
  return { status: "posted", apply: (latest) => insertComment(latest, node, args.parentId) };
}

export type DeleteCommentResult =
  | { status: "cancelled" }
  | { status: "error"; error: string }
  | { status: "removed"; apply: Transition };

// `confirm` is only asked when the cascade rule says replies would be lost.
export async function deleteComment(
  deps: { fetch: typeof fetch; confirm: (comment: CommentNode) => boolean; messages: ClientActionMessages },
  comment: CommentNode
): Promise<DeleteCommentResult> {
  if (requiresDeleteConfirmation(comment) && !deps.confirm(comment)) return { status: "cancelled" };

  const result = await runClientAction<object>(
    deps.fetch,
    `/api/comments/${comment.id}`,
    { method: "DELETE" },
    deps.messages
  );
  if (!result.ok) return { status: "error", error: result.error };
  return { status: "removed", apply: (latest) => removeComment(latest, comment.id) };
}
