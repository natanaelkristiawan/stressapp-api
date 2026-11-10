import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class LevelNumberParamDto {
  @ApiProperty({ description: 'Nomor Level (1, 2, 3, 4)', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  level: number;
}

export class GameKeyParamDto {
  @ApiProperty({
    description: 'Unique slug key dari game misi',
    example: 'aktivitas-harian',
  })
  @IsString()
  @IsNotEmpty()
  gameKey: string;
}

export class GameAttachmentDto {
  @ApiProperty({ enum: ['image', 'audio'], example: 'image' })
  @IsIn(['image', 'audio'])
  type: 'image' | 'audio';

  @ApiProperty({
    description: 'URL file lampiran yang sudah diunggah',
    example: 'https://storage.example.com/games/photo123.jpg',
  })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({
    description: 'Durasi audio dalam detik (jika rekaman suara)',
    example: 45,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;
}

export class SubmitGameMissionDto {
  @ApiPropertyOptional({
    description: 'Nilai slider keyakinan member (0 - 100)',
    example: 85,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  confidenceScore?: number;

  @ApiPropertyOptional({
    description: 'Catatan teks refleksi atau deskripsi aktivitas',
    example: 'Hari ini saya berjalan santai keliling komplek rumah selama 20 menit.',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Daftar lampiran foto atau rekaman audio',
    type: [GameAttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GameAttachmentDto)
  attachments?: GameAttachmentDto[];

  @ApiPropertyOptional({
    description: 'Daftar jawaban list input (misalnya 5 rasa syukur)',
    type: [String],
    example: [
      'Nasi goreng enak',
      'Cuaca cerah',
      'Tidur nyenyak',
      'Teman menyapa',
      'Kopi pagi hangat',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  listAnswers?: string[];

  @ApiPropertyOptional({
    description: 'Jawaban dari popup pertanyaan reflektif',
    example: 'Saya merasa lebih segar dan bersyukur atas hal kecil.',
  })
  @IsOptional()
  @IsString()
  reflectiveAnswer?: string;
}

