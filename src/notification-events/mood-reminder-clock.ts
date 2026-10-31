import { localMoodDate } from '../mood-tracker/mood-tracker.service';

/** Uses the same local-day rule as mood writes; never infers a timezone from server location. */
export function moodReminderClock(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  return { date: localMoodDate(now, timeZone), due: hour >= 20 };
}
