import { Module } from '@nestjs/common';
import { AdminHighlightService } from './admin-highlight.service';
import { AdminHighlightController } from './admin-highlight.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Highlight } from '../entity/highlights.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Highlight], 'mimate')], 
  providers: [AdminHighlightService],
  controllers: [AdminHighlightController]
})
export class AdminHighlightModule {}
