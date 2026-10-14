export interface SettingData {
  id: number;
  key: string;
  value: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatatableSetting {
  items: SettingData[];
  recordsTotal: number;
  recordsFiltered: number;
}
