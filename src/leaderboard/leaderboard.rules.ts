export const CATEGORIES = [
  'Paling Eksis',
  'Pendatang Terbaik',
  'Tampil kembali',
];
/** Returns the UTC month containing the instant. */
export function periodOf(date = new Date()) {
  return date.toISOString().slice(0, 7);
}
/** Returns UTC month/cohort boundaries without local timezone shifts. */
export function bounds(period: string) {
  const [year, month] = period.split('-').map(Number);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
    joinStart: new Date(Date.UTC(year, month - 3, 1)),
    cutoff: new Date(Date.UTC(year, month - 4, 1)),
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
