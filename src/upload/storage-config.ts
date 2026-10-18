import type { S3ClientConfig } from '@aws-sdk/client-s3';

/** Validates an HTTP endpoint. Returns a normalized URL without credentials or query data. */
function endpoint(value: string, name: string): string {
  try {
    const url = new URL(value);
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error();
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new Error(`Invalid ${name} configuration.`);
  }
}

/** Reads storage settings at upload time. Returns validated MinIO/S3 connection settings. */
export function storageConfig(env: NodeJS.ProcessEnv): {
  client: S3ClientConfig;
  bucket: string;
  baseUrl: string;
  endpointUrl: string;
} {
  const required = [
    'S3_BUCKET',
    'S3_ACCESS_KEY',
    'S3_SECRET_KEY',
    'BASE_URL',
  ] as const;
  for (const key of required) {
    if (!env[key]?.trim()) throw new Error(`Missing ${key} configuration.`);
  }
  const bucket = env.S3_BUCKET;
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket))
    throw new Error('Invalid S3_BUCKET configuration.');
  const endpointUrl = endpoint(
    env.S3_SPACES_ENDPOINT || 'https://s3.temusobat.tech',
    'S3_SPACES_ENDPOINT',
  );
  return {
    bucket,
    endpointUrl,
    baseUrl: endpoint(env.BASE_URL, 'BASE_URL'),
    client: {
      region: env.S3_REGION || 'us-east-1',
      endpoint: endpointUrl,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
      },
    },
  };
}

/** Builds the configured object URL for existing public-media responses. Returns an encoded path-style URL. */
export function objectUrl(
  endpointUrl: string,
  bucket: string,
  key: string,
): string {
  return `${endpointUrl.replace(/\/$/, '')}/${encodeURIComponent(bucket)}/${key
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}
