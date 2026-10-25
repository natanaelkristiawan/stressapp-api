import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { BreathingPageDto } from '../breathing/breathing.dto';

@Entity('breathing_page')
export class BreathingPage {
  @PrimaryColumn({ type: 'tinyint' }) id: number;
  @Column({ type: 'json' }) content: Omit<BreathingPageDto, 'revision'>;
  @Column({ default: 1 }) revision: number;
}
