import { Injectable } from '@nestjs/common';

@Injectable()
export class DateHelper {
  getDateRange(date1: Date, date2: Date): string {
    // Normalize both dates to UTC
    const utcDate1 = new Date(date1.getTime());
    const utcDate2 = new Date(date2.getTime());

    // Elapsed time compares real instants.
    const diffTime = Math.abs(utcDate2.getTime() - utcDate1.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays <= 7) {
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    } else if (diffDays <= 10) {
      return `${diffDays} days ago`;
    } else {
      return `${date1.getUTCDate()} ${date1.toLocaleString('default', {
        month: 'long',
        timeZone: 'UTC',
      })} ${date1.getUTCFullYear()}`;
    }
  }
}
/** Formats the existing API/export date labels in UTC, independently of the host timezone. */
export function formatUtc(date: Date, pattern: string): string {
  const iso = date.toISOString();
  const day = iso.slice(0, 10);
  const displayDay = `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(
    0,
    4,
  )}`;
  switch (pattern) {
    case 'yyyy-MM-dd':
      return day;
    case 'yyyy-MM-dd HH:mm:ss':
      return `${day} ${iso.slice(11, 19)}`;
    case 'yyyy-MM-dd 00:00:00':
      return `${day} 00:00:00`;
    case 'yyyy-MM-dd 23:59:59':
      return `${day} 23:59:59`;
    case 'dd/MM/yyyy':
      return displayDay;
    case 'dd/MM/yyyy HH:mm':
      return `${displayDay} ${iso.slice(11, 16)}`;
    default:
      throw new Error('Unsupported UTC date format.');
  }
}
