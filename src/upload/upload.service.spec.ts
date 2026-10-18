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
});
