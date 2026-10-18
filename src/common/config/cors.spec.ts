import { getCorsOptions } from './cors';

describe('API CORS origins', () => {
  it('allows the deployed app, preserves local clients and excludes arbitrary sites', () => {
    const options = getCorsOptions();
    expect(options.origin).toContain('https://temusobat.tech');
    expect(options.origin).toContain('https://www.temusobat.tech');
    expect(options.origin).toContain('https://cms.temusobat.tech');
    expect(options.origin).toContain('http://localhost:8081');
    expect(options.origin).not.toContain('https://untrusted.example');
    expect(options.origin).not.toContain('*');
    expect(options.credentials).toBe(true);
  });
  it('normalizes configured origin whitespace/trailing slash without losing the deployed app', () => {
    const options = getCorsOptions(' https://cms.example/ , , https://other.example ');
    expect(options.origin).toContain('https://cms.example');
    expect(options.origin).toContain('https://other.example');
    expect(options.origin).toContain('https://temusobat.tech');
    expect(options.origin).toContain('https://www.temusobat.tech');
    expect(options.origin).toContain('https://cms.temusobat.tech');
    expect(options.origin).not.toContain('');
  });
});
