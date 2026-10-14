export interface WinnerListItemInterface {
  id?: number;
  fullname: string;
  photo: string;
  point: number;
  position: number;
}

export interface WinnerCategoryCheckInterface {
  'paling-eksis': number;
  'paling-exist'?: number;
  'pendatang-terbaik': number;
  'tampil-kembali': number;
  'komen-terbaik': number;
  'cerita-terbaik': number;
  [key: string]: number | undefined;
}

