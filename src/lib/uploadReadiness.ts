export const wordOutlineReady = (loading: boolean, error: string | null, hasOutline: boolean): boolean =>
  !loading && !error && hasOutline;

export const googleOutlineReady = (state: string, loading: boolean, error: string | null, hasOutline: boolean): boolean =>
  state === 'ready' && wordOutlineReady(loading, error, hasOutline);
