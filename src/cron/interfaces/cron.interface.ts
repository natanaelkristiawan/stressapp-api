export interface HofGenerationResultInterface {
  mostExistSuccess: boolean;
  newcomerSuccess: boolean;
  tampilKembaliSuccess: boolean;
}

export interface MonthlyMaintenanceResultInterface {
  syncResult: any;
  resetSuccess: boolean;
  targetPeriod: string;
}

export interface CronExecutionResultInterface {
  executedAt: string;
  status: string;
  details: HofGenerationResultInterface | MonthlyMaintenanceResultInterface;
}
