export type QuickNotice = { kind: 'success' | 'error'; title: string; message: string };

export const NOTICE_EVENT = 'resync:notice';

/** A short pop-up for something the user just did (signed in, saved, could not copy). Shown even when scan alerts are off; not added to the bell. */
export function notify(notice: QuickNotice): void {
  window.dispatchEvent(new CustomEvent<QuickNotice>(NOTICE_EVENT, { detail: notice }));
}
