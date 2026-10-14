import { Injectable } from '@nestjs/common';

@Injectable()
export class DateHelper {
  getDateRange(date1: Date, date2: Date): string {

      // Normalize both dates to UTC
      const utcDate1 = new Date(date1.getTime());
      const utcDate2 = new Date(date2.getTime());

    // date 2 is utc 7
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
      return `${date1.getDate()} ${date1.toLocaleString('default', {
        month: 'long',
      })} ${date1.getFullYear()}`;
    }
  }
}