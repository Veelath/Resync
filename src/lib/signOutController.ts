export function createSignOutController(cleanup: () => Promise<void>, finish: (ended: boolean) => void) {
  let pending: Promise<void> | null = null;
  let complete = false;
  return {
    run(ended: boolean): Promise<void> {
      if (pending) return pending;
      if (complete) return Promise.resolve();
      pending = Promise.resolve().then(cleanup).then(() => { complete = true; finish(ended); }, error => { pending = null; throw error; });
      return pending;
    },
    reset() { if (!pending || complete) { pending = null; complete = false; } },
    busy() { return pending !== null || complete; },
  };
}
