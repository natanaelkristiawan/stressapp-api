export interface LogResetItemInterface {
  id?: number;
  month: number | string;
  year: number;
  pointReset: number;
  resetAt: string;
}

export interface LogResetResponseInterface {
  items: LogResetItemInterface[];
  recordsTotal: number;
  recordsFiltered: number;
}
