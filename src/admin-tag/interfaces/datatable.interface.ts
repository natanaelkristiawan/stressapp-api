export interface Datatable {
    items: DataTag[];
    recordsTotal: number;
    recordsFiltered: number;
}
export interface DataTag {
    id: number;
    title: string;
    slug: string;
    postCount: number;
}

  