export interface QuestConfigItemInterface {
  id: number;
  title: string;
  description?: string;
  image?: string;
  point: number;
  condition: "single" | "multiple";
  action?: string;
  interval: "daily" | "weekly" | "once";
  dateStart?: Date | string;
  dateEnd?: Date | string;
  status: number;
  isMain?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QuestConfigListResponseInterface {
  items: QuestConfigItemInterface[];
  recordsTotal: number;
  recordsFiltered: number;
}
