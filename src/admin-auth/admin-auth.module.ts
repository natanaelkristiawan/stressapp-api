import { Module } from '@nestjs/common';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAdmin } from 'src/entity/user-admin.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([UserAdmin], 'mimate'),
  JwtModule.registerAsync({
    imports: [ConfigModule],
    useFactory: async (config: ConfigService) => ({
      secret: config.get<string>('JWT_SECRET'),
      signOptions: {  algorithm: 'HS256' },
    }),
    inject: [ConfigService],
  })],
  controllers: [AdminAuthController],
  providers: [AdminAuthService]
})
export class AdminAuthModule {}
