import { localMoodDate } from '../mood-tracker/mood-tracker.service';

/** Single source for the daily reminder hour shown to clients and used by the scheduler. */
export const MOOD_REMINDER_HOUR = 8;
export const MOOD_REMINDER_LOCAL_TIME = `${String(MOOD_REMINDER_HOUR).padStart(
  2,
  '0',
)}:00`;

/** Uses the same local-day rule as mood writes; never infers a timezone from server location. */
export function moodReminderClock(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  return {
    date: localMoodDate(now, timeZone),
    due: hour >= MOOD_REMINDER_HOUR,
  };
}
