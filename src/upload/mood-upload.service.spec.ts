import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DataSource } from 'typeorm';
import { MoodUploadService } from './mood-upload.service';

describe('public mood uploads', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = {
      S3_BUCKET: 'test-public',
      S3_ACCESS_KEY: 'synthetic-access',
      S3_SECRET_KEY: 'synthetic-secret',
      S3_SPACES_ENDPOINT: 'https://minio.example.test',
      BASE_URL: 'https://api.example.test',
    };
  });
  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('uploads to the shared bucket without private configuration or signed URLs', async () => {
    const send = jest
      .spyOn(S3Client.prototype, 'send')
      .mockResolvedValue({} as never);
    const save = jest.fn(async (attachment) => attachment);
    const db = { getRepository: () => ({ save }) } as unknown as DataSource;
    const service = new MoodUploadService(db);
    const buffer = Buffer.alloc(44);
    buffer.write('RIFF');
    buffer.write('WAVE', 8);
    const result = await service.upload(42, 'audio', {
      buffer,
      mimetype: 'audio/wav',
    } as Express.Multer.File);
    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command.input.Bucket).toBe('test-public');
    expect(command.input.CacheControl).toBe('public, max-age=86400');
    expect(result.url).toBe(
      `https://minio.example.test/test-public/mood/42/${result.id}`,
    );
    expect(result.expiresAt).toBeNull();
    expect(new URL(result.url).search).toBe('');
    expect(save).toHaveBeenCalledTimes(1);
  });
});
