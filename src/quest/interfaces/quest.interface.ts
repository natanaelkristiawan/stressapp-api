export interface QuestInterface {
   total: number;
   list: QuestList[];
}



export interface QuestList {
    id: number;
    title: string;
    description: string;
    image: string;
    dateStart: string;
    dateEnd: string;
}


export interface QuestDetailInterface {
    id: number;
    title: string;
    description: string;
    image: string;
    dateStart: string;
    dateEnd: string;
    created:QuestMemberInterface
}

export interface QuestMemberInterface {
    name: string
    id: number
    email: string
    profilePictureUrl:string
    is_dealer?:boolean 
}