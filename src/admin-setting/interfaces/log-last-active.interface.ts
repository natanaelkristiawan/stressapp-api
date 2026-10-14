export interface SyncLogLastActiveResponseInterface {
  totalProcessed: number;
  totalWithActivity: number;
  totalWithoutActivity: number;
  executionTimeMs: number;
  message: string;
}
