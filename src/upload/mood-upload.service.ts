import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import * as sharp from 'sharp';
import { MoodAttachment } from '../entity/mood-attachment.entity';
import { objectUrl, storageConfig } from './storage-config';

/** Recognizes supported audio containers without trusting filenames. Returns canonical MIME or throws 400. */
export function audioContentType(buffer: Buffer, mime: string): string {
  const isMp4 =
    buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp';
  const isWebm =
    buffer.length >= 4 &&
    buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  const isOgg = buffer.toString('ascii', 0, 4) === 'OggS';
  const isWav =
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WAVE';
  const isMp3 =
    buffer.toString('ascii', 0, 3) === 'ID3' ||
    (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
  if (isMp4 && ['audio/mp4', 'audio/x-m4a', 'audio/m4a'].includes(mime))
    return 'audio/mp4';
  if (isWebm && mime === 'audio/webm') return 'audio/webm';
  if (isOgg && mime === 'audio/ogg') return 'audio/ogg';
  if (isWav && ['audio/wav', 'audio/x-wav'].includes(mime)) return 'audio/wav';
  if (isMp3 && mime === 'audio/mpeg') return 'audio/mpeg';
  throw new BadRequestException('Format audio tidak didukung.');
}

@Injectable()
export class MoodUploadService {
  private client?: S3Client;
  /** Injects the shared datasource. Returns member-media operations. */
  constructor(@InjectDataSource('mimate') private readonly db: DataSource) {}

  /** Validates shared storage settings. Returns one cached S3 client and the public upload bucket. */
  private storage() {
    try {
      const settings = storageConfig(process.env);
      return {
        client: this.client ?? (this.client = new S3Client(settings.client)),
        bucket: settings.bucket,
      };
    } catch {
      throw new ServiceUnavailableException('Penyimpanan belum tersedia.');
    }
  }

  /** Validates and stores one public image/audio object. Returns owner metadata and a permanent URL. */
  async upload(
    memberId: number,
    type: 'photo' | 'audio',
    file?: Express.Multer.File,
  ) {
    const maximum = (type === 'photo' ? 5 : 10) * 1024 * 1024;
    if (!file?.buffer?.length || file.buffer.length > maximum)
      throw new BadRequestException('File kosong atau terlalu besar.');
    let buffer = file.buffer;
    let contentType: string;
    if (type === 'photo') {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
        throw new BadRequestException('Format gambar tidak didukung.');
      try {
        // Decode/re-encode a single frame, stripping EXIF/location metadata and bounding pixels.
        const decoder = sharp(buffer, { limitInputPixels: 16000000 });
        const metadata = await decoder.metadata();
        const format = metadata.format;
        if (format !== 'jpeg' && format !== 'png' && format !== 'webp')
          throw new Error();
        buffer = await decoder.rotate().toFormat(format).toBuffer();
        contentType = `image/${format}`;
      } catch {
        throw new BadRequestException('Gambar tidak valid.');
      }
      if (buffer.length > maximum)
        throw new BadRequestException('Gambar terlalu besar.');
    } else {
      contentType = audioContentType(
        buffer,
        file.mimetype.split(';')[0].trim(),
      );
    }
    const { client, bucket } = this.storage();
    const id = randomUUID();
    const extensions: Record<string, string[]> = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'audio/mp4': ['.m4a', '.mp4'],
      'audio/webm': ['.webm'],
      'audio/ogg': ['.ogg'],
      'audio/wav': ['.wav'],
      'audio/mpeg': ['.mp3'],
    };
    const allowed = extensions[contentType];
    const originalExtension = extname(file.originalname || '').toLowerCase();
    const extension = allowed.includes(originalExtension)
      ? originalExtension
      : allowed[0];
    const key = `${id}${extension}`;
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=86400',
        }),
      );
    } catch {
      throw new ServiceUnavailableException('Unggah gagal. Silakan coba lagi.');
    }
    let attachment: MoodAttachment;
    try {
      attachment = await this.db.getRepository(MoodAttachment).save({
        id,
        memberId,
        type,
        bucket,
        key,
        contentType,
        size: buffer.length,
        createdAt: new Date(),
      });
    } catch (error) {
      // Best-effort cleanup of an object whose database registration failed; never log its content.
      await client
        .send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
        .catch(() => undefined);
      throw error;
    }
    return this.view(attachment);
  }

  /** Resolves only attachments belonging to the actor. Returns 404 for absent/foreign IDs. */
  async owned(
    memberId: number,
    ids: string[],
    manager: EntityManager = this.db.manager,
  ): Promise<MoodAttachment[]> {
    if (!ids.length) return [];
    const rows = await manager
      .getRepository(MoodAttachment)
      .createQueryBuilder('attachment')
      .where('attachment.memberId = :memberId', { memberId })
      .andWhere('attachment.id IN (:...ids)', { ids })
      .getMany();
    if (rows.length !== ids.length)
      throw new NotFoundException('Lampiran tidak ditemukan.');
    return ids.map((id) => rows.find((row) => row.id === id));
  }

  /** Builds a permanent public media URL. Returns metadata without credentials or a separate owner ID. */
  async view(attachment: MoodAttachment) {
    const settings = storageConfig(process.env);
    const url = objectUrl(
      settings.endpointUrl,
      attachment.bucket,
      attachment.key,
    );
    return {
      id: attachment.id,
      type: attachment.type,
      contentType: attachment.contentType,
      size: attachment.size,
      url,
      expiresAt: null,
    };
  }

  /** Resolves an owned attachment URL. Returns 404 for foreign attachment metadata. */
  async detail(memberId: number, id: string) {
    const [attachment] = await this.owned(memberId, [id]);
    return this.view(attachment);
  }
}
