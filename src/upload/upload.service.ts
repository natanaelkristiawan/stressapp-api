import { S3Client, PutObjectCommandInput, PutObjectCommand, GetObjectCommand, GetObjectCommandInput, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { AssetsEntity } from 'src/entity/asset.entity';
import { IsNull, Not, Repository } from 'typeorm';
import * as sharp from 'sharp';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import { lookup as mimeLookup } from 'mime-types';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { storageConfig, objectUrl } from './storage-config';


@Injectable()
export class UploadService {

    private storageSettings?: ReturnType<typeof storageConfig>;
    private storageClient?: S3Client;
    /** Validates storage lazily. Returns cached settings without blocking unrelated API startup. */
    private get storage(): ReturnType<typeof storageConfig> {
        return this.storageSettings ?? (this.storageSettings = storageConfig(process.env));
    }
    /** Reuses one configured client. Returns the MinIO S3 client. */
    private get s3(): S3Client {
        return this.storageClient ?? (this.storageClient = new S3Client(this.storage.client));
    }
    /** Returns the configured bucket name. */
    private get bucket(): string { return this.storage.bucket; }
    /** Returns the configured API delivery origin. */
    private get baseUrl(): string { return this.storage.baseUrl; }
    /** Returns the configured MinIO URL for existing public asset responses. */
    private publicUrl(key: string): string {
        return objectUrl(this.storage.endpointUrl, this.bucket, key);
    }
    constructor(
        @InjectRepository(AssetsEntity, 'mimate')
        private assetRepository: Repository<AssetsEntity>,

        @InjectRepository(UserMimateEntity, 'mimate')
        private userMimateRepository: Repository<UserMimateEntity>,
    ){

    }


    async upload(file: Express.Multer.File, assetID?:number): Promise<any> {
        const isImage = file.mimetype.startsWith('image/');
        const isVideo = file.mimetype.startsWith('video/');
        const isLottie =
            file.mimetype === 'application/json' ||
            file.mimetype === 'application/zip' ||
            file.originalname.toLowerCase().endsWith('.json') ||
            file.originalname.toLowerCase().endsWith('.lottie');

        const folder = isImage ? 'images' : isVideo ? 'videos' : isLottie ? 'lotties' : 'files';
        const key = `mimate/${folder}/${Date.now()}-${randomUUID()}-${file.originalname}`;

        let modeInsert:boolean = false;

        let contentType = file.mimetype;
        if (file.originalname.toLowerCase().endsWith('.json')) {
            contentType = 'application/json';
        }

        const params: PutObjectCommandInput = {
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: contentType,
        };

        // generate uuid
        const mediaId = uuidv4();
      
        let response = await this.s3.send(new PutObjectCommand(params));

        const url_open = this.publicUrl(key);

        // check if url_old is not null
        let url = `${this.baseUrl}/upload/files/${mediaId}`;

        let width: number | null = null;
        let height: number | null = null;
      
        if (isImage) {
          try {
            const metadata = await sharp(file.buffer).metadata();
            width = metadata.width ?? null;
            height = metadata.height ?? null;
          } catch (error) {
          }
        }
      
        const type = isImage ? 'Image' : isVideo ? 'Video' : isLottie ? 'Lottie' : 'unknown';

        let dateCurl = new Date()
        let utc7 = new Date(dateCurl.toLocaleString('en-US', { timeZone: 'Asia/Makassar' }));

        let insert = new AssetsEntity()
        insert.url = url;
        insert.created_at = utc7;
        insert.type = type;
        insert.path = key;
        insert.mediaId = mediaId;
        insert.url_open = url_open;
        insert.url_old = url;
        insert.mediaId = mediaId;

        // find asset ID
        if(assetID){
          let asset = await this.assetRepository.findOne({where:{id:assetID}})
          if(asset){
            url = `${this.baseUrl}/upload/files/${asset.mediaId}`;
            insert.id = asset.id;
            insert.url = url;
            insert.created_at = asset.created_at;
            insert.type = asset.type;
            insert.url_open = url_open;
            insert.url_old = asset.url;
            insert.mediaId = asset.mediaId;
            modeInsert = false;
          }
        }

       let asset =  await this.assetRepository.save(insert)


        let info = {
              __typename: type,
              id: asset.id,
              url: url,
              width:  width ? width : null,
              height: height ? height : null,
          }
        
          // update info
        await this.assetRepository.update({id:asset.id}, {info:JSON.stringify(info)})
      
        return {
          mediaId: mediaId,
          type: type,
          width: width ? width : null,
          height: height ? height : null,
          url: url_open,
          path: key,
          id: asset.id, // Replace with actual DB ID if needed
        };
    }


    async uploadFiles(files: { image?: Express.Multer.File; video?: Express.Multer.File }) {
        const results: Record<string, any> = {};
        let videoUrl:string;
        let videoKey:string;
        let videoUrlOpen:string;
        // generate uuid
        const mediaId = uuidv4();
        if (files.image) {
          const imageFile = files.image;
          const imageKey = `mimate/images/${Date.now()}-${randomUUID()}-${imageFile.originalname}`;
      
          const imageParams: PutObjectCommandInput = {
            Bucket: this.bucket,
            Key: imageKey,
            Body: imageFile.buffer,
            ContentType: imageFile.mimetype,
          };
       
      
          await this.s3.send(new PutObjectCommand(imageParams));
          const url_open = this.publicUrl(imageKey);
          const url = `${this.baseUrl}/upload/files/${mediaId}`;
          const metadata = await sharp(imageFile.buffer).metadata();
          results.image = {
            type: 'Image',
            width: metadata.width ?? null,
            height: metadata.height ?? null,
            url: url,
            url_new: url,
            url_open: url_open,
          };
        }
      
        if (files.video) {
          const videoFile = files.video;
          videoKey = `mimate/videos/${Date.now()}-${randomUUID()}-${videoFile.originalname}`;
      
          const videoParams: PutObjectCommandInput = {
            Bucket: this.bucket,
            Key: videoKey,
            Body: videoFile.buffer,
            ContentType: videoFile.mimetype,
          };
     
          await this.s3.send(new PutObjectCommand(videoParams));
          videoUrlOpen = this.publicUrl(videoKey);
          videoUrl = `${this.baseUrl}/upload/files/${mediaId}`;


          
          results.video = {
            type: 'Video',
            width: null,
            height: null,
            url: videoUrl,
            url_open: videoUrlOpen,
            url_new: videoUrl,
          };
        }

        let dateCurl = new Date()
        let utc7 = new Date(dateCurl.toLocaleString('en-US', { timeZone: 'Asia/Makassar' }));

        let insert:AssetsEntity = {
            url: videoUrl,
            mediaId: mediaId,
            path: videoKey,
            url_open: videoUrlOpen,
            url_old: videoUrl,
            created_at:utc7,
            type: 'Video'
        }

        let asset =  await this.assetRepository.save(insert)
        let info = {
            __typename: 'Video',
            id: asset.id,
            url: videoUrl,
            thumbnail: results.image
        }
        await this.assetRepository.update({id:asset.id}, {info:JSON.stringify(info)})
      
        return {
            type:'Video',
            url:videoUrlOpen,
            thumbnail: results.image,
            id: asset.id, // Replace with actual DB ID if needed
        };
      }

    async streamFile(
        mediaId: string,
        rangeHeader?: string,
      ): Promise<{
        stream: Readable;
        filename: string;
        contentType: string;
        contentLength: number;
        start: number;
        end: number;
      }> {
        const dataFile = await this.assetRepository.findOne({
          where: { mediaId },
        });
      
        if (!dataFile) {
          throw new NotFoundException('File not found');
        }
      
        const filename = dataFile.path;
        const contentType = mimeLookup(filename) || 'application/octet-stream';
      
        // HEAD request to get total content length
        const headCommand = new HeadObjectCommand({
          Bucket: this.bucket,
          Key: filename,
        });
      
        const headResult = await this.s3.send(headCommand);
        const contentLength = headResult.ContentLength ?? 0;
      
        let start = 0;
        let end = contentLength - 1;
      
        const range = rangeHeader?.replace(/bytes=/, '').split('-');
        if (rangeHeader && contentType.startsWith('video/') && range.length > 0) {
          start = parseInt(range[0], 10);
          end = range[1] ? parseInt(range[1], 10) : end;
        }
      
        const getCommand = new GetObjectCommand({
          Bucket: this.bucket,
          Key: filename,
          Range: `bytes=${start}-${end}`,
        });
      
        const response = await this.s3.send(getCommand);
      
        return {
          stream: response.Body as Readable,
          filename,
          contentType,
          contentLength,
          start,
          end,
        };
      }
      


    async getAllFiles(): Promise<boolean> {
      const files = await this.assetRepository.find({
        where: {
          url_old: IsNull()
        },
      });

      // check in path is exist or not
      for (const file of files) {
        // file in root directory
        const path = `./assets/${file.path}`;
        const exists = fs.existsSync(path);

        if(exists){
          const fileStream = fs.createReadStream(path);
          const buffer = fs.readFileSync(path);
          const mimetype = mimeLookup(path) || 'application/octet-stream';

          if (!mimetype.startsWith('image/') && !mimetype.startsWith('video/')) {
            console.warn(`⚠️ Skipping unsupported mime type: ${file.path} (${mimetype})`);
            continue;
          }

          const fakeFile: Express.Multer.File = {
            fieldname: 'file',
            originalname: file.path,
            encoding: '7bit',
            mimetype: mimetype,
            size: buffer.length,
            buffer: buffer,
            destination: '',
            filename: '',
            path: '',
            stream: fileStream,
          };

          await this.upload(fakeFile, file.id)
        } else {
        }
        


        
      }

      return true;
    }


    // service to upload photoprofile
    async uploadPhotoprofile(): Promise<any> {
      // get all user mimate
      const users = await this.userMimateRepository
      .createQueryBuilder('user')
      .where('user.profilePictureUrl_new IS NULL')
      .andWhere('user.profilePictureUrl_bak IS NOT NULL')
      .andWhere('user.profilePictureUrl_bak != \'\'')
      .getMany();

      // check in path is exist or not
      for (const user of users) {
        if(user.profilePictureUrl_bak == ""){
          continue;
        }
        // file in root directory
        const path = `./photoprofile/${user.image_path}`;
        const exists = fs.existsSync(path);

        if(exists){
          const fileStream = fs.createReadStream(path);
          const buffer = fs.readFileSync(path);
          const mimetype = mimeLookup(path) || 'application/octet-stream';

          if (!mimetype.startsWith('image/') && !mimetype.startsWith('video/')) {
            console.warn(`⚠️ Skipping unsupported mime type: ${user.profilePictureUrl_bak} (${mimetype})`);
            continue;
          }

          const fakeFile: Express.Multer.File = {
            fieldname: 'file',
            originalname: user.image_path,
            encoding: '7bit',
            mimetype: mimetype,
            size: buffer.length,
            buffer: buffer,
            destination: '',
            filename: '',
            path: '',
            stream: fileStream,
          };

          let response = await this.upload(fakeFile)


          // update profilePictureUrl_new
          await this.userMimateRepository.update(user.id, {profilePictureUrl_new: response.url})
        } else {
        }
        


        
      }
    }
}
