export interface Datatable<T = DataUser> {
    items: T[];
    recordsTotal: number;
    recordsFiltered: number;
}
export interface DataUser {
    id: number;
    name: string;
    username: string;
    mmid_fullname?: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
    siteRole: string;
    vehicleList: string[];
    dob: Date;
    gender: string;
    mimatePoint: number;
    posts: number;
    comments: number;
    likes: number;
    shares: number;
    status: string;
    quizWinner: number;
}