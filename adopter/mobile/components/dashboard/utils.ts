export function limLabel(v: number | null): string {
  if (v === null) return '…';
  if (v === -1) return '∞';
  return String(v);
}
