import { runClientAction } from "@/lib/client-action";

// The real effects behind PostCommentDeps/RemoveCommentDeps
// (lib/engagement/comments-flow.ts) — the actual fetch calls the tested flow
// logic calls through, built on the shared fetch/parse/catch in
// lib/client-action.ts instead of each repeating it. `fetchImpl` and the
// relevant id are accepted, not created/captured internally, so a caller
// wires them in with a one-line closure (see comments-section.tsx).

export type PostCommentEffectResult =
  | { ok: true; comment: { id: string; body: string; created_at: string } }
  | { ok: false; error: string };

export async function postCommentEffect(
  fetchImpl: typeof fetch,
  componentId: string,
  body: string,
  parentId: string | null
): Promise<PostCommentEffectResult> {
  const result = await runClientAction<{ id: string; body: string; created_at: string }>(
    fetchImpl,
    `/api/components/${componentId}/comments`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, parentId }) },
    { fallback: "Could not post the comment. Try again.", network: "Network error — the comment was not posted." }
  );
  if (!result.ok) return result;
  return { ok: true, comment: result.data };
}

export type RemoveCommentEffectResult = { ok: true } | { ok: false; error: string };

export async function removeCommentEffect(
  fetchImpl: typeof fetch,
  commentId: string
): Promise<RemoveCommentEffectResult> {
  const result = await runClientAction<object>(
    fetchImpl,
    `/api/comments/${commentId}`,
    { method: "DELETE" },
    { fallback: "Could not delete the comment. Try again.", network: "Network error — the comment was not deleted." }
  );
  if (!result.ok) return result;
  return { ok: true };
}
