import { moodReminderClock } from './mood-reminder-clock';

describe('moodReminderClock', () => {
  it('is due from 08:00 in each member timezone', () => {
    // 01:00 UTC is 08:00 in Jakarta.
    expect(
      moodReminderClock(new Date('2026-11-23T01:00:00Z'), 'Asia/Jakarta'),
    ).toEqual({ date: '2026-11-23', due: true });
    // 00:59 UTC is 07:59 in Jakarta, so the reminder is not due yet.
    expect(
      moodReminderClock(new Date('2026-11-23T00:59:00Z'), 'Asia/Jakarta'),
    ).toEqual({ date: '2026-11-23', due: false });
  });

  it('keeps the local calendar day used by mood writes', () => {
    // 23:30 UTC is already the next day in Jakarta.
    expect(
      moodReminderClock(new Date('2026-11-23T23:30:00Z'), 'Asia/Jakarta'),
    ).toEqual({ date: '2026-11-24', due: false });
  });
});
