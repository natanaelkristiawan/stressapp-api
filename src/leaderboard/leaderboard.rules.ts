export const CATEGORIES = [
  'Paling Eksis',
  'Pendatang Terbaik',
  'Tampil kembali',
];
export const OFFSET = 8 * 60 * 60 * 1000;
export function periodOf(date = new Date()) {
  return new Date(date.getTime() + OFFSET).toISOString().slice(0, 7);
}
export function bounds(period: string) {
  const [year, month] = period.split('-').map(Number);
  return {
    start: new Date(Date.UTC(year, month - 1, 1) - OFFSET),
    end: new Date(Date.UTC(year, month, 1) - OFFSET),
    joinStart: new Date(Date.UTC(year, month - 3, 1) - OFFSET),
    cutoff: new Date(Date.UTC(year, month - 4, 1) - OFFSET),
  };
}
// Match WinnerSetService, including SQL's exclusion of NULL notes.
export const POINT_FILTER = `qpd.points > 0 AND qpd.note != 'Get point for activated account'
 AND (qpd.post_id IS NOT NULL OR qpd.comment_id IS NOT NULL OR qpd.reaction_id IS NOT NULL
 OR qpd.note LIKE '%share%' OR qpd.note LIKE '%post%' OR qpd.note LIKE '%comment%' OR qpd.note LIKE '%like%')`;
export function memberKey(id: number) {
  // Reverse lexicographic order for equal scores: smaller numeric IDs first.
  return String(9999999999 - id).padStart(10, '0');
}
export function memberId(key: string) {
  return 9999999999 - Number(key);
}
