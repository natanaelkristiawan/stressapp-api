import { BadRequestException, Controller, Get, Param, Post, Req, Res, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { UploadService } from './upload.service';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiConsumes, ApiBody, ApiResponse, ApiBearerAuth, ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import * as multer from 'multer';
import { Request, Response } from 'express';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { AssetsEntity } from 'src/entity/asset.entity';

@Controller('upload')
@ApiTags('UPLOAD')
@ApiBearerAuth('access-token')
export class UploadController {

    constructor(
        private uploadService : UploadService
    ) {}

    // upload video
    @Post('image')
    @ApiOperation({summary: 'Upload File'})
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Upload file with optional metadata',
        schema: {
        type: 'object',
        properties: {
            file: {
            type: 'string',
            format: 'binary',
            }
        },
        },
    })

    @ApiResponse({status: 201, description: "Success result", example: {
        "success": true,
        alert : {
            "code" : 201,
            "message": "Files uploaded successfully",
          },
        "data": {
        "type": "Image",
        "width": 541,
        "height": 581,
        "url": "https://yes.sgp1.digitaloceanspaces.com/images/1744091271963-73d8be62-d973-4de0-9ca0-42661f79bde5-gpt-baithani-logo.png",
        "id": 23988
        }
    }})

    @ApiResponse({ status: 500, description: 'Sample error message', example : {
        success: false,
        message: "Internal Server Error",
        errorCode: 500,
        data: {}
    } })
    @UseInterceptors(
        FileInterceptor('file', {
        storage: multer.memoryStorage(),
        fileFilter: (req, file, cb) => {
            const isImage = file.mimetype.startsWith('image/');
            const isVideo = file.mimetype.startsWith('video/');
            const isLottie =
                file.mimetype === 'application/json' ||
                file.mimetype === 'application/zip' ||
                file.originalname.toLowerCase().endsWith('.json') ||
                file.originalname.toLowerCase().endsWith('.lottie');

            if (!isImage && !isVideo && !isLottie) {
                return cb(new BadRequestException('Only image, video, and lottie (.json, .lottie) files are allowed!'), false);
            }
            cb(null, true);
        },
        limits: {
            fileSize: 5 * 1024 * 1024, // 5 MB limit
        },
        }),
    )
    async uploadImage(@UploadedFile() file: Express.Multer.File) {
        const data = await this.uploadService.upload(file);
        
        return {
        message: 'Image uploaded successfully',
        data,
        };
    }

    @Post('video')
    @ApiOperation({ summary: 'Upload Image and Video Files' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Upload image and video file',
        schema: {
        type: 'object',
        properties: {
            image: {
            type: 'string',
            format: 'binary',
            },
            video: {
            type: 'string',
            format: 'binary',
            },
        },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Upload Image and Video',
        example: {
        "success": true,
        alert : {
            "code" : 201,
            "message": "Files uploaded successfully",
          },
      
        "data": {
            "type": "Video",
            "url": "https://yes.sgp1.digitaloceanspaces.com/videos/1744154042134-27119409-3f49-4238-84dd-8ecf6ee6b20d-1744092450810-3599302c-7dec-48d8-a5a4-3136df5f54cd-file_example_MOV_1920_2_2MB.mov",
            "thumbnail": {
            "type": "Image",
            "width": 541,
            "height": 581,
            "url": "https://yes.sgp1.digitaloceanspaces.com/images/1744154041122-aec10b15-9fd6-4837-9252-113a256f6e6d-gpt-baithani-logo.png"
            },
            "id": 23992
        }
        },
    })
    @ApiResponse({
        status: 500,
        description: "Success result",
        example: {
        success: false,
        message: 'Internal Server Error',
        errorCode: 500,
        data: {},
        },
    })
    @UseInterceptors(
        FileFieldsInterceptor(
        [
            { name: 'image', maxCount: 1 },
            { name: 'video', maxCount: 1 },
        ],
        {
            storage: multer.memoryStorage(),
            fileFilter: (req, file, cb) => {
            const isImage = file.fieldname === 'image' && file.mimetype.startsWith('image/');
            const isVideo = file.fieldname === 'video' && file.mimetype.startsWith('video/');

            if (!isImage && !isVideo) {
                return cb(
                new BadRequestException('Only image and video files are allowed!'),
                false,
                );
            }

            const maxImageSize = 10 * 1024 * 1024; // 10MB
            const maxVideoSize = 100 * 1024 * 1024; // 100MB

            if (isImage && file.size > maxImageSize) {
                return cb(new BadRequestException('Image file size must be less than 10MB'), false);
            }

            if (isVideo && file.size > maxVideoSize) {
                return cb(new BadRequestException('Video file size must be less than 100MB'), false);
            }

            cb(null, true);
            },
            limits: {
            fileSize: 100 * 1024 * 1024, // cap overall file upload size
            },
        },
        ),
    )
    async uploadFiles(@UploadedFiles() files: { image?: Express.Multer.File[]; video?: Express.Multer.File[] }) {
        const image = files.image?.[0];
        const video = files.video?.[0];

        const data = await this.uploadService.uploadFiles({ image, video });

        return {
        success: true,
        message: 'Files uploaded successfully',
        data,
        };
    }


    @Get('files/:mediaId')
    @ApiExcludeEndpoint()
    async streamFile(
      @Param('mediaId') mediaId: string,
      @Req() req: Request,
      @Res() res: Response,
    ) {
      const range = req.headers.range;
      const { stream, filename, contentLength, contentType, start, end } =
        await this.uploadService.streamFile(mediaId, range);
    
      res.setHeader('Content-Type', contentType);
    
      if (range && contentType.startsWith('video/')) {
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${contentLength}`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', end - start + 1);
      } else {
        res.status(200);
        res.setHeader('Content-Length', contentLength);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      }
    
      stream.pipe(res);
    }


    // get all files in assets folder
    @Get('files')
    @ApiOperation({ summary: 'Get All Files' })
    @ApiResponse({
        status: 200,
        description: 'Get All Files',
        example: {
            message: 'Files fetched successfully',
            data: []
        }
    })
    async getAllFiles(): Promise<GlobalResponse<boolean>> {
        const files = await this.uploadService.getAllFiles();
        return {
            message: 'Files fetched successfully',
            data: true
        }
    }

    // backup photoprofile
    @Post('backup-photoprofile')
    @ApiOperation({ summary: 'Backup Photoprofile' })
    async backupPhotoprofile(): Promise<GlobalResponse<boolean>> {
        const result = await this.uploadService.uploadPhotoprofile();
        return {
            message: 'Photoprofile backuped successfully',
            data: true
        }
    }
}