import { youtubeIdFromUrl } from './youtube';

/** Locks down the API's supported links and excludes lookalike hosts and ambiguous IDs. */
describe('youtubeIdFromUrl', () => {
  it.each([
    'https://youtu.be/M7lc1UVf-VE?si=example',
    'https://www.youtube.com/watch?v=M7lc1UVf-VE&t=10',
    'https://m.youtube.com/watch?v=M7lc1UVf-VE',
    'https://youtube.com/shorts/M7lc1UVf-VE',
    'https://www.youtube.com/embed/M7lc1UVf-VE',
  ])('accepts %s', (url) => {
    expect(youtubeIdFromUrl(url)).toBe('M7lc1UVf-VE');
  });
  it.each([
    '',
    'M7lc1UVf-VE',
    'javascript:alert(1)',
    'http://youtu.be/M7lc1UVf-VE',
    'https://youtube.com.evil.test/watch?v=M7lc1UVf-VE',
    'https://user:password@youtu.be/M7lc1UVf-VE',
    'https://youtu.be:444/M7lc1UVf-VE',
    'https://youtu.be/M7lc1UVf-VE/extra',
    'https://www.youtube.com/watch?v=M7lc1UVf-VE&v=abcdefghijk',
    'https://www.youtube.com/playlist?list=abc',
  ])('rejects %s', (url) => {
    expect(youtubeIdFromUrl(url)).toBeNull();
  });
});
