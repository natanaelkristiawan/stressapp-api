// LEAD

export interface LeaderboardInterface {
    data: LeaderboardItemInterface[];
    total: number;
    page: number;
    limit: number;
}


export interface LeaderboardItemInterface {
    id: number;
    name: string;
    point: number;
    is_owner: boolean;
}