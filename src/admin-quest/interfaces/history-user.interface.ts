export interface HistoryUserItemInterface {
  id?: number;
  email: string;
  campaign: string;
  point: number;
  note: string;
  postId?: number | null;
  post: string;
  created_at: string;
}

export interface HistoryUserResponseInterface {
  items: HistoryUserItemInterface[];
  recordsTotal: number;
  recordsFiltered: number;
}
