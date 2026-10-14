import { Module } from '@nestjs/common';
import { HighlightController } from './highlight.controller';
import { HighlightService } from './highlight.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Highlight } from 'src/entity/highlights.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Highlight], 'mimate')],
  controllers: [HighlightController],
  providers: [HighlightService]
})
export class HighlightModule {}
