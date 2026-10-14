export interface PointUserItemInterface {
  id?: number;
  email: string;
  name: string;
  totalPoints: number;
}

export interface PointUserResponseInterface {
  items: PointUserItemInterface[];
  recordsTotal: number;
  recordsFiltered: number;
}
