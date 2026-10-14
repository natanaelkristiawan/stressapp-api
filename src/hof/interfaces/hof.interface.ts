export interface HofListItemInterface {
  id?: number;
  fullname: string;
  photo: string;
  point: number;
  position: number;
}

export interface HofWinnerPositionsInterface {
  [category: string]: number;
}
