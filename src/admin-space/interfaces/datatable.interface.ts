export interface Datatable {
    items: DataSpace[];
    recordsTotal: number;
    recordsFiltered: number;
}
export interface DataSpace {
    id: number;
    version?: string;
    name: string;
    membersCount: number;
    postsCount: number;
    created_at: Date;
    image: string;
    banner: string;
}

  