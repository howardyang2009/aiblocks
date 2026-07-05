// The optimistic star-toggle transition — pure, no fetch, no React. The
// component still owns the request itself (a bare POST with no body and no
// response parsing worth a seam of its own); this is just the arithmetic
// around it, which is where a mismatched revert would actually hide.

export type StarState = { starred: boolean; count: number };

// The optimistic next state, computed before the request is sent.
export function applyOptimisticToggle(state: StarState): StarState {
  return {
    starred: !state.starred,
    count: state.starred ? state.count - 1 : state.count + 1,
  };
}

// Confirm the optimistic state on success, or revert to the prior one on failure.
export function resolveToggle(
  previous: StarState,
  optimistic: StarState,
  succeeded: boolean
): StarState {
  return succeeded ? optimistic : previous;
}
