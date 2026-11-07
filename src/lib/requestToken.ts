export function createRequestToken() {
  let generation = 0;
  return { invalidate: () => { generation++; }, current: () => { const token = generation; return () => generation === token; } };
}
