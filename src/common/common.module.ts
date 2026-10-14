import { Global, Module } from '@nestjs/common';
import { DateHelper } from './helpers/date.helper';

@Global()
@Module({
  providers: [DateHelper],
  exports: [DateHelper],
})
export class CommonModule {}
