import { objectUrl, storageConfig } from './storage-config';

const env = {
  S3_BUCKET: 'temusobat',
  S3_ACCESS_KEY: 'test-access',
  S3_SECRET_KEY: 'test-secret',
  BASE_URL: 'https://api.temusobat.tech/',
};

describe('MinIO storage configuration', () => {
  it('uses the confirmed API endpoint and path-style addressing', () => {
    const config = storageConfig(env);
    expect(config.client).toMatchObject({
      endpoint: 'https://s3.temusobat.tech',
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: 'test-access',
        secretAccessKey: 'test-secret',
      },
    });
    expect(config.baseUrl).toBe('https://api.temusobat.tech');
  });

  it('honors a configured endpoint and encodes object paths', () => {
    const config = storageConfig({
      ...env,
      S3_SPACES_ENDPOINT: 'http://127.0.0.1:9000/',
    });
    expect(
      objectUrl(config.endpointUrl, config.bucket, 'mimate/images/a b#?.png'),
    ).toBe('http://127.0.0.1:9000/temusobat/mimate/images/a%20b%23%3F.png');
  });

  it('rejects missing settings and unsafe endpoints without exposing values', () => {
    expect(() => storageConfig({ ...env, S3_SECRET_KEY: '' })).toThrow(
      'Missing S3_SECRET_KEY configuration.',
    );
    for (const value of [
      'invalid',
      'file:///tmp',
      'https://user:private@example.com',
      'https://example.com?token=private',
    ]) {
      expect(() =>
        storageConfig({ ...env, S3_SPACES_ENDPOINT: value }),
      ).toThrow('Invalid S3_SPACES_ENDPOINT configuration.');
    }
    expect(() => storageConfig({ ...env, S3_BUCKET: '../private' })).toThrow(
      'Invalid S3_BUCKET configuration.',
    );
  });
});
