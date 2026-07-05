import { toPublicProfile, type PublicProfile } from "@/lib/public-profile";

// The optimistic comment-thread transitions — pure, no fetch, no React,
// no window.confirm. The component still owns the request itself, the
// composer/reply-editor state, and the actual confirm() dialog; this is
// the tree logic underneath, which is where a mismatched splice or a
// silently-dropped cascade rule would actually hide.

export type CommentNode = {
  id: string;
  body: string;
  created_at: string;
  author: PublicProfile;
  isSeller: boolean;
  mine: boolean;
  replies: CommentNode[];
};

// Shapes a freshly-posted comment/reply into a CommentNode, from the POST
// response plus the viewer context needed to render it before a reload —
// the server doesn't echo back the author's profile, so this fills it in
// from what the page already knows about who's posting.
export function buildCommentNode(
  response: { id: string; body: string; created_at: string },
  context: { viewer: PublicProfile | null; isSeller: boolean }
): CommentNode {
  return {
    id: response.id,
    body: response.body,
    created_at: response.created_at,
    author: toPublicProfile(context.viewer, "you", "You"),
    isSeller: context.isSeller,
    mine: true,
    replies: [],
  };
}

// Splice a newly-posted node into the tree: top-level comments go to the
// end (conversation order: oldest first); a reply goes into its parent's
// `replies`. `parentId` is null for a top-level post.
export function insertComment(
  comments: CommentNode[],
  node: CommentNode,
  parentId: string | null
): CommentNode[] {
  if (parentId) {
    return comments.map((c) => (c.id === parentId ? { ...c, replies: [...c.replies, node] } : c));
  }
  return [...comments, node];
}

// Remove a comment by id, wherever it lives — a top-level comment or one of
// its replies (the id could be either, so both checks always run).
export function removeComment(comments: CommentNode[], commentId: string): CommentNode[] {
  return comments
    .filter((c) => c.id !== commentId)
    .map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== commentId) }));
}

// `comments.parent_id` references comments(id) ON DELETE CASCADE, so
// deleting a top-level comment also removes its replies — this names that
// rule so the UI can warn before sending the request. A reply itself never
// requires confirmation: one level of threading means a reply can't have
// replies of its own to lose.
export function requiresDeleteConfirmation(comment: CommentNode): boolean {
  return comment.replies.length > 0;
}
