import { formatUtc } from './date.helper';

// UTC labels must remain stable even on hosts in UTC+8 or a DST-observing zone.
describe('UTC API date labels', () => {
  const previousTimezone = process.env.TZ;
  afterAll(() => {
    if (previousTimezone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = previousTimezone;
    }
  });
  for (const timezone of ['UTC', 'Asia/Makassar', 'America/New_York']) {
    it(`keeps year/day/time boundaries in UTC on ${timezone} hosts`, () => {
      process.env.TZ = timezone;
      const instant = new Date('2026-12-31T23:59:59.000Z');
      expect(formatUtc(instant, 'yyyy-MM-dd')).toBe('2026-12-31');
      expect(formatUtc(instant, 'yyyy-MM-dd HH:mm:ss')).toBe(
        '2026-12-31 23:59:59',
      );
      expect(formatUtc(instant, 'dd/MM/yyyy HH:mm')).toBe('31/12/2026 23:59');
      expect(formatUtc(instant, 'yyyy-MM-dd 00:00:00')).toBe(
        '2026-12-31 00:00:00',
      );
      expect(formatUtc(instant, 'yyyy-MM-dd 23:59:59')).toBe(
        '2026-12-31 23:59:59',
      );
    });
  }
});
