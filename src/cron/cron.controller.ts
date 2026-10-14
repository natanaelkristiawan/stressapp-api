import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBasicAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { CronService } from './cron.service';
import { BasicAuthGuard } from './guards/basic-auth.guard';
import { CronExecutionResultInterface } from './interfaces/cron.interface';

@Controller('cron')
@ApiTags('CRON')
@ApiBasicAuth()
@UseGuards(BasicAuthGuard)
export class CronController {
  constructor(private readonly cronService: CronService) {}

  @Get('daily-hof')
  @ApiOperation({
    summary: 'Manually trigger Daily Hall of Fame (HOF) generation',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily HOF generation executed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized / Invalid Basic Auth credentials',
  })
  async triggerDailyHof(): Promise<
    GlobalResponse<CronExecutionResultInterface>
  > {
    const details = await this.cronService.handleDailyHofGeneration();
    return {
      message: 'Daily Hall of Fame generation triggered successfully',
      data: {
        executedAt: new Date().toISOString(),
        status: 'SUCCESS',
        details,
      },
    };
  }

  @Get('leaderboard-validate')
  @ApiOperation({
    summary:
      'Compare current-month history, accumulated scores, and Redis (operational check)',
  })
  async validateLeaderboard() {
    return {
      message: 'Leaderboard validation completed',
      data: await this.cronService.validateLeaderboard(),
    };
  }

  @Get('monthly-maintenance')
  @ApiOperation({ summary: 'Manually trigger Monthly Maintenance routine' })
  @ApiResponse({
    status: 200,
    description: 'Monthly maintenance routine executed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized / Invalid Basic Auth credentials',
  })
  async triggerMonthlyMaintenance(): Promise<
    GlobalResponse<CronExecutionResultInterface>
  > {
    const details = await this.cronService.handleMonthlyMaintenance();
    return {
      message: 'Monthly maintenance routine triggered successfully',
      data: {
        executedAt: new Date().toISOString(),
        status: 'SUCCESS',
        details,
      },
    };
  }
}
