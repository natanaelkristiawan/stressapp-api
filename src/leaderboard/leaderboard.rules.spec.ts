import { bounds, memberId, memberKey, periodOf } from './leaderboard.rules';
describe('Leaderboard period and tie-break rules', () => {
  it('changes month exactly at GMT+8 midnight, including year rollover', () => {
    expect(periodOf(new Date('2026-09-30T15:59:59.999Z'))).toBe('2026-09');
    expect(periodOf(new Date('2026-09-30T16:00:00Z'))).toBe('2026-10');
    expect(periodOf(new Date('2026-12-31T16:00:00Z'))).toBe('2027-01');
    const range = bounds('2026-10');
    expect(range.start.toISOString()).toBe('2026-09-30T16:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-10-31T16:00:00.000Z');
    expect(range.joinStart.toISOString()).toBe('2026-07-31T16:00:00.000Z');
    expect(range.cutoff.toISOString()).toBe('2026-06-30T16:00:00.000Z');
  });
  it('sorts equal scores by smaller ID first in reverse Redis order', () => {
    const ids = [100, 2, 11, 2147483647];
    expect(ids.map(memberKey).sort().reverse().map(memberId)).toEqual([
      2, 11, 100, 2147483647,
    ]);
  });
});
