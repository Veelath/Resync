export const wordOutlineReady = (loading: boolean, error: string | null, hasOutline: boolean): boolean =>
  !loading && !error && hasOutline;
