import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ArgumentsHost, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as sharp from 'sharp';
import { AssetsEntity } from '../entity/asset.entity';
import { UserMimateEntity } from '../entity/user-mimate.entity';
import { AllExceptionsFilter } from '../common/filters/http-exception.filter';
import { UploadService } from './upload.service';

describe('shared upload failure diagnostics', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reports missing storage configuration as 503 before calling storage or the database', async () => {
    const original = process.env;
    process.env = {};
    try {
      const save = jest.fn();
      const service = new UploadService(
        { save } as unknown as Repository<AssetsEntity>,
        {} as Repository<UserMimateEntity>,
      );
      const buffer = await sharp({
        create: { width: 2, height: 2, channels: 3, background: 'red' },
      })
        .png()
        .toBuffer();
      await expect(
        service.upload({
          buffer,
          originalname: 'test.png',
          mimetype: 'image/png',
        } as Express.Multer.File),
      ).rejects.toMatchObject({
        status: 503,
        message: 'Missing S3_BUCKET configuration.',
      });
      expect(save).not.toHaveBeenCalled();
    } finally {
      process.env = original;
    }
  });

  it('logs only an error type/code for failed uploads without leaking SQL or secrets', () => {
    const log = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const error = Object.assign(new Error('SQL containing private-secret'), {
      name: 'QueryFailedError',
      driverError: { code: 'ER_BAD_FIELD_ERROR', sql: 'private SQL' },
    });
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ originalUrl: '/upload/image' }),
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;
    new AllExceptionsFilter().catch(error, host);
    expect(status).toHaveBeenCalledWith(500);
    expect(log).toHaveBeenCalledWith(
      'Shared upload failed: name=QueryFailedError code=ER_BAD_FIELD_ERROR',
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('private');
    expect(json).toHaveBeenCalledWith({
      success: false,
      alert: { code: 500, message: 'Something went wrong' },
      data: null,
    });
  });
  it.each(['audio/mp4', 'audio/mp4a-latm', 'audio/x-m4a', 'audio/m4a'])(
    'accepts M4A container content with %s and stores canonical audio/mp4',
    async (mime) => {
      const original = process.env;
      process.env = {
        S3_BUCKET: 'test-public',
        S3_ACCESS_KEY: 'synthetic',
        S3_SECRET_KEY: 'synthetic',
        BASE_URL: 'https://api.example.test',
      };
      try {
        const send = jest
          .spyOn(S3Client.prototype, 'send')
          .mockResolvedValue({} as never);
        const save = jest.fn(async (asset) => ({ ...asset, id: 1 }));
        const service = new UploadService(
          { save, update: jest.fn() } as unknown as Repository<AssetsEntity>,
          {} as Repository<UserMimateEntity>,
        );
        const buffer = Buffer.alloc(24);
        buffer.writeUInt32BE(24, 0);
        buffer.write('ftypM4A ', 4);
        const result = await service.upload({
          buffer,
          originalname: 'recording.m4a',
          mimetype: mime,
        } as Express.Multer.File);
        const command = send.mock.calls[0][0] as PutObjectCommand;
        expect(command.input.ContentType).toBe('audio/mp4');
        expect(command.input.Key).toMatch(/^[a-f0-9-]+\.m4a$/);
        expect(result.type).toBe('Audio');
        expect(result.contentType).toBe('audio/mp4');
        await expect(
          service.upload({
            buffer: Buffer.from('invalid audio'),
            originalname: 'fake.m4a',
            mimetype: mime,
          } as Express.Multer.File),
        ).rejects.toMatchObject({ status: 400 });
        expect(send).toHaveBeenCalledTimes(1);
      } finally {
        process.env = original;
      }
    },
  );
});
