import { Type, Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class LocationInputDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(180) name: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) branch: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(80) city: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(2000) address: string;
  @IsString() @Matches(/^0\d{8,14}$|^62\d{8,13}$/) phone: string;
  @IsIn(['whatsapp', 'telephone']) contactType: 'whatsapp' | 'telephone';
  @Transform(trim) @IsString() @MaxLength(300) contactNotes: string;
  @Transform(trim) @IsString() @MaxLength(2048) website: string;
  @IsIn(['onsite', 'online']) serviceMode: 'onsite' | 'online';
  @ValidateIf((_object, value) => value !== null)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number | null;
  @ValidateIf((_object, value) => value !== null)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number | null;
  @IsIn(['draft', 'published']) status: 'draft' | 'published';
}
export class UpdateLocationDto extends LocationInputDto {
  @IsInt() @Min(1) revision: number;
}
export class LocationIdDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(2147483647) id: number;
}
export class LocationListDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) search = '';
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) city = '';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @IsOptional() @IsIn(['name', 'city']) sort: 'name' | 'city' = 'name';
  @IsOptional() @IsIn(['asc', 'desc']) order: 'asc' | 'desc' = 'asc';
  @IsOptional() @IsIn(['draft', 'published']) status?: 'draft' | 'published';
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
export class LocationImportDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/) expectedHash: string;
}

export class DeleteLocationDto {
  @IsInt() @Min(1) @Max(2147483647) revision: number;
}
