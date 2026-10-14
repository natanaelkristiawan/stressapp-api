import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Quest } from 'src/entity/quest.entity';

@Module({
    imports: [
        ConfigModule.forRoot({ envFilePath: ['.env'], isGlobal: true }),
        TypeOrmModule.forRoot({
            name: 'mimate',
            type: 'mysql',
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE_MIMATE,
            // Auto-loads all entities so you don't have to list relations manually:
            entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
        }),
        TypeOrmModule.forFeature([Quest], 'mimate'),
    ],
    providers: [SeedService],
})
export class SeedModule { }
