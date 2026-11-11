import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { GameStepLayout } from '../../entity/game-step.entity';

export class GameIdParamDto {
  @ApiProperty({ description: 'Game ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}

export class LevelIdParamDto {
  @ApiProperty({ description: 'Level ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}

export class UpdateGameLevelDto {
  @ApiPropertyOptional({
    description: 'Judul level',
    example: 'Level 1 - Eksplorasi Diri',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({
    description: 'Deskripsi HTML target misi',
    example: '<p>Tujuan level ini adalah mengenal diri sendiri...</p>',
  })
  @IsOptional()
  @IsString()
  targetDescription?: string;

  @ApiPropertyOptional({
    description: 'Status aktif level',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateGameStepDto {
  @ApiPropertyOptional({ description: 'ID langkah jika update', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @ApiProperty({ description: 'Urutan langkah', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  stepOrder: number;

  @ApiProperty({
    description: 'Layout tampilan langkah',
    enum: [
      'detail',
      'convident',
      'post',
      'post-with-video',
      'post-with-popup',
      'list-input',
    ],
    example: 'detail',
  })
  @IsIn([
    'detail',
    'convident',
    'post',
    'post-with-video',
    'post-with-popup',
    'list-input',
  ])
  layout: GameStepLayout;

  @ApiProperty({
    description: 'Judul badge langkah',
    example: 'Misi 1: Kenali Diri',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title: string;

  @ApiProperty({
    description: 'Deskripsi utama langkah',
    example: 'Tuliskan hal-hal yang Anda rasakan hari ini.',
  })
  @IsString()
  @MinLength(1)
  description: string;

  @ApiPropertyOptional({
    description: 'Paragraf deskripsi tambahan pada baris baru',
    example: 'Ini adalah paragraf kedua.',
  })
  @IsOptional()
  @IsString()
  descriptionExtra?: string;

  @ApiPropertyOptional({
    description: 'Instruksi tindakan misi',
    example: 'Ambil foto hal yang membuat Anda bersyukur.',
  })
  @IsOptional()
  @IsString()
  instruction?: string;

  @ApiPropertyOptional({
    description: 'URL video YouTube atau file media (untuk layout video)',
    example: 'https://www.youtube.com/watch?v=O4c8VR5hJaw',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  videoUrl?: string;

  @ApiPropertyOptional({
    description: 'Format sumber video: youtube atau self',
    enum: ['self', 'youtube'],
    example: 'youtube',
  })
  @IsOptional()
  @IsIn(['self', 'youtube'])
  videoSource?: 'self' | 'youtube';

  @ApiPropertyOptional({
    description: 'URL custom thumbnail untuk video edukasi',
    example: 'https://cdn.example.com/thumbnails/game-video-thumb.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Judul popup modal reflektif',
    example: 'Pertanyaan Reflektif',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  reflectiveTitle?: string;

  @ApiPropertyOptional({
    description: 'Pertanyaan refleksi yang muncul pada popup modal',
    example: 'Apa yang Anda rasakan setelah melakukan tindakan ini?',
  })
  @IsOptional()
  @IsString()
  reflectiveQuestion?: string;
}

export class CreateGameDto {
  @ApiProperty({
    description: 'ID Level yang menaungi game ini',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  levelId: number;

  @ApiProperty({
    description: 'Slug unik game',
    example: 'eksplorasi-diri',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  key: string;

  @ApiProperty({
    description: 'Nama tampilan misi',
    example: 'Eksplorasi Diri',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    description: 'Urutan tampilan dalam level',
    default: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex?: number = 0;

  @ApiPropertyOptional({
    description: 'Pesan sukses setelah menyelesaikan misi',
    example: 'Selamat Anda telah menyelesaikan tantangan ini!',
  })
  @IsOptional()
  @IsString()
  successMessage?: string;

  @ApiPropertyOptional({
    description: 'Apakah ada level berikutnya setelah level ini',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  haveNextLevel?: boolean = true;

  @ApiPropertyOptional({
    description: 'Reward poin misi',
    default: 50,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pointsReward?: number = 50;

  @ApiPropertyOptional({
    description: 'Status publikasi',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean = true;

  @ApiProperty({
    description: 'Daftar langkah-langkah misi berurutan',
    type: [CreateGameStepDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGameStepDto)
  steps: CreateGameStepDto[];
}

export class UpdateGameDto {
  @ApiPropertyOptional({
    description: 'ID Level yang menaungi game ini',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  levelId?: number;

  @ApiPropertyOptional({
    description: 'Slug unik game',
    example: 'eksplorasi-diri',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  key?: string;

  @ApiPropertyOptional({
    description: 'Nama tampilan misi',
    example: 'Eksplorasi Diri',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'Urutan tampilan dalam level',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({
    description: 'Pesan sukses setelah menyelesaikan misi',
    example: 'Selamat Anda telah menyelesaikan tantangan ini!',
  })
  @IsOptional()
  @IsString()
  successMessage?: string;

  @ApiPropertyOptional({
    description: 'Apakah ada level berikutnya setelah level ini',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  haveNextLevel?: boolean;

  @ApiPropertyOptional({
    description: 'Reward poin misi',
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pointsReward?: number;

  @ApiPropertyOptional({
    description: 'Status publikasi',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({
    description: 'Daftar langkah-langkah misi jika ingin diperbarui sekaligus',
    type: [CreateGameStepDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGameStepDto)
  steps?: CreateGameStepDto[];
}

export class AdminGameListQueryDto {
  @ApiPropertyOptional({
    description: 'Filter level number (1, 2, 3, 4)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  level?: number;

  @ApiPropertyOptional({
    description: 'Filter status publikasi',
    enum: ['all', 'published', 'draft'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'published', 'draft'])
  status?: 'all' | 'published' | 'draft' = 'all';

  @ApiPropertyOptional({
    description: 'Pencarian nama atau slug misi',
    example: 'eksplorasi',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Nomor halaman',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Jumlah item per halaman',
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class AdminGameSubmissionsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter berdasarkan ID Game',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  gameId?: number;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan ID Member',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  memberId?: number;

  @ApiPropertyOptional({
    description: 'Pencarian nama/email member atau nama game',
    example: 'natan',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Nomor halaman',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Jumlah item per halaman',
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

