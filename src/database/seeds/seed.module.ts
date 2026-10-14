import { AppDataSource } from '../data-source';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Quest } from 'src/entity/quest.entity';

@Module({
    imports: [
        ConfigModule.forRoot({ envFilePath: ['.env'], isGlobal: true }),
        // Standalone seed command shares the local datasource entity filtering.
        TypeOrmModule.forRoot({ ...AppDataSource.options, name: 'mimate', synchronize: false }),
        TypeOrmModule.forFeature([Quest], 'mimate'),
    ],
    providers: [SeedService],
})
export class SeedModule { }
