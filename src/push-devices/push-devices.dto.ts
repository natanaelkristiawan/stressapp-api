import { IsIn, IsString, Length, Matches } from 'class-validator';

export class PushPlatformDto {
  @IsIn(['android', 'ios', 'web']) platform: 'android' | 'ios' | 'web';
}
export class SavePushDeviceDto extends PushPlatformDto {
  @IsIn(['fcm', 'apns']) provider: 'fcm' | 'apns';
  @IsString()
  @Length(20, 4096)
  @Matches(/^[a-zA-Z0-9_:~%.+\-]+$/)
  token: string;
}
