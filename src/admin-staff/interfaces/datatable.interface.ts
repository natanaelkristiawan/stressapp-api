export interface Datatable {
    items: DataUser[];
    recordsTotal: number;
    recordsFiltered: number;
}
export interface DataUser {
    id: number;
    memberId: number;
    name: string;
    email: string;
    siteRole: string;
    is_dealer: boolean;
    createdAt: Date;
    updatedAt: Date;
}